const axios = require('axios');
const { query } = require('../infrastructure/database/db');
const { decrypt } = require('../infrastructure/security/encryption');
const logger = require('../infrastructure/logger');
const { emitAnalyticsUpdate } = require('../api/routes/analytics/sse');

/**
 * WhatsApp Service using Twilio API
 * Handles sending WhatsApp messages and tracking delivery status
 */
class WhatsAppService {
    constructor() {
        this.integration = null;
        this.accountSid = null;
        this.authToken = null;
        this.fromNumber = null;
    }

    /**
     * Load Twilio WhatsApp integration credentials from database
     * @param {number} tenantId - Tenant ID for multi-tenant isolation
     */
    async loadIntegration(tenantId) {
        try {
            const res = await query(
                "SELECT * FROM integrations WHERE tenant_id = $1 AND provider LIKE '%Twilio%WhatsApp%' AND is_active = true LIMIT 1",
                [tenantId]
            );

            if (res.rows.length === 0) {
                logger.warn('[WhatsAppService] Twilio WhatsApp integration not found or inactive', { tenantId });
                return false;
            }

            this.integration = res.rows[0];

            // Decrypt credentials (stored with AES-256-GCM encryption)
            this.accountSid = decrypt(this.integration.api_key);
            this.authToken = decrypt(this.integration.config?.auth_token);
            this.fromNumber = this.integration.config?.from || process.env.TWILIO_WHATSAPP_FROM;

            if (!this.accountSid || !this.authToken || !this.fromNumber) {
                logger.error('[WhatsAppService] Missing required Twilio credentials', { tenantId });
                return false;
            }

            logger.info('[WhatsAppService] Integration loaded successfully', { tenantId });
            return true;
        } catch (error) {
            logger.error('[WhatsAppService] Failed to load integration', { error: error.message, tenantId });
            return false;
        }
    }

    /**
     * Format phone number to E.164 format with WhatsApp prefix
     * @param {string} phone - Input phone number
     * @returns {string} Formatted phone number (e.g., whatsapp:+966501234567)
     */
    formatPhoneNumber(phone) {
        if (!phone) return null;

        // Remove all non-digit characters except +
        let cleaned = phone.replace(/[^\d+]/g, '');

        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            // Default to Saudi Arabia if no country code (for backward compatibility)
            cleaned = '+966' + cleaned.replace(/^0+/, '');
        }

