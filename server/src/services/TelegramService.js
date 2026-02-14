/**
 * Telegram Service
 *
 * Handles Telegram Bot messaging for survey distribution
 * Features:
 * - Send messages via Telegram Bot API
 * - Track message delivery status
 * - Handle inline keyboards for survey links
 * - Webhook support for delivery updates
 * - Chat/user management
 */

const axios = require('axios');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const { encrypt, decrypt } = require('../infrastructure/security/encryption');

class TelegramService {
    /**
     * Get Telegram Bot configuration for tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object|null>} - Bot configuration
     */
    static async getBotConfig(tenantId) {
        try {
            const result = await query(
                'SELECT * FROM telegram_bot_config WHERE tenant_id = $1 AND is_active = true',
                [tenantId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const config = result.rows[0];

            // Decrypt bot token
            if (config.bot_token) {
                config.bot_token = decrypt(config.bot_token);
            }

            return config;
        } catch (error) {
            logger.error('[TelegramService] Failed to get bot config', {
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
                botUsername,
                webhookUrl,
                allowGroups,
                allowChannels,
                welcomeMessage
            } = configData;

            // Encrypt bot token
            const encryptedToken = encrypt(botToken);

            // Check if config exists
            const existing = await query(
                'SELECT id FROM telegram_bot_config WHERE tenant_id = $1',
                [tenantId]
            );

            let result;
            if (existing.rows.length > 0) {
                // Update existing
                result = await query(
                    `UPDATE telegram_bot_config
                    SET bot_token = $1, bot_username = $2, webhook_url = $3,
                        allow_groups = $4, allow_channels = $5, welcome_message = $6,
                        updated_at = NOW()
                    WHERE tenant_id = $7
                    RETURNING id, tenant_id, bot_username, webhook_url, is_active, allow_groups, allow_channels`,
                    [
                        encryptedToken,
                        botUsername,
                        webhookUrl || null,
                        allowGroups || false,
                        allowChannels || false,
                        welcomeMessage || null,
                        tenantId
                    ]
                );
            } else {
                // Insert new
                result = await query(
                    `INSERT INTO telegram_bot_config
                    (tenant_id, bot_token, bot_username, webhook_url, allow_groups, allow_channels, welcome_message)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id, tenant_id, bot_username, webhook_url, is_active, allow_groups, allow_channels`,
                    [
                        tenantId,
                        encryptedToken,
                        botUsername,
                        webhookUrl || null,
                        allowGroups || false,
                        allowChannels || false,
                        welcomeMessage || null
                    ]
                );
            }

            logger.info('[TelegramService] Bot config saved', {
                tenantId,
                botUsername
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[TelegramService] Failed to save bot config', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Send message via Telegram
     * @param {number} tenantId - Tenant ID
     * @param {string} chatId - Telegram chat ID
     * @param {string} text - Message text
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Message result
     */
    static async sendMessage(tenantId, chatId, text, options = {}) {
        try {
            const config = await this.getBotConfig(tenantId);

            if (!config) {
                throw new Error('Telegram bot not configured for this tenant');
            }

            const {
                inlineKeyboard,
                distributionId,
                recipientName,
                recipientUsername,
                surveyUrl
            } = options;

            // Create message record
            const messageRecord = await query(
                `INSERT INTO telegram_messages
                (tenant_id, distribution_id, chat_id, recipient_username, recipient_name, message_text, inline_keyboard, survey_url, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    tenantId,
                    distributionId || null,
                    chatId,
                    recipientUsername || null,
                    recipientName || null,
                    text,
                    inlineKeyboard ? JSON.stringify(inlineKeyboard) : null,
                    surveyUrl || null,
                    'pending'
                ]
            );

            const messageId = messageRecord.rows[0].id;

            // Send via Telegram Bot API
            const telegramApiUrl = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;

            const payload = {
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            };

            // Add inline keyboard if provided
            if (inlineKeyboard) {
                payload.reply_markup = {
                    inline_keyboard: inlineKeyboard
                };
            }

            const response = await axios.post(telegramApiUrl, payload);

            if (response.data.ok) {
                // Update message record with Telegram message ID
                await query(
                    `UPDATE telegram_messages
                    SET message_id = $1, status = $2, sent_at = NOW(), updated_at = NOW()
                    WHERE id = $3`,
                    [response.data.result.message_id.toString(), 'sent', messageId]
                );

                logger.info('[TelegramService] Message sent', {
                    tenantId,
                    chatId,
                    messageId,
                    telegramMessageId: response.data.result.message_id
                });

                return {
                    success: true,
                    messageId,
                    telegramMessageId: response.data.result.message_id,
                    chatId
                };
            } else {
                throw new Error(response.data.description || 'Telegram API error');
            }
        } catch (error) {
            logger.error('[TelegramService] Failed to send message', {
                error: error.message,
                tenantId,
                chatId
            });

            // Update message record with error
            if (error.response?.data?.description) {
                await query(
                    `UPDATE telegram_messages
                    SET status = $1, error_message = $2, updated_at = NOW()
                    WHERE chat_id = $3 AND status = $4
                    ORDER BY created_at DESC
                    LIMIT 1`,
                    ['failed', error.response.data.description, chatId, 'pending']
                );
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send survey invitation via Telegram
     * @param {number} tenantId - Tenant ID
     * @param {string} chatId - Telegram chat ID
     * @param {object} surveyData - Survey information
     * @param {object} options - Additional options
     * @returns {Promise<object>} - Send result
     */
    static async sendSurveyInvitation(tenantId, chatId, surveyData, options = {}) {
        try {
            const { title, description, surveyUrl } = surveyData;

            // Build message text
            let messageText = `<b>${title}</b>\n\n`;
            if (description) {
                messageText += `${description}\n\n`;
            }
            messageText += `Click the button below to take the survey:`;

            // Create inline keyboard with survey link
            const inlineKeyboard = [
                [
                    {
                        text: '📝 Take Survey',
                        url: surveyUrl
                    }
                ]
            ];

            return await this.sendMessage(tenantId, chatId, messageText, {
                ...options,
                inlineKeyboard,
                surveyUrl
            });
        } catch (error) {
            logger.error('[TelegramService] Failed to send survey invitation', {
                error: error.message,
                tenantId,
                chatId
            });
            throw error;
        }
    }

    /**
     * Get bot information
     * @param {string} botToken - Bot token
     * @returns {Promise<object>} - Bot information
     */
    static async getBotInfo(botToken) {
        try {
            const response = await axios.get(
                `https://api.telegram.org/bot${botToken}/getMe`
            );

            if (response.data.ok) {
                return {
                    success: true,
                    bot: response.data.result
                };
            } else {
                throw new Error(response.data.description || 'Failed to get bot info');
            }
        } catch (error) {
            logger.error('[TelegramService] Failed to get bot info', {
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Set webhook for bot
     * @param {string} botToken - Bot token
     * @param {string} webhookUrl - Webhook URL
     * @returns {Promise<object>} - Webhook setup result
     */
    static async setWebhook(botToken, webhookUrl) {
        try {
            const response = await axios.post(
                `https://api.telegram.org/bot${botToken}/setWebhook`,
                { url: webhookUrl }
            );

            if (response.data.ok) {
                logger.info('[TelegramService] Webhook set successfully', {
                    webhookUrl
                });
                return {
                    success: true,
                    description: response.data.description
                };
            } else {
                throw new Error(response.data.description || 'Failed to set webhook');
            }
        } catch (error) {
            logger.error('[TelegramService] Failed to set webhook', {
                error: error.message,
                webhookUrl
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle webhook update from Telegram
     * @param {object} update - Telegram update object
     * @returns {Promise<void>}
     */
    static async handleWebhookUpdate(update) {
        try {
            logger.info('[TelegramService] Webhook update received', {
                updateId: update.update_id,
                type: update.message ? 'message' : update.callback_query ? 'callback' : 'other'
            });

            // Handle incoming message
            if (update.message) {
                const message = update.message;
                const chatId = message.chat.id.toString();

                // Update delivery status if this is a reply to our message
                if (message.reply_to_message) {
                    await query(
                        `UPDATE telegram_messages
                        SET status = $1, delivered_at = NOW(), read_at = NOW(),
                            replied_at = NOW(), reply_text = $2, updated_at = NOW()
                        WHERE message_id = $3`,
                        ['read', message.text, message.reply_to_message.message_id.toString()]
                    );
                }

                // Handle /start command
                if (message.text === '/start') {
                    // Send welcome message (if configured)
                    // This would require knowing which tenant's bot this is
                    // Implementation depends on webhook URL structure
                }
            }

            // Handle callback query (inline button click)
            if (update.callback_query) {
                const callbackQuery = update.callback_query;
                const messageId = callbackQuery.message.message_id.toString();

                // Mark as read when user clicks survey button
                await query(
                    `UPDATE telegram_messages
                    SET status = $1, read_at = NOW(), updated_at = NOW()
                    WHERE message_id = $2 AND status != $3`,
                    ['read', messageId, 'read']
                );
            }
        } catch (error) {
            logger.error('[TelegramService] Failed to handle webhook update', {
                error: error.message,
                update
            });
        }
    }

    /**
     * Get message statistics for distribution
     * @param {number} distributionId - Distribution ID
     * @returns {Promise<object>} - Statistics
     */
    static async getMessageStats(distributionId) {
        try {
            const result = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
                    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
                    COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                    COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as replied
                FROM telegram_messages
                WHERE distribution_id = $1`,
                [distributionId]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[TelegramService] Failed to get message stats', {
                error: error.message,
                distributionId
            });
            return {
                total: 0,
                sent: 0,
                delivered: 0,
                read: 0,
                failed: 0,
                replied: 0
            };
        }
    }
}

module.exports = TelegramService;
