/**
 * Telegram API Routes
 *
 * Endpoints for Telegram Bot configuration and messaging
 * - Bot configuration (CRUD)
 * - Send messages
 * - Webhook handling
 * - Message statistics
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const TelegramService = require('../../services/TelegramService');
const logger = require('../../infrastructure/logger');

/**
 * @route   GET /api/telegram/config
 * @desc    Get Telegram bot configuration
 * @access  Private
 */
router.get('/config', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const config = await TelegramService.getBotConfig(tenantId);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Telegram bot not configured'
            });
        }

        // Remove sensitive data
        delete config.bot_token;
        delete config.webhook_secret;

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        logger.error('[Telegram] GET /config failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/telegram/config
 * @desc    Save Telegram bot configuration
 * @access  Private
 */
router.post('/config', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const configData = req.body;

        if (!configData.botToken) {
            return res.status(400).json({
                success: false,
                error: 'Bot token is required'
            });
        }

        // Verify bot token
        const botInfo = await TelegramService.getBotInfo(configData.botToken);

        if (!botInfo.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid bot token: ' + botInfo.error
            });
        }

        // Auto-fill bot username
        configData.botUsername = botInfo.bot.username;

        const config = await TelegramService.saveBotConfig(tenantId, configData);

        // Set webhook if URL provided
        if (configData.webhookUrl) {
            await TelegramService.setWebhook(configData.botToken, configData.webhookUrl);
        }

        res.json({
            success: true,
            data: config,
            bot: botInfo.bot
        });
    } catch (error) {
        logger.error('[Telegram] POST /config failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/telegram/test
 * @desc    Test Telegram bot configuration
 * @access  Private
 */
router.post('/test', authenticate, async (req, res) => {
    try {
        const { botToken } = req.body;

        if (!botToken) {
            return res.status(400).json({
                success: false,
                error: 'Bot token is required'
            });
        }

        const result = await TelegramService.getBotInfo(botToken);

        res.json(result);
    } catch (error) {
        logger.error('[Telegram] POST /test failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/telegram/send
 * @desc    Send message via Telegram
 * @access  Private
 */
router.post('/send', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { chatId, text, inlineKeyboard, distributionId, recipientName } = req.body;

        if (!chatId || !text) {
            return res.status(400).json({
                success: false,
                error: 'chatId and text are required'
            });
        }

        const result = await TelegramService.sendMessage(tenantId, chatId, text, {
            inlineKeyboard,
            distributionId,
            recipientName
        });

        res.json(result);
    } catch (error) {
        logger.error('[Telegram] POST /send failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/telegram/send-survey
 * @desc    Send survey invitation via Telegram
 * @access  Private
 */
router.post('/send-survey', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { chatId, surveyData, distributionId, recipientName } = req.body;

        if (!chatId || !surveyData || !surveyData.surveyUrl) {
            return res.status(400).json({
                success: false,
                error: 'chatId and surveyData with surveyUrl are required'
            });
        }

        const result = await TelegramService.sendSurveyInvitation(
            tenantId,
            chatId,
            surveyData,
            { distributionId, recipientName }
        );

        res.json(result);
    } catch (error) {
        logger.error('[Telegram] POST /send-survey failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/telegram/webhook/:tenantId
 * @desc    Webhook endpoint for Telegram updates
 * @access  Public (Telegram servers)
 */
router.post('/webhook/:tenantId', async (req, res) => {
    try {
        const update = req.body;

        // Handle the update asynchronously
        TelegramService.handleWebhookUpdate(update).catch(error => {
            logger.error('[Telegram] Webhook processing failed', {
                error: error.message,
                update
            });
        });

        // Respond immediately to Telegram
        res.json({ ok: true });
    } catch (error) {
        logger.error('[Telegram] POST /webhook/:tenantId failed', {
            error: error.message
        });
        res.status(500).json({ ok: false });
    }
});

/**
 * @route   GET /api/telegram/stats/:distributionId
 * @desc    Get message statistics for distribution
 * @access  Private
 */
router.get('/stats/:distributionId', authenticate, async (req, res) => {
    try {
        const distributionId = parseInt(req.params.distributionId);

        const stats = await TelegramService.getMessageStats(distributionId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('[Telegram] GET /stats/:distributionId failed', {
            error: error.message,
            distributionId: req.params.distributionId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/telegram/messages/:distributionId
 * @desc    Get messages for distribution
 * @access  Private
 */
router.get('/messages/:distributionId', authenticate, async (req, res) => {
    try {
        const distributionId = parseInt(req.params.distributionId);
        const { status, limit = 50, offset = 0 } = req.query;

        const { query: dbQuery } = require('../../infrastructure/database/db');

        let sql = `SELECT * FROM telegram_messages WHERE distribution_id = $1`;
        const params = [distributionId];
        let paramIndex = 2;

        if (status) {
            sql += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await dbQuery(sql, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('[Telegram] GET /messages/:distributionId failed', {
            error: error.message,
            distributionId: req.params.distributionId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
