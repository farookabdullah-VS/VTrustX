/**
 * Microsoft Teams Service
 *
 * Handles Microsoft Teams Bot messaging for survey distribution
 * Features:
 * - Send messages via Bot Framework API
 * - Track message delivery status
 * - Support Adaptive Cards for rich messages
 * - Handle bot activities and conversations
 * - Webhook support for Bot Framework events
 * - Team, channel, and 1:1 messaging
 */

const axios = require('axios');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const { encrypt, decrypt } = require('../infrastructure/security/encryption');

class TeamsService {
    /**
     * Get Microsoft Teams Bot configuration for tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object|null>} - Bot configuration
     */
    static async getBotConfig(tenantId) {
        try {
            const result = await query(
                'SELECT * FROM teams_bot_config WHERE tenant_id = $1 AND is_active = true',
                [tenantId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const config = result.rows[0];

            // Decrypt sensitive fields
            if (config.app_password) {
                config.app_password = decrypt(config.app_password);
            }

            return config;
        } catch (error) {
            logger.error('[TeamsService] Failed to get bot config', {
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
                appId,
                appPassword,
                botName,
                serviceUrl,
                tenantFilter,
                allowTeams,
                allowChannels,
                allowGroupChat,
                welcomeMessage
            } = configData;

            // Encrypt app password
            const encryptedPassword = encrypt(appPassword);

            // Check if config exists
            const existing = await query(
                'SELECT id FROM teams_bot_config WHERE tenant_id = $1',
                [tenantId]
            );

            let result;
            if (existing.rows.length > 0) {
                // Update existing
                result = await query(
                    `UPDATE teams_bot_config
                    SET app_id = $1, app_password = $2, bot_name = $3,
                        service_url = $4, tenant_filter = $5, allow_teams = $6,
                        allow_channels = $7, allow_group_chat = $8, welcome_message = $9,
                        updated_at = NOW()
                    WHERE tenant_id = $10
                    RETURNING id, tenant_id, app_id, bot_name, service_url, is_active`,
                    [
                        appId,
                        encryptedPassword,
                        botName || null,
                        serviceUrl || 'https://smba.trafficmanager.net/apis/',
                        tenantFilter || [],
                        allowTeams !== undefined ? allowTeams : true,
                        allowChannels !== undefined ? allowChannels : true,
                        allowGroupChat !== undefined ? allowGroupChat : true,
                        welcomeMessage || null,
                        tenantId
                    ]
                );
            } else {
                // Insert new
                result = await query(
                    `INSERT INTO teams_bot_config
                    (tenant_id, app_id, app_password, bot_name, service_url, tenant_filter,
                     allow_teams, allow_channels, allow_group_chat, welcome_message)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id, tenant_id, app_id, bot_name, service_url, is_active`,
                    [
                        tenantId,
                        appId,
                        encryptedPassword,
                        botName || null,
                        serviceUrl || 'https://smba.trafficmanager.net/apis/',
                        tenantFilter || [],
                        allowTeams !== undefined ? allowTeams : true,
                        allowChannels !== undefined ? allowChannels : true,
                        allowGroupChat !== undefined ? allowGroupChat : true,
                        welcomeMessage || null
                    ]
                );
            }

            logger.info('[TeamsService] Bot config saved', {
                tenantId,
                appId
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[TeamsService] Failed to save bot config', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get Bot Framework access token
     * @param {string} appId - Microsoft App ID
     * @param {string} appPassword - Microsoft App Password
     * @returns {Promise<string>} - Access token
     */
    static async getBotAccessToken(appId, appPassword) {
        try {
            const response = await axios.post(
                'https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token',
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: appId,
                    client_secret: appPassword,
                    scope: 'https://api.botframework.com/.default'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data.access_token;
        } catch (error) {
            logger.error('[TeamsService] Failed to get access token', {
                error: error.message,
                appId
            });
            throw new Error('Failed to authenticate with Bot Framework: ' + error.message);
        }
    }

    /**
     * Test bot configuration
     * @param {string} appId - Microsoft App ID
     * @param {string} appPassword - Microsoft App Password
     * @returns {Promise<object>} - Test result
     */
    static async testBotConfig(appId, appPassword) {
        try {
            const accessToken = await this.getBotAccessToken(appId, appPassword);

            return {
                success: true,
                appId: appId,
                message: 'Bot credentials verified successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send message via Microsoft Teams
     * @param {number} tenantId - Tenant ID
     * @param {string} conversationId - Teams conversation ID
     * @param {string} text - Message text (fallback)
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Message result
     */
    static async sendMessage(tenantId, conversationId, text, options = {}) {
        try {
            const config = await this.getBotConfig(tenantId);

            if (!config) {
                throw new Error('Teams bot not configured for this tenant');
            }

            const {
                adaptiveCard,
                channelId,
                userId,
                distributionId,
                recipientName,
                surveyUrl
            } = options;

            // Create message record
            const messageRecord = await query(
                `INSERT INTO teams_messages
                (tenant_id, distribution_id, conversation_id, channel_id, user_id, recipient_name, message_text, adaptive_card, survey_url, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    tenantId,
                    distributionId || null,
                    conversationId,
                    channelId || null,
                    userId || null,
                    recipientName || null,
                    text,
                    adaptiveCard ? JSON.stringify(adaptiveCard) : null,
                    surveyUrl || null,
                    'pending'
                ]
            );

            const messageId = messageRecord.rows[0].id;

            // Get access token
            const accessToken = await this.getBotAccessToken(config.app_id, config.app_password);

            // Build activity
            const activity = {
                type: 'message',
                text: text
            };

            if (adaptiveCard) {
                activity.attachments = [{
                    contentType: 'application/vnd.microsoft.card.adaptive',
                    content: adaptiveCard
                }];
            }

            // Send via Bot Framework API
            const serviceUrl = config.service_url || 'https://smba.trafficmanager.net/apis/';
            const url = `${serviceUrl}v3/conversations/${conversationId}/activities`;

            const response = await axios.post(url, activity, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.id) {
                // Update message record with Teams activity ID
                await query(
                    `UPDATE teams_messages
                    SET activity_id = $1, status = $2, sent_at = NOW(), updated_at = NOW()
                    WHERE id = $3`,
                    [response.data.id, 'sent', messageId]
                );

                logger.info('[TeamsService] Message sent successfully', {
                    tenantId,
                    conversationId,
                    messageId
                });

                return {
                    success: true,
                    messageId,
                    activityId: response.data.id
                };
            } else {
                throw new Error('No activity ID returned from Teams API');
            }
        } catch (error) {
            logger.error('[TeamsService] Send message failed', {
                error: error.message,
                tenantId,
                conversationId
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send survey invitation via Microsoft Teams
     * @param {number} tenantId - Tenant ID
     * @param {string} conversationId - Teams conversation ID
     * @param {object} surveyData - Survey information
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Message result
     */
    static async sendSurveyInvitation(tenantId, conversationId, surveyData, options = {}) {
        try {
            const { title, description, surveyUrl } = surveyData;
            const { distributionId, recipientName, channelId, userId } = options;

            // Build Adaptive Card
            const adaptiveCard = {
                type: 'AdaptiveCard',
                version: '1.4',
                body: [
                    {
                        type: 'TextBlock',
                        text: '📋 Survey Invitation',
                        weight: 'Bolder',
                        size: 'Large',
                        color: 'Accent'
                    },
                    {
                        type: 'TextBlock',
                        text: title,
                        weight: 'Bolder',
                        size: 'Medium',
                        wrap: true,
                        spacing: 'Medium'
                    },
                    {
                        type: 'TextBlock',
                        text: description || 'We would appreciate your feedback!',
                        wrap: true,
                        spacing: 'Small'
                    },
                    {
                        type: 'TextBlock',
                        text: '⏱️ Takes about 2-3 minutes',
                        size: 'Small',
                        color: 'Attention',
                        spacing: 'Medium'
                    }
                ],
                actions: [
                    {
                        type: 'Action.OpenUrl',
                        title: 'Take Survey',
                        url: surveyUrl,
                        style: 'positive'
                    }
                ]
            };

            const fallbackText = `📋 ${title}\n\n${description || ''}\n\nTake the survey: ${surveyUrl}`;

            return await this.sendMessage(
                tenantId,
                conversationId,
                fallbackText,
                {
                    adaptiveCard,
                    channelId,
                    userId,
                    distributionId,
                    recipientName,
                    surveyUrl
                }
            );
        } catch (error) {
            logger.error('[TeamsService] Send survey invitation failed', {
                error: error.message,
                tenantId,
                conversationId
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle incoming Bot Framework activity
     * @param {object} activity - Bot Framework activity
     * @returns {Promise<void>}
     */
    static async handleBotActivity(activity) {
        try {
            // Handle different activity types
            switch (activity.type) {
                case 'message':
                    // Handle message activities
                    if (activity.conversation && activity.id) {
                        await query(
                            `UPDATE teams_messages
                            SET delivered_at = NOW(), status = 'delivered', updated_at = NOW()
                            WHERE conversation_id = $1 AND activity_id = $2 AND delivered_at IS NULL`,
                            [activity.conversation.id, activity.id]
                        );
                    }
                    break;

                case 'conversationUpdate':
                    // Bot added to team/channel or member joined
                    logger.info('[TeamsService] Conversation update', { activity });
                    break;

                case 'invoke':
                    // Action from Adaptive Card
                    logger.info('[TeamsService] Card action invoked', { activity });
                    break;

                default:
                    logger.debug('[TeamsService] Unhandled activity type', {
                        type: activity.type
                    });
            }
        } catch (error) {
            logger.error('[TeamsService] Bot activity handling failed', {
                error: error.message,
                activity
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
                FROM teams_messages
                WHERE distribution_id = $1`,
                [distributionId]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[TeamsService] Failed to get message stats', {
                error: error.message,
                distributionId
            });
            throw error;
        }
    }
}

module.exports = TeamsService;