        // Add WhatsApp prefix
        return `whatsapp:${cleaned}`;
    }

    /**
     * Validate E.164 phone number format
     * @param {string} phone - Phone number to validate
     * @returns {boolean} True if valid E.164 format
     */
    validatePhoneNumber(phone) {
        // E.164 format: +[country code][number]
        // Minimum: +1XXX (country code + 3 digits) = 5 chars
        // Maximum: +XXXXXXXXXXXXX (15 digits total) = 16 chars
        // First digit after + must be 1-9 (no leading zero in country code)
        const e164Regex = /^\+[1-9]\d{3,14}$/;
        const cleaned = phone.replace('whatsapp:', '');
        return e164Regex.test(cleaned);
    }

    /**
     * Send WhatsApp message via Twilio API
     * @param {string} to - Recipient phone number
     * @param {string} body - Message content
     * @param {object} options - Additional options (tenantId, distributionId, recipientName)
     * @returns {object} Result object with success status and message details
     */
    async sendMessage(to, body, options = {}) {
        const { tenantId, distributionId, recipientName } = options;

        try {
            // Load integration if not already loaded
            if (!this.accountSid && tenantId) {
                const loaded = await this.loadIntegration(tenantId);
                if (!loaded) {
                    return {
                        success: false,
                        error: 'WhatsApp integration not configured',
                        phone: to
                    };
                }
            }

            // Format and validate phone number
            const formattedPhone = this.formatPhoneNumber(to);
            if (!this.validatePhoneNumber(formattedPhone)) {
                logger.warn('[WhatsAppService] Invalid phone number format', { phone: to });

                // Track failed message
                if (tenantId) {
                    await this.trackMessage({
                        tenantId,
                        distributionId,
                        recipientPhone: to,
                        recipientName,
                        status: 'failed',
                        errorCode: '63007',
                        errorMessage: 'Invalid phone number format'
                    });
                }

                return {
                    success: false,
                    error: 'Invalid phone number format. Use international format with + prefix.',
                    phone: to
                };
            }

            // Prepare Twilio API request
            const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
            const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

            const params = new URLSearchParams();
            params.append('From', this.fromNumber);
            params.append('To', formattedPhone);
            params.append('Body', body);

            // Make API request
            const response = await axios.post(url, params, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const messageSid = response.data.sid;
            const status = this.mapTwilioStatus(response.data.status);

            logger.info('[WhatsAppService] Message sent successfully', {
                phone: formattedPhone,
                messageSid,
                status
            });

            // Track message in database
            if (tenantId) {
                await this.trackMessage({
                    tenantId,
                    distributionId,
                    recipientPhone: to,
                    recipientName,
                    messageSid,
                    status,
                    sentAt: new Date()
                });

                // Update session tracking
                await this.updateSession(tenantId, to);

                // Emit real-time analytics event
                emitAnalyticsUpdate(tenantId, 'message_sent', {
                    channel: 'whatsapp',
                    distributionId,
                    recipientPhone: to,
                    messageSid,
                    status
                });
            }

            return {
                success: true,
                messageSid,
                status,
                phone: to
            };

        } catch (error) {
            const errorCode = error.response?.data?.code || 'unknown';
            const errorMessage = error.response?.data?.message || error.message;

            logger.error('[WhatsAppService] Failed to send message', {
                phone: to,
                error: errorMessage,
                errorCode
            });

            // Track failed message
            if (tenantId) {
                await this.trackMessage({
                    tenantId,
                    distributionId,
                    recipientPhone: to,
                    recipientName,
                    status: 'failed',
                    errorCode,
                    errorMessage,
                    failedAt: new Date()
                });
            }

            return {
                success: false,
                error: errorMessage,
                errorCode,
                phone: to
            };
        }
    }

    /**
     * Track WhatsApp message in database
     */
    async trackMessage(data) {
        try {
            const {
                tenantId,
                distributionId,
                recipientPhone,
                recipientName,
                messageSid,
                status,
                errorCode,
                errorMessage,
                sentAt,
                failedAt
            } = data;

            await query(
                `INSERT INTO whatsapp_messages
                (tenant_id, distribution_id, recipient_phone, recipient_name, message_sid, status, error_code, error_message, sent_at, failed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [tenantId, distributionId || null, recipientPhone, recipientName || null, messageSid || null, status, errorCode || null, errorMessage || null, sentAt || null, failedAt || null]
            );
        } catch (error) {
            logger.error('[WhatsAppService] Failed to track message', { error: error.message });
        }
    }

    /**
     * Update WhatsApp session tracking (for 24-hour window)
     */
    async updateSession(tenantId, phone) {
        try {
            const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

            await query(
                `INSERT INTO whatsapp_sessions (tenant_id, phone, last_outbound_at, session_expires_at)
                VALUES ($1, $2, NOW(), $3)
                ON CONFLICT (tenant_id, phone)
                DO UPDATE SET last_outbound_at = NOW(), session_expires_at = $3, updated_at = NOW()`,
                [tenantId, phone, sessionExpiresAt]
            );
        } catch (error) {
            logger.error('[WhatsAppService] Failed to update session', { error: error.message });
        }
    }

    /**
     * Process Twilio webhook status update
     * @param {object} webhookData - Webhook payload from Twilio
     */
    async processStatusUpdate(webhookData) {
        try {
            const {
                MessageSid,
                MessageStatus,
                ErrorCode,
                ErrorMessage,
                From,
                To
            } = webhookData;

            if (!MessageSid) {
                logger.warn('[WhatsAppService] Webhook missing MessageSid');
                return;
            }

            const status = this.mapTwilioStatus(MessageStatus);
            const timestamp = new Date();

            // Build update query based on status
            let updateQuery = 'UPDATE whatsapp_messages SET status = $1, updated_at = $2';
            const params = [status, timestamp];
            let paramIndex = 3;

            if (status === 'sent') {
                updateQuery += `, sent_at = $${paramIndex}`;
                params.push(timestamp);
                paramIndex++;
            } else if (status === 'delivered') {
                updateQuery += `, delivered_at = $${paramIndex}`;
                params.push(timestamp);
                paramIndex++;
            } else if (status === 'read') {
                updateQuery += `, read_at = $${paramIndex}`;
                params.push(timestamp);
                paramIndex++;
            } else if (status === 'failed') {
                updateQuery += `, failed_at = $${paramIndex}, error_code = $${paramIndex + 1}, error_message = $${paramIndex + 2}`;
                params.push(timestamp, ErrorCode || null, ErrorMessage || null);
                paramIndex += 3;
            }

            updateQuery += ` WHERE message_sid = $${paramIndex}`;
            params.push(MessageSid);

            const result = await query(updateQuery, params);

            if (result.rowCount > 0) {
                logger.info('[WhatsAppService] Status updated', {
                    messageSid: MessageSid,
                    status,
                    from: From,
                    to: To
                });

                // Get tenant ID and distribution ID for the message to emit event
                const msgResult = await query(
                    'SELECT tenant_id, distribution_id FROM whatsapp_messages WHERE message_sid = $1',
                    [MessageSid]
                );

                if (msgResult.rows.length > 0) {
                    const { tenant_id, distribution_id } = msgResult.rows[0];
                    emitAnalyticsUpdate(tenant_id, 'message_status_updated', {
                        channel: 'whatsapp',
                        distributionId: distribution_id,
                        messageSid: MessageSid,
                        status,
                        from: From,
                        to: To
                    });
                }
            } else {
                logger.warn('[WhatsAppService] Message not found for status update', { messageSid: MessageSid });
            }

        } catch (error) {
            logger.error('[WhatsAppService] Failed to process status update', { error: error.message });
        }
    }

    /**
     * Send WhatsApp message with media via Twilio API
     * @param {string} to - Recipient phone number
     * @param {string} body - Message content
     * @param {array} mediaUrls - Array of media URL objects [{type, url, filename}]
     * @param {object} options - Additional options (tenantId, distributionId, recipientName)
     * @returns {object} Result object with success status and message details
     */
    async sendMediaMessage(to, body, mediaUrls = [], options = {}) {
        const { tenantId, distributionId, recipientName } = options;

        try {
            // Load integration if not already loaded
            if (!this.accountSid && tenantId) {
                const loaded = await this.loadIntegration(tenantId);
                if (!loaded) {
                    return {
                        success: false,
                        error: 'WhatsApp integration not configured',
                        phone: to
                    };
                }
            }

            // Format and validate phone number
            const formattedPhone = this.formatPhoneNumber(to);
            if (!this.validatePhoneNumber(formattedPhone)) {
                logger.warn('[WhatsAppService] Invalid phone number format', { phone: to });
                return {
                    success: false,
                    error: 'Invalid phone number format',
                    phone: to
                };
            }

            // Prepare Twilio API request with media
            const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
            const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

            const params = new URLSearchParams();
            params.append('From', this.fromNumber);
            params.append('To', formattedPhone);
            params.append('Body', body);

            // Add media URLs (Twilio supports multiple MediaUrl parameters)
            mediaUrls.forEach((media, index) => {
                if (media.url) {
                    params.append(`MediaUrl[${index}]`, media.url);
                }
            });

            // Make API request
            const response = await axios.post(url, params, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const messageSid = response.data.sid;
            const status = this.mapTwilioStatus(response.data.status);

            logger.info('[WhatsAppService] Media message sent successfully', {
                phone: formattedPhone,
                messageSid,
                status,
                mediaCount: mediaUrls.length
            });

            // Track message in database
            if (tenantId) {
                await this.trackMessage({
                    tenantId,
                    distributionId,
                    recipientPhone: to,
                    recipientName,
                    messageSid,
                    status,
                    sentAt: new Date()
                });

                // Update session tracking
                await this.updateSession(tenantId, to);

                // Emit real-time analytics event
                emitAnalyticsUpdate(tenantId, 'message_sent', {
                    channel: 'whatsapp',
                    distributionId,
                    recipientPhone: to,
                    messageSid,
                    status,
                    mediaCount: mediaUrls.length
                });
            }

            return {
                success: true,
                messageSid,
                status,
                phone: to,
                mediaCount: mediaUrls.length
            };

        } catch (error) {
            const errorCode = error.response?.data?.code || 'unknown';
            const errorMessage = error.response?.data?.message || error.message;

            logger.error('[WhatsAppService] Failed to send media message', {
                phone: to,
                error: errorMessage,
                errorCode
            });

            // Track failed message
            if (tenantId) {
                await this.trackMessage({
                    tenantId,
                    distributionId,
                    recipientPhone: to,
                    recipientName,
                    status: 'failed',
                    errorCode,
                    errorMessage,
                    failedAt: new Date()
                });
            }

            return {
                success: false,
                error: errorMessage,
                errorCode,
                phone: to
            };
        }
    }

    /**
     * Map Twilio status to internal status
     * @param {string} twilioStatus - Twilio message status
     * @returns {string} Internal status
     */
    mapTwilioStatus(twilioStatus) {
        const statusMap = {
            'queued': 'pending',
            'sending': 'pending',
            'sent': 'sent',
            'delivered': 'delivered',
            'read': 'read',
            'failed': 'failed',
            'undelivered': 'failed'
        };
        return statusMap[twilioStatus] || 'pending';
    }
}

// Export singleton instance
const whatsappService = new WhatsAppService();
module.exports = whatsappService;
