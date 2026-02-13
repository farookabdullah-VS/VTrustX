const axios = require('axios');
const { query } = require('../infrastructure/database/db');
const { decrypt } = require('../infrastructure/security/encryption');
const logger = require('../infrastructure/logger');
const { emitAnalyticsUpdate } = require('../api/routes/analytics/sse');

/**
 * SMS Service using Unifonic API
 * Handles sending SMS messages and tracking delivery status
 */
class SMSService {
    constructor() {
        this.integration = null;
        this.appSid = null;
        this.senderID = null;
    }

    /**
     * Load Unifonic integration credentials from database
     * @param {number} tenantId - Tenant ID for multi-tenant isolation
     */
    async loadIntegration(tenantId) {
        try {
            const res = await query(
                "SELECT * FROM integrations WHERE tenant_id = $1 AND provider LIKE '%Unifonic%' AND is_active = true LIMIT 1",
                [tenantId]
            );

            if (res.rows.length === 0) {
                logger.warn('[SMSService] Unifonic integration not found or inactive', { tenantId });
                return false;
            }

            this.integration = res.rows[0];

            // Decrypt credentials (stored with AES-256-GCM encryption)
            this.appSid = decrypt(this.integration.api_key);
            this.senderID = this.integration.config?.sender_id;

            if (!this.appSid) {
                logger.error('[SMSService] Missing Unifonic AppSid', { tenantId });
                return false;
            }

            logger.info('[SMSService] Integration loaded successfully', { tenantId });
            return true;
        } catch (error) {
            logger.error('[SMSService] Failed to load integration', { error: error.message, tenantId });
            return false;
        }
    }

    /**
     * Format phone number for Unifonic (remove +, 00, spaces)
     * @param {string} phone - Input phone number
     * @returns {string} Formatted phone number (e.g., 9665xxxxxxxx)
     */
    formatPhoneNumber(phone) {
        if (!phone) return null;

        // Remove all non-digit characters
        let cleaned = phone.replace(/[^0-9]/g, '');

        // Remove leading 00 if present
        if (cleaned.startsWith('00')) {
            cleaned = cleaned.substring(2);
        }

        return cleaned;
    }

    /**
     * Validate phone number format
     * @param {string} phone - Phone number to validate
     * @returns {boolean} True if valid format
     */
    validatePhoneNumber(phone) {
        // Basic validation: must have at least 10 digits
        const cleaned = this.formatPhoneNumber(phone);
        return cleaned && cleaned.length >= 10 && cleaned.length <= 15;
    }

