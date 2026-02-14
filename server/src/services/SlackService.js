/**
 * Slack Service
 *
 * Handles Slack Bot messaging for survey distribution
 * Features:
 * - Send messages via Slack Web API
 * - Track message delivery status
 * - Support Block Kit for rich messages
 * - Handle interactive components
 * - Webhook support for events
 * - Channel and DM messaging
 */

const axios = require('axios');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const { encrypt, decrypt } = require('../infrastructure/security/encryption');

class SlackService {
    /**
     * Get Slack Bot configuration for tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object|null>} - Bot configuration
     */
    static async getBotConfig(tenantId) {
        try {
            const result = await query(
                'SELECT * FROM slack_bot_config WHERE tenant_id = $1 AND is_active = true',
                [tenantId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const config = result.rows[0];

            // Decrypt sensitive fields
            if (config.bot_token) {
                config.bot_token = decrypt(config.bot_token);
            }
            if (config.signing_secret) {
                config.signing_secret = decrypt(config.signing_secret);
            }

            return config;
        } catch (error) {
            logger.error('[SlackService] Failed to get bot config', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Save or update bot configuration
     * @param {number} tenantId - Tenant ID
     * @param {object} configData - Configuration data
     * @returns {Promise<object>} - Saved configuration
     */
    static async saveBotConfig(tenantId, configData) {
        try {
            const {
                botToken,
                workspaceName,
                workspaceId,
                botUserId,
                appId,
                webhookUrl,
                signingSecret,
                scopes,
                allowChannels,
                allowPrivateChannels,
                welcomeMessage
            } = configData;

            // Encrypt sensitive fields
            const encryptedToken = encrypt(botToken);
            const encryptedSigningSecret = signingSecret ? encrypt(signingSecret) : null;

            // Check if config exists
            const existing = await query(
                'SELECT id FROM slack_bot_config WHERE tenant_id = $1',
                [tenantId]
            );

            let result;
            if (existing.rows.length > 0) {
                // Update existing
                result = await query(
                    `UPDATE slack_bot_config
                    SET bot_token = $1, workspace_name = $2, workspace_id = $3,
                        bot_user_id = $4, app_id = $5, webhook_url = $6,
                        signing_secret = $7, scopes = $8, allow_channels = $9,
                        allow_private_channels = $10, welcome_message = $11,
                        updated_at = NOW()
                    WHERE tenant_id = $12
                    RETURNING id, tenant_id, workspace_name, workspace_id, bot_user_id, app_id, is_active`,
                    [
                        encryptedToken,
                        workspaceName,
                        workspaceId,
                        botUserId,
                        appId,
                        webhookUrl || null,
                        encryptedSigningSecret,
                        scopes || [],
                        allowChannels !== undefined ? allowChannels : true,
                        allowPrivateChannels !== undefined ? allowPrivateChannels : false,
                        welcomeMessage || null,
                        tenantId
                    ]
                );
            } else {
                // Insert new
                result = await query(
                    `INSERT INTO slack_bot_config
                    (tenant_id, bot_token, workspace_name, workspace_id, bot_user_id, app_id,
                     webhook_url, signing_secret, scopes, allow_channels, allow_private_channels, welcome_message)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING id, tenant_id, workspace_name, workspace_id, bot_user_id, app_id, is_active`,
                    [
                        tenantId,
                        encryptedToken,
                        workspaceName,
                        workspaceId,
                        botUserId,
                        appId,
                        webhookUrl || null,
                        encryptedSigningSecret,
                        scopes || [],
                        allowChannels !== undefined ? allowChannels : true,
                        allowPrivateChannels !== undefined ? allowPrivateChannels : false,
                        welcomeMessage || null
                    ]
                );
            }

            logger.info('[SlackService] Bot config saved', {
                tenantId,
                workspaceName
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[SlackService] Failed to save bot config', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Test bot configuration by calling auth.test
     * @param {string} botToken - Slack bot token
     * @returns {Promise<object>} - Auth test result
     */
    static async testBotToken(botToken) {
        try {
            const response = await axios.post(
                'https://slack.com/api/auth.test',
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${botToken}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    }
                }
            );

            if (response.data.ok) {
                return {
                    success: true,
                    workspace: {
                        id: response.data.team_id,
                        name: response.data.team,
                        url: response.data.url
                    },
                    bot: {
                        userId: response.data.user_id,
                        user: response.data.user
                    }
                };
            } else {
                return {
                    success: false,
                    error: response.data.error || 'Invalid token'
                };
            }
        } catch (error) {
            logger.error('[SlackService] Bot token test failed', {
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send message via Slack
     * @param {number} tenantId - Tenant ID
     * @param {string} channel - Slack channel/user ID
     * @param {string} text - Message text (fallback)
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Message result
     */
    static async sendMessage(tenantId, channel, text, options = {}) {
        try {
            const config = await this.getBotConfig(tenantId);

            if (!config) {
                throw new Error('Slack bot not configured for this tenant');
            }

            const {
                blocks,
                threadTs,
                distributionId,
                recipientName,
                surveyUrl
            } = options;

            // Create message record
            const messageRecord = await query(
                `INSERT INTO slack_messages
                (tenant_id, distribution_id, channel_id, user_id, recipient_name, message_text, blocks, thread_ts, survey_url, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    tenantId,
                    distributionId || null,
                    channel.startsWith('C') || channel.startsWith('G') ? channel : null,
                    channel.startsWith('U') || channel.startsWith('W') ? channel : null,
                    recipientName || null,
                    text,
                    blocks ? JSON.stringify(blocks) : null,
                    threadTs || null,
                    surveyUrl || null,
                    'pending'
                ]
            );

            const messageId = messageRecord.rows[0].id;

            // Send via Slack API
            const payload = {
                channel: channel,
                text: text
            };

            if (blocks) {
                payload.blocks = blocks;
            }

            if (threadTs) {
                payload.thread_ts = threadTs;
            }

            const response = await axios.post(
                'https://slack.com/api/chat.postMessage',
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${config.bot_token}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    }
                }
            );

            if (response.data.ok) {
                // Update message record with Slack message timestamp
                await query(
                    `UPDATE slack_messages
                    SET message_ts = $1, status = $2, sent_at = NOW(), updated_at = NOW()
                    WHERE id = $3`,
                    [response.data.ts, 'sent', messageId]
                );

                logger.info('[SlackService] Message sent successfully', {
                    tenantId,
                    channel,
                    messageId
                });

                return {
                    success: true,
                    messageId,
                    slackMessageTs: response.data.ts,
                    channel: response.data.channel
                };
            } else {
                // Update with error
                await query(
                    `UPDATE slack_messages
                    SET status = $1, error_message = $2, updated_at = NOW()
                    WHERE id = $3`,
                    ['failed', response.data.error, messageId]
                );

                logger.error('[SlackService] Message send failed', {
                    tenantId,
                    channel,
                    error: response.data.error
                });

                return {
                    success: false,
                    error: response.data.error
                };
            }
        } catch (error) {
            logger.error('[SlackService] Send message failed', {
                error: error.message,
                tenantId,
                channel
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send survey invitation via Slack
     * @param {number} tenantId - Tenant ID
     * @param {string} channel - Slack channel/user ID
     * @param {object} surveyData - Survey information
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Message result
     */
    static async sendSurveyInvitation(tenantId, channel, surveyData, options = {}) {
        try {
            const { title, description, surveyUrl } = surveyData;
            const { distributionId, recipientName } = options;

            // Build Block Kit message
            const blocks = [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '📋 Survey Invitation',
                        emoji: true
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${title}*\n\n${description || 'We would appreciate your feedback!'}`
                    }
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'Take Survey',
                                emoji: true
                            },
                            style: 'primary',
                            url: surveyUrl,
                            action_id: 'take_survey'
                        }
                    ]
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: '⏱️ Takes about 2-3 minutes'
                        }
                    ]
                }
            ];

            const fallbackText = `${title}\n\n${description || ''}\n\nTake the survey: ${surveyUrl}`;

            return await this.sendMessage(
                tenantId,
                channel,
                fallbackText,
                {
                    blocks,
                    distributionId,
                    recipientName,
                    surveyUrl
                }
            );
        } catch (error) {
            logger.error('[SlackService] Send survey invitation failed', {
                error: error.message,
                tenantId,
                channel
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle incoming webhook events
     * @param {object} event - Slack event data
     * @returns {Promise<void>}
     */
    static async handleWebhookEvent(event) {
        try {
            // Handle different event types
            switch (event.type) {
                case 'message':
                    // Handle message events (for read receipts, etc.)
                    if (event.channel && event.ts) {
                        await query(
                            `UPDATE slack_messages
                            SET delivered_at = NOW(), status = 'delivered', updated_at = NOW()
                            WHERE channel_id = $1 AND message_ts = $2 AND delivered_at IS NULL`,
                            [event.channel, event.ts]
                        );
                    }
                    break;

                case 'app_mention':
                    // Bot was mentioned in a channel
                    logger.info('[SlackService] Bot mentioned', { event });
                    break;

                case 'member_joined_channel':
                    // Bot joined a channel
                    logger.info('[SlackService] Bot joined channel', { event });
                    break;

                default:
                    logger.debug('[SlackService] Unhandled event type', {
                        type: event.type
                    });
            }
        } catch (error) {
            logger.error('[SlackService] Webhook event handling failed', {
                error: error.message,
                event
            });
        }
    }

    /**
     * Get message statistics for distribution
     * @param {number} distributionId - Distribution ID
     * @returns {Promise<object>} - Message statistics
     */
    static async getMessageStats(distributionId) {
        try {
            const result = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending
                FROM slack_messages
                WHERE distribution_id = $1`,
                [distributionId]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[SlackService] Failed to get message stats', {
                error: error.message,
                distributionId
            });
            throw error;
        }
    }
}

module.exports = SlackService;
