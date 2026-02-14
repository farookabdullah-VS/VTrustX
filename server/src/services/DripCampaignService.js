/**
 * Drip Campaign Service
 *
 * Manages automated multi-step distribution campaigns with scheduled follow-ups.
 *
 * Features:
 * - Create multi-step campaigns
 * - Enroll contacts in campaigns
 * - Schedule and execute campaign steps
 * - Track response status and auto-stop on response
 * - Support for delays (minutes, hours, days, weeks)
 * - Conditional step execution
 * - Campaign performance analytics
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const emailService = require('./emailService');
const smsService = require('./smsService');
const whatsappService = require('./whatsappService');
const TelegramService = require('./TelegramService');

class DripCampaignService {
    /**
     * Create a new drip campaign
     * @param {number} tenantId - Tenant ID
     * @param {object} campaignData - Campaign configuration
     * @returns {Promise<object>} - Created campaign
     */
    static async createCampaign(tenantId, campaignData) {
        try {
            const {
                formId,
                name,
                description,
                triggerType,
                triggerConfig,
                channel,
                stopOnResponse,
                maxReminders,
                timezone,
                steps
            } = campaignData;

            // Create campaign
            const campaignResult = await query(
                `INSERT INTO drip_campaigns
                (tenant_id, form_id, name, description, trigger_type, trigger_config, channel,
                 stop_on_response, max_reminders, timezone, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
                RETURNING *`,
                [
                    tenantId,
                    formId,
                    name,
                    description || null,
                    triggerType,
                    JSON.stringify(triggerConfig || {}),
                    channel,
                    stopOnResponse !== false,
                    maxReminders || 3,
                    timezone || 'UTC'
                ]
            );

            const campaign = campaignResult.rows[0];

            // Create campaign steps
            if (steps && steps.length > 0) {
                for (let i = 0; i < steps.length; i++) {
                    await this.createStep(campaign.id, { ...steps[i], step_number: i + 1 });
                }
            }

            logger.info('[DripCampaignService] Campaign created', {
                campaignId: campaign.id,
                tenantId,
                name
            });

            return campaign;
        } catch (error) {
            logger.error('[DripCampaignService] Failed to create campaign', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create a campaign step
     * @param {number} campaignId - Campaign ID
     * @param {object} stepData - Step configuration
     * @returns {Promise<object>} - Created step
     */
    static async createStep(campaignId, stepData) {
        try {
            const {
                step_number,
                step_type,
                subject,
                body,
                delay_value,
                delay_unit,
                conditions,
                media_assets
            } = stepData;

            const result = await query(
                `INSERT INTO drip_campaign_steps
                (campaign_id, step_number, step_type, subject, body, delay_value, delay_unit,
                 conditions, media_assets)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    campaignId,
                    step_number,
                    step_type || 'reminder',
                    subject || null,
                    body,
                    delay_value || 0,
                    delay_unit || 'days',
                    JSON.stringify(conditions || {}),
                    JSON.stringify(media_assets || [])
                ]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[DripCampaignService] Failed to create step', {
                error: error.message,
                campaignId
            });
            throw error;
        }
    }

    /**
     * Start a campaign (activate it)
     * @param {number} campaignId - Campaign ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Updated campaign
     */
    static async startCampaign(campaignId, tenantId) {
        try {
            const result = await query(
                `UPDATE drip_campaigns
                SET status = 'active', started_at = NOW(), updated_at = NOW()
                WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
                RETURNING *`,
                [campaignId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Campaign not found or already started');
            }

            logger.info('[DripCampaignService] Campaign started', { campaignId, tenantId });

            return result.rows[0];
        } catch (error) {
            logger.error('[DripCampaignService] Failed to start campaign', {
                error: error.message,
                campaignId
            });
            throw error;
        }
    }

    /**
     * Pause a campaign
     * @param {number} campaignId - Campaign ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Updated campaign
     */
    static async pauseCampaign(campaignId, tenantId) {
        try {
            const result = await query(
                `UPDATE drip_campaigns
                SET status = 'paused', updated_at = NOW()
                WHERE id = $1 AND tenant_id = $2 AND status = 'active'
                RETURNING *`,
                [campaignId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Campaign not found or not active');
            }

            logger.info('[DripCampaignService] Campaign paused', { campaignId, tenantId });

            return result.rows[0];
        } catch (error) {
            logger.error('[DripCampaignService] Failed to pause campaign', {
                error: error.message,
                campaignId
            });
            throw error;
        }
    }

    /**
     * Resume a paused campaign
     * @param {number} campaignId - Campaign ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Updated campaign
     */
    static async resumeCampaign(campaignId, tenantId) {
        try {
            const result = await query(
                `UPDATE drip_campaigns
                SET status = 'active', updated_at = NOW()
                WHERE id = $1 AND tenant_id = $2 AND status = 'paused'
                RETURNING *`,
                [campaignId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Campaign not found or not paused');
            }

            logger.info('[DripCampaignService] Campaign resumed', { campaignId, tenantId });

            return result.rows[0];
        } catch (error) {
            logger.error('[DripCampaignService] Failed to resume campaign', {
                error: error.message,
                campaignId
            });
            throw error;
        }
    }

    /**
     * Enroll contacts in a campaign
     * @param {number} campaignId - Campaign ID
     * @param {Array<object>} contacts - Array of contact objects
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Enrollment results
     */
    static async enrollContacts(campaignId, contacts, tenantId) {
        try {
            // Verify campaign exists and is active
            const campaignResult = await query(
                'SELECT * FROM drip_campaigns WHERE id = $1 AND tenant_id = $2',
                [campaignId, tenantId]
            );

            if (campaignResult.rows.length === 0) {
                throw new Error('Campaign not found');
            }

            const campaign = campaignResult.rows[0];

            if (campaign.status !== 'active') {
                throw new Error('Campaign must be active to enroll contacts');
            }

            // Get first step
            const stepsResult = await query(
                'SELECT * FROM drip_campaign_steps WHERE campaign_id = $1 ORDER BY step_number ASC',
                [campaignId]
            );

            if (stepsResult.rows.length === 0) {
                throw new Error('Campaign has no steps configured');
            }

            const firstStep = stepsResult.rows[0];
            let enrolled = 0;
            let skipped = 0;

            for (const contact of contacts) {
                try {
                    // Check if already enrolled
                    const existingResult = await query(
                        `SELECT id FROM drip_campaign_enrollments
                        WHERE campaign_id = $1 AND (recipient_email = $2 OR recipient_phone = $3)
                        AND status IN ('enrolled', 'active')`,
                        [campaignId, contact.email || null, contact.phone || null]
                    );

                    if (existingResult.rows.length > 0) {
                        skipped++;
                        continue;
                    }

                    // Calculate next step time (immediate for first step)
                    const nextStepAt = this.calculateNextStepTime(firstStep, campaign.timezone);

                    // Create enrollment
                    await query(
                        `INSERT INTO drip_campaign_enrollments
                        (campaign_id, recipient_email, recipient_phone, recipient_name,
                         recipient_data, current_step, next_step_at, status)
                        VALUES ($1, $2, $3, $4, $5, 0, $6, 'active')`,
                        [
                            campaignId,
                            contact.email || null,
                            contact.phone || null,
                            contact.name || null,
                            JSON.stringify(contact),
                            nextStepAt
                        ]
                    );

                    enrolled++;
                } catch (error) {
                    logger.error('[DripCampaignService] Failed to enroll contact', {
                        error: error.message,
                        campaignId,
                        contact
                    });
                    skipped++;
                }
            }

            // Update campaign enrollment count
            await query(
                `UPDATE drip_campaigns
                SET enrollment_count = enrollment_count + $1, updated_at = NOW()
                WHERE id = $2`,
                [enrolled, campaignId]
            );

            logger.info('[DripCampaignService] Contacts enrolled', {
                campaignId,
                enrolled,
                skipped
            });

            return { enrolled, skipped, total: contacts.length };
        } catch (error) {
            logger.error('[DripCampaignService] Failed to enroll contacts', {
                error: error.message,
                campaignId
            });
            throw error;
        }
    }

    /**
     * Calculate next step execution time
     * @param {object} step - Step configuration
     * @param {string} timezone - Campaign timezone
     * @returns {Date} - Next execution time
     */
    static calculateNextStepTime(step, timezone = 'UTC') {
        const now = new Date();
        const delay = step.delay_value || 0;
        const unit = step.delay_unit || 'days';

        let milliseconds = 0;

        switch (unit) {
            case 'minutes':
                milliseconds = delay * 60 * 1000;
                break;
            case 'hours':
                milliseconds = delay * 60 * 60 * 1000;
                break;
            case 'days':
                milliseconds = delay * 24 * 60 * 60 * 1000;
                break;
            case 'weeks':
                milliseconds = delay * 7 * 24 * 60 * 60 * 1000;
                break;
            default:
                milliseconds = delay * 24 * 60 * 60 * 1000; // Default to days
        }

        return new Date(now.getTime() + milliseconds);
    }

    /**
     * Process pending campaign steps (called by cron job)
     * @returns {Promise<object>} - Processing results
     */
    static async processPendingSteps() {
        try {
            // Find enrollments ready for next step
            const enrollmentsResult = await query(
                `SELECT e.*, c.form_id, c.channel, c.tenant_id, c.stop_on_response, c.max_reminders
                FROM drip_campaign_enrollments e
                JOIN drip_campaigns c ON e.campaign_id = c.id
                WHERE e.status = 'active'
                  AND e.next_step_at <= NOW()
                  AND c.status = 'active'
                ORDER BY e.next_step_at ASC
                LIMIT 100`
            );

            const enrollments = enrollmentsResult.rows;
            logger.info(`[DripCampaignService] Processing ${enrollments.length} pending steps`);

            let processed = 0;
            let failed = 0;

            for (const enrollment of enrollments) {
                try {
                    await this.executeNextStep(enrollment);
                    processed++;
                } catch (error) {
                    logger.error('[DripCampaignService] Failed to execute step', {
                        error: error.message,
                        enrollmentId: enrollment.id
                    });
                    failed++;
                }
            }

            return { processed, failed, total: enrollments.length };
        } catch (error) {
            logger.error('[DripCampaignService] Failed to process pending steps', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute the next step for an enrollment
     * @param {object} enrollment - Enrollment record
     * @returns {Promise<void>}
     */
    static async executeNextStep(enrollment) {
        try {
            const nextStepNumber = enrollment.current_step + 1;

            // Get next step
            const stepResult = await query(
                `SELECT * FROM drip_campaign_steps
                WHERE campaign_id = $1 AND step_number = $2`,
                [enrollment.campaign_id, nextStepNumber]
            );

            if (stepResult.rows.length === 0) {
                // No more steps, mark as completed
                await query(
                    `UPDATE drip_campaign_enrollments
                    SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                    WHERE id = $1`,
                    [enrollment.id]
                );

                // Update campaign completed count
                await query(
                    `UPDATE drip_campaigns
                    SET completed_count = completed_count + 1, updated_at = NOW()
                    WHERE id = $1`,
                    [enrollment.campaign_id]
                );

                return;
            }

            const step = stepResult.rows[0];

            // Check if recipient has responded (if stop_on_response is true)
            if (enrollment.stop_on_response && enrollment.response_received) {
                await query(
                    `UPDATE drip_campaign_enrollments
                    SET status = 'stopped', stopped_reason = 'user_responded', updated_at = NOW()
                    WHERE id = $1`,
                    [enrollment.id]
                );
                return;
            }

            // Check max reminders
            if (nextStepNumber > enrollment.max_reminders + 1) {
                await query(
                    `UPDATE drip_campaign_enrollments
                    SET status = 'stopped', stopped_reason = 'max_reminders', updated_at = NOW()
                    WHERE id = $1`,
                    [enrollment.id]
                );
                return;
            }

            // Send message via appropriate channel
            const recipientData = JSON.parse(enrollment.recipient_data || '{}');
            const surveyUrl = this.generateSurveyUrl(enrollment.form_id, recipientData);

            let result = null;

            switch (enrollment.channel) {
                case 'email':
                    if (enrollment.recipient_email) {
                        result = await emailService.sendEmail(
                            enrollment.recipient_email,
                            step.subject,
                            step.body.replace('{{survey_url}}', surveyUrl),
                            step.body.replace('{{survey_url}}', surveyUrl),
                            { tenantId: enrollment.tenant_id, recipientName: enrollment.recipient_name }
                        );
                    }
                    break;

                case 'sms':
                    if (enrollment.recipient_phone) {
                        result = await smsService.sendMessage(
                            enrollment.recipient_phone,
                            step.body.replace('{{survey_url}}', surveyUrl),
                            { tenantId: enrollment.tenant_id, recipientName: enrollment.recipient_name }
                        );
                    }
                    break;

                case 'whatsapp':
                    if (enrollment.recipient_phone) {
                        result = await whatsappService.sendMessage(
                            enrollment.recipient_phone,
                            step.body.replace('{{survey_url}}', surveyUrl),
                            { tenantId: enrollment.tenant_id, recipientName: enrollment.recipient_name }
                        );
                    }
                    break;

                case 'telegram':
                    if (recipientData.telegram_chat_id || enrollment.recipient_phone) {
                        const chatId = recipientData.telegram_chat_id || enrollment.recipient_phone;
                        result = await TelegramService.sendSurveyInvitation(
                            enrollment.tenant_id,
                            chatId,
                            {
                                title: step.subject || 'Survey Reminder',
                                description: step.body,
                                surveyUrl
                            },
                            { recipientName: enrollment.recipient_name }
                        );
                    }
                    break;
            }

            // Record step execution
            await query(
                `INSERT INTO drip_step_executions
                (enrollment_id, step_id, step_number, status, scheduled_at, sent_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                [enrollment.id, step.id, nextStepNumber, result?.success ? 'sent' : 'failed']
            );

            // Get next step for scheduling
            const nextStepResult = await query(
                `SELECT * FROM drip_campaign_steps
                WHERE campaign_id = $1 AND step_number = $2`,
                [enrollment.campaign_id, nextStepNumber + 1]
            );

            if (nextStepResult.rows.length > 0) {
                const nextStep = nextStepResult.rows[0];
                const nextStepTime = this.calculateNextStepTime(nextStep, 'UTC');

                // Update enrollment
                await query(
                    `UPDATE drip_campaign_enrollments
                    SET current_step = $1, next_step_at = $2, updated_at = NOW()
                    WHERE id = $3`,
                    [nextStepNumber, nextStepTime, enrollment.id]
                );
            } else {
                // No more steps
                await query(
                    `UPDATE drip_campaign_enrollments
                    SET current_step = $1, status = 'completed', completed_at = NOW(), updated_at = NOW()
                    WHERE id = $2`,
                    [nextStepNumber, enrollment.id]
                );

                // Update campaign completed count
                await query(
                    `UPDATE drip_campaigns
                    SET completed_count = completed_count + 1, updated_at = NOW()
                    WHERE id = $1`,
                    [enrollment.campaign_id]
                );
            }

            logger.info('[DripCampaignService] Step executed', {
                enrollmentId: enrollment.id,
                stepNumber: nextStepNumber,
                channel: enrollment.channel
            });
        } catch (error) {
            logger.error('[DripCampaignService] Failed to execute step', {
                error: error.message,
                enrollmentId: enrollment.id
            });

            // Record failed execution
            await query(
                `INSERT INTO drip_step_executions
                (enrollment_id, step_id, step_number, status, error_message, scheduled_at)
                VALUES ($1, $2, $3, 'failed', $4, NOW())`,
                [enrollment.id, 0, enrollment.current_step + 1, error.message]
            );

            throw error;
        }
    }

    /**
     * Generate survey URL for recipient
     * @param {number} formId - Form ID
     * @param {object} recipientData - Recipient data
     * @returns {string} - Survey URL
     */
    static generateSurveyUrl(formId, recipientData) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const identifier = recipientData.email || recipientData.phone || 'unknown';
        return `${frontendUrl}/s/${formId}?u=${encodeURIComponent(identifier)}`;
    }

    /**
     * Get campaign statistics
     * @param {number} campaignId - Campaign ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Campaign statistics
     */
    static async getCampaignStats(campaignId, tenantId) {
        try {
            const statsResult = await query(
                `SELECT
                    COUNT(*) as total_enrollments,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped,
                    COUNT(CASE WHEN response_received = true THEN 1 END) as responded,
                    ROUND(COUNT(CASE WHEN response_received = true THEN 1 END)::numeric /
                          NULLIF(COUNT(*), 0) * 100, 2) as response_rate
                FROM drip_campaign_enrollments
                WHERE campaign_id = $1`,
                [campaignId]
            );

            return statsResult.rows[0];
        } catch (error) {
            logger.error('[DripCampaignService] Failed to get campaign stats', {
                error: error.message,
                campaignId
            });
            throw error;
        }
    }

    /**
     * Mark enrollment as responded
     * @param {number} formId - Form ID
     * @param {string} recipientIdentifier - Email or phone
     * @returns {Promise<void>}
     */
    static async markAsResponded(formId, recipientIdentifier) {
        try {
            await query(
                `UPDATE drip_campaign_enrollments e
                SET response_received = true, responded_at = NOW(), status = 'stopped',
                    stopped_reason = 'user_responded', updated_at = NOW()
                FROM drip_campaigns c
                WHERE e.campaign_id = c.id
                  AND c.form_id = $1
                  AND (e.recipient_email = $2 OR e.recipient_phone = $2)
                  AND e.status = 'active'
                  AND c.stop_on_response = true`,
                [formId, recipientIdentifier]
            );

            logger.info('[DripCampaignService] Marked as responded', {
                formId,
                recipientIdentifier
            });
        } catch (error) {
            logger.error('[DripCampaignService] Failed to mark as responded', {
                error: error.message,
                formId,
                recipientIdentifier
            });
            // Don't throw - this is a non-critical operation
        }
    }
}

module.exports = DripCampaignService;