    /**
     * Send SMS message via Unifonic API
     * @param {string} to - Recipient phone number
     * @param {string} body - Message content
     * @param {object} options - Additional options (tenantId, distributionId, recipientName)
     * @returns {object} Result object with success status and message details
     */
    async sendMessage(to, body, options = {}) {
        const { tenantId, distributionId, recipientName } = options;

        try {
            // Load integration if not already loaded
            if (!this.appSid && tenantId) {
                const loaded = await this.loadIntegration(tenantId);
                if (!loaded) {
                    return {
                        success: false,
                        error: 'SMS integration not configured',
                        phone: to
                    };
                }
            }

            // Format and validate phone number
            const formattedPhone = this.formatPhoneNumber(to);
            if (!this.validatePhoneNumber(to)) {
                logger.warn('[SMSService] Invalid phone number format', { phone: to });

                // Track failed message
                if (tenantId) {
                    await this.trackMessage({
                        tenantId,
                        distributionId,
                        recipientPhone: to,
                        recipientName,
                        status: 'failed',
                        errorCode: 'INVALID_NUMBER',
                        errorMessage: 'Invalid phone number format'
                    });
                }

                return {
                    success: false,
                    error: 'Invalid phone number format',
                    phone: to
                };
            }

            // Prepare Unifonic API request
            const baseUrl = 'https://el.cloud.unifonic.com/rest/SMS/messages';
            const params = new URLSearchParams();
            params.append('AppSid', this.appSid);
            params.append('Recipient', formattedPhone);
            params.append('Body', body);
            if (this.senderID) {
                params.append('SenderID', this.senderID);
            }

            // Make API request
            const response = await axios.post(`${baseUrl}?AppSid=${this.appSid}`, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const messageSid = response.data.MessageID;
            const status = this.mapUnifonicStatus(response.data.status);

            logger.info('[SMSService] Message sent successfully', {
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

                // Emit real-time analytics event
                emitAnalyticsUpdate(tenantId, 'message_sent', {
                    channel: 'sms',
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
            const errorCode = error.response?.data?.errorCode || 'SEND_FAILED';
            const errorMessage = error.response?.data?.message || error.message;

            logger.error('[SMSService] Failed to send message', {
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
     * Track SMS message in database
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
                `INSERT INTO sms_messages
                (tenant_id, distribution_id, recipient_phone, recipient_name, message_sid, status, error_code, error_message, sent_at, failed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [tenantId, distributionId || null, recipientPhone, recipientName || null, messageSid || null, status, errorCode || null, errorMessage || null, sentAt || null, failedAt || null]
            );
        } catch (error) {
            logger.error('[SMSService] Failed to track message', { error: error.message });
        }
    }

    /**
     * Process Unifonic webhook status update
     * @param {object} webhookData - Webhook payload from Unifonic
     */
    async processStatusUpdate(webhookData) {
        try {
            const {
                MessageID,
                Status,
                ErrorCode,
                ErrorMessage,
                DoneDate
            } = webhookData;

            if (!MessageID) {
                logger.warn('[SMSService] Webhook missing MessageID');
                return;
            }

            const status = this.mapUnifonicStatus(Status);
            const timestamp = DoneDate ? new Date(DoneDate) : new Date();

            // Build update query based on status
            let updateQuery = 'UPDATE sms_messages SET status = $1, updated_at = $2';
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
            } else if (status === 'failed') {
                updateQuery += `, failed_at = $${paramIndex}, error_code = $${paramIndex + 1}, error_message = $${paramIndex + 2}`;
                params.push(timestamp, ErrorCode || null, ErrorMessage || null);
                paramIndex += 3;
            }

            updateQuery += ` WHERE message_sid = $${paramIndex}`;
            params.push(MessageID);

            const result = await query(updateQuery, params);

            if (result.rowCount > 0) {
                logger.info('[SMSService] Status updated', {
                    messageSid: MessageID,
                    status
                });

                // Get tenant ID and distribution ID for the message to emit event
                const msgResult = await query(
                    'SELECT tenant_id, distribution_id FROM sms_messages WHERE message_sid = $1',
                    [MessageID]
                );

                if (msgResult.rows.length > 0) {
                    const { tenant_id, distribution_id } = msgResult.rows[0];
                    emitAnalyticsUpdate(tenant_id, 'message_status_updated', {
                        channel: 'sms',
                        distributionId: distribution_id,
                        messageSid: MessageID,
                        status
                    });
                }
            } else {
                logger.warn('[SMSService] Message not found for status update', { messageSid: MessageID });
            }

        } catch (error) {
            logger.error('[SMSService] Failed to process status update', { error: error.message });
        }
    }

    /**
     * Map Unifonic status to internal status
     * @param {string} unifonicStatus - Unifonic message status
     * @returns {string} Internal status
     */
    mapUnifonicStatus(unifonicStatus) {
        const statusMap = {
            'Queued': 'pending',
            'Sent': 'sent',
            'Delivered': 'delivered',
            'Failed': 'failed',
            'Rejected': 'failed'
        };
        return statusMap[unifonicStatus] || 'pending';
    }

    /**
     * SMS Media Support Note:
     * Standard SMS does not support media (images, videos, files).
     * Media placeholders in templates are replaced with text URLs.
     * For media support, use WhatsApp or Email channels instead.
     *
     * MMS (Multimedia Messaging Service) support could be added in the future
     * via Twilio or other MMS-capable providers.
     */

    // Backward compatibility: Keep old function signature
    async sendSMS(to, body) {
        return this.sendMessage(to, body);
    }
}

// Export singleton instance
const smsService = new SMSService();
module.exports = smsService;
