const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const { pool, query } = require('../infrastructure/database/db');
const PostgresRepository = require('../infrastructure/database/PostgresRepository');
const logger = require('../infrastructure/logger');
const { emitAnalyticsUpdate } = require('../api/routes/analytics/sse');

const ticketRepo = new PostgresRepository('tickets');
const messageRepo = new PostgresRepository('ticket_messages');
const contactRepo = new PostgresRepository('crm_contacts');
const workflowEngine = require('./workflowEngine');

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Initialize Transporter (Configure this via ENV vars or System Settings)
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
            port: process.env.SMTP_PORT || 2525,
            auth: {
                user: process.env.SMTP_USER || 'user',
                pass: process.env.SMTP_PASS || 'pass'
            }
        });
    }

    // New: Send Email using Template Stage
    async sendTemplate(to, stage, context) {
        try {
            // 1. Fetch Template
            const res = await pool.query("SELECT * FROM email_templates WHERE stage_name = $1 AND is_active = true", [stage]);
            if (res.rows.length === 0) {
                console.warn(`[EmailService] No active template found for stage: ${stage}`);
                return;
            }
            const template = res.rows[0];

            // 2. Interpolate Variables
            let subject = template.subject_template;
            let html = template.body_html;
            let text = template.body_text;

            // Simple mustache-style replacement {{key}}
            for (const [key, value] of Object.entries(context)) {
                const regex = new RegExp(`{{${key}}}`, 'g');
                subject = subject.replace(regex, value || '');
                html = html.replace(regex, value || '');
                text = text.replace(regex, value || '');
            }

            // 3. Send
            await this.sendEmail(to, subject, html, text);
            console.log(`[EmailService] Sent '${stage}' notification to ${to}`);
        } catch (err) {
            console.error(`[EmailService] Failed to send template '${stage}':`, err.message);
        }
    }

    async sendEmail(to, subject, html, text, options = {}) {
        const { tenantId, distributionId, recipientName, attachments = [] } = options;

        try {
            const mailOptions = {
                from: process.env.SMTP_FROM || '"RayiX Support" <support@rayix.com>',
                to,
                subject,
                text,
                html
            };

            // Add attachments if provided
            if (attachments && attachments.length > 0) {
                mailOptions.attachments = attachments;
            }

            const info = await this.transporter.sendMail(mailOptions);
            const messageId = info.messageId;

            logger.info('[EmailService] Email sent successfully', {
                to,
                messageId,
                subject
            });

            // Track message in database if tenantId provided
            if (tenantId) {
                await this.trackMessage({
                    tenantId,
                    distributionId,
                    recipientEmail: to,
                    recipientName,
                    messageId,
                    status: 'sent',
                    sentAt: new Date()
                });

                // Emit real-time analytics event
                emitAnalyticsUpdate(tenantId, 'message_sent', {
                    channel: 'email',
                    distributionId,
                    recipientEmail: to,
                    messageId,
                    status: 'sent'
                });
            }

            return {
                success: true,
                messageId,
                email: to
            };

        } catch (error) {
            logger.error('[EmailService] Failed to send email', {
                to,
                error: error.message
            });

            // Track failed message
            if (tenantId) {
                await this.trackMessage({
                    tenantId,
                    distributionId,
                    recipientEmail: to,
                    recipientName,
                    status: 'failed',
                    errorCode: error.code || 'SEND_FAILED',
                    errorMessage: error.message,
                    failedAt: new Date()
                });
            }

            throw error;
        }
    }
    async processAllChannels() {
        try {
            const channels = await pool.query("SELECT * FROM email_channels WHERE is_active = true");
            for (const channel of channels.rows) {
                console.log(`[EmailService] Processing channel: ${channel.email}`);
                await this.processChannel(channel);
            }
        } catch (err) {
            console.error("[EmailService] Error processing channels:", err);
        }
    }

    async processChannel(channel) {
        const config = {
            imap: {
                user: channel.username,
                password: channel.password,
                host: channel.host,
                port: channel.port,
                tls: channel.is_secure,
                authTimeout: 5000,
                // tlsOptions: { rejectUnauthorized: false } // keeping it strict by default
            }
        };

        let connection;
        try {
            connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            // Fetch ALL Unseen emails. Fetching FULL body for parser.
            const results = await connection.search(['UNSEEN'], {
                bodies: [''],
                markSeen: false
            });

            if (results.length > 0) {
                console.log(`[EmailService] ${channel.email}: Found ${results.length} unread.`);
            }

            for (const item of results) {
                const bodyPart = item.parts.find(part => part.which === '');
                const raw = bodyPart.body;

                const parsed = await simpleParser(raw);
                await this.handleEmail(channel, parsed);

                // Mark as seen only after successful handling
                await connection.addFlags(item.attributes.uid, 'SEEN');
            }

            // Update Last Sync
            await pool.query("UPDATE email_channels SET last_sync_at = NOW() WHERE id = $1", [channel.id]);

        } catch (e) {
            console.error(`[EmailService] Connection Error (${channel.email}):`, e.message);
        } finally {
            if (connection) {
                try { connection.end(); } catch (e) { }
            }
        }
    }

    async handleEmail(channel, parsed) {
        const subject = parsed.subject || '(No Subject)';
        const fromEmail = parsed.from?.value[0]?.address;
        const fromName = parsed.from?.value[0]?.name || fromEmail;
        // Text is safer, fall back to html
        const body = parsed.text || parsed.html || '(No Content)';

        console.log(`[EmailService] Handling: "${subject}" from ${fromEmail}`);

        // 1. Check for Ticket Reference [TCK-XXXX]
        const ticketMatch = subject.match(/TCK-\d+/);
        let ticketId = null;

        if (ticketMatch) {
            const ticketCode = ticketMatch[0];
            const tRes = await pool.query("SELECT id FROM tickets WHERE ticket_code = $1 AND tenant_id = $2", [ticketCode, channel.tenant_id]);
            if (tRes.rows.length > 0) {
                ticketId = tRes.rows[0].id;
            }
        }

        if (ticketId) {
            // Add Reply
            await messageRepo.create({
                ticket_id: ticketId,
                user_id: null,
                type: 'public',
                body: `From: ${fromName}\n\n${body}`, // Simple text body
                created_at: new Date()
            });
            console.log(`[EmailService] Attached reply to ${ticketMatch[0]}`);

            // Re-open if needed
            await pool.query("UPDATE tickets SET status = 'open', updated_at = NOW() WHERE id = $1 AND status = 'closed'", [ticketId]);
        } else {
            // Create New Ticket

            // Find/Create Contact
            let contactId = null;
            const cRes = await pool.query("SELECT id FROM crm_contacts WHERE email = $1 AND tenant_id = $2", [fromEmail, channel.tenant_id]);
            if (cRes.rows.length > 0) {
                contactId = cRes.rows[0].id;
            } else {
                const newContact = await contactRepo.create({
                    tenant_id: channel.tenant_id,
                    name: fromName,
                    email: fromEmail,
                    created_at: new Date()
                });
                contactId = newContact.id;
            }

            // Generate Code
            const code = 'TCK-' + Math.floor(100000 + Math.random() * 900000);

            // SLA
            const priority = 'medium';
            let slaRes = await pool.query("SELECT * FROM sla_policies WHERE tenant_id = $1 AND priority = $2", [channel.tenant_id, priority]);
            let resArgs = [1440, 2880];
            if (slaRes.rows.length > 0) resArgs = [slaRes.rows[0].response_time_minutes, slaRes.rows[0].resolution_time_minutes];

            const now = new Date();
            const firstDue = new Date(now.getTime() + resArgs[0] * 60000);
            const resDue = new Date(now.getTime() + resArgs[1] * 60000);

            const newTicket = await ticketRepo.create({
                tenant_id: channel.tenant_id,
                ticket_code: code,
                subject: subject,
                description: body,
                priority: priority,
                status: 'new',
                channel: 'email',
                contact_id: contactId,
                created_at: now,
                updated_at: now,
                first_response_due_at: firstDue,
                resolution_due_at: resDue
            });
            console.log(`[EmailService] Created Ticket ${code}`);

            // Audit stringify safe
            await pool.query(`INSERT INTO audit_logs (entity_type, entity_id, action, details, actor_id) VALUES ('ticket', $1, 'create', '{"channel":"email"}', NULL)`, [newTicket.id]);

            // Trigger Workflows
            workflowEngine.evaluate('ticket', newTicket, 'ticket_created')
                .catch(e => console.error("Workflow Email Error:", e));

            // --- NOTIFICATION: Creation (Auto-Reply) ---
            await this.sendTemplate(fromEmail, 'creation', {
                customer_name: fromName,
                ticket_code: code,
                subject: subject
            });
            // -------------------------------------------
        }
    }

    /**
     * Track email message in database
     */
    async trackMessage(data) {
        try {
            const {
                tenantId,
                distributionId,
                recipientEmail,
                recipientName,
                messageId,
                status,
                errorCode,
                errorMessage,
                sentAt,
                failedAt
            } = data;

            await query(
                `INSERT INTO email_messages
                (tenant_id, distribution_id, recipient_email, recipient_name, message_id, status, error_code, error_message, sent_at, failed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [tenantId, distributionId || null, recipientEmail, recipientName || null, messageId || null, status, errorCode || null, errorMessage || null, sentAt || null, failedAt || null]
            );
        } catch (error) {
            logger.error('[EmailService] Failed to track message', { error: error.message });
        }
    }

    /**
     * Process email provider webhook status update
     * Supports SendGrid, Mailgun, AWS SES webhook formats
     * @param {object} webhookData - Webhook payload from email provider
     * @param {string} provider - Email provider name ('sendgrid', 'mailgun', 'ses')
     */
    async processStatusUpdate(webhookData, provider = 'sendgrid') {
        try {
            let messageId, event, timestamp, errorCode, errorMessage;

            // Parse webhook data based on provider
            if (provider === 'sendgrid') {
                messageId = webhookData.smtp_id || webhookData.sg_message_id;
                event = webhookData.event; // 'delivered', 'bounce', 'open', 'click', etc.
                timestamp = webhookData.timestamp ? new Date(webhookData.timestamp * 1000) : new Date();
                errorCode = webhookData.reason;
                errorMessage = webhookData.reason;
            } else if (provider === 'mailgun') {
                messageId = webhookData['message-headers']?.find(h => h[0] === 'Message-Id')?.[1];
                event = webhookData.event; // 'delivered', 'failed', 'opened', 'clicked'
                timestamp = webhookData.timestamp ? new Date(webhookData.timestamp * 1000) : new Date();
                errorCode = webhookData['delivery-status']?.code;
                errorMessage = webhookData['delivery-status']?.message;
            } else if (provider === 'ses') {
                messageId = webhookData.mail?.messageId;
                event = webhookData.eventType?.toLowerCase(); // 'Delivery', 'Bounce', 'Open', 'Click'
                timestamp = webhookData.mail?.timestamp ? new Date(webhookData.mail.timestamp) : new Date();
                errorCode = webhookData.bounce?.bounceType;
                errorMessage = webhookData.bounce?.bouncedRecipients?.[0]?.diagnosticCode;
            }

            if (!messageId) {
                logger.warn('[EmailService] Webhook missing message ID', { provider });
                return;
            }

            const status = this.mapEmailStatus(event);

            // Build update query based on status
            let updateQuery = 'UPDATE email_messages SET status = $1, updated_at = $2';
            const params = [status, timestamp];
            let paramIndex = 3;

            if (status === 'delivered') {
                updateQuery += `, delivered_at = $${paramIndex}`;
                params.push(timestamp);
                paramIndex++;
            } else if (status === 'opened') {
                updateQuery += `, opened_at = $${paramIndex}`;
                params.push(timestamp);
                paramIndex++;
            } else if (status === 'clicked') {
                updateQuery += `, clicked_at = $${paramIndex}`;
                params.push(timestamp);
                paramIndex++;
            } else if (status === 'bounced') {
                updateQuery += `, bounced_at = $${paramIndex}, error_code = $${paramIndex + 1}, error_message = $${paramIndex + 2}`;
                params.push(timestamp, errorCode || null, errorMessage || null);
                paramIndex += 3;
            } else if (status === 'failed') {
                updateQuery += `, failed_at = $${paramIndex}, error_code = $${paramIndex + 1}, error_message = $${paramIndex + 2}`;
                params.push(timestamp, errorCode || null, errorMessage || null);
                paramIndex += 3;
            }

            updateQuery += ` WHERE message_id = $${paramIndex}`;
            params.push(messageId);

            const result = await query(updateQuery, params);

            if (result.rowCount > 0) {
                logger.info('[EmailService] Status updated', {
                    messageId,
                    status,
                    provider
                });

                // Get tenant ID and distribution ID for the message to emit event
                const msgResult = await query(
                    'SELECT tenant_id, distribution_id FROM email_messages WHERE message_id = $1',
                    [messageId]
                );

                if (msgResult.rows.length > 0) {
                    const { tenant_id, distribution_id } = msgResult.rows[0];
                    emitAnalyticsUpdate(tenant_id, 'message_status_updated', {
                        channel: 'email',
                        distributionId: distribution_id,
                        messageId,
                        status,
                        provider
                    });
                }
            } else {
                logger.warn('[EmailService] Message not found for status update', { messageId, provider });
            }

        } catch (error) {
            logger.error('[EmailService] Failed to process status update', { error: error.message });
        }
    }

    /**
     * Map email provider event to internal status
     * @param {string} event - Email provider event name
     * @returns {string} Internal status
     */
    mapEmailStatus(event) {
        const statusMap = {
            'delivered': 'delivered',
            'delivery': 'delivered',
            'bounce': 'bounced',
            'bounced': 'bounced',
            'failed': 'failed',
            'dropped': 'failed',
            'open': 'opened',
            'opened': 'opened',
            'click': 'clicked',
            'clicked': 'clicked',
            'sent': 'sent'
        };
        return statusMap[event?.toLowerCase()] || 'pending';
    }
}

module.exports = new EmailService();
