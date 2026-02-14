/**
 * Slack API Routes
 *
 * Endpoints for Slack Bot configuration and messaging
 * - Bot configuration (CRUD)
 * - Send messages
 * - Webhook handling (Events API)
 * - Message statistics
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const SlackService = require('../../services/SlackService');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

/**
 * @route   GET /api/slack/config
 * @desc    Get Slack bot configuration
 * @access  Private
 */
router.get('/config', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const config = await SlackService.getBotConfig(tenantId);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Slack bot not configured'
            });
        }

        // Remove sensitive data
        delete config.bot_token;
        delete config.signing_secret;

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        logger.error('[Slack] GET /config failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/slack/config
 * @desc    Save Slack bot configuration
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
        const tokenTest = await SlackService.testBotToken(configData.botToken);

        if (!tokenTest.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid bot token: ' + tokenTest.error
            });
        }

        // Auto-fill workspace and bot info
        configData.workspaceName = tokenTest.workspace.name;
        configData.workspaceId = tokenTest.workspace.id;
        configData.botUserId = tokenTest.bot.userId;

        const config = await SlackService.saveBotConfig(tenantId, configData);

        res.json({
            success: true,
            data: config,
            workspace: tokenTest.workspace,
            bot: tokenTest.bot
        });
    } catch (error) {
        logger.error('[Slack] POST /config failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/slack/test
 * @desc    Test Slack bot configuration
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

        const result = await SlackService.testBotToken(botToken);

        res.json(result);
    } catch (error) {
        logger.error('[Slack] POST /test failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/slack/send
 * @desc    Send message via Slack
 * @access  Private
 */
router.post('/send', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { channel, text, blocks, threadTs, distributionId, recipientName } = req.body;

        if (!channel || !text) {
            return res.status(400).json({
                success: false,
                error: 'channel and text are required'
            });
        }

        const result = await SlackService.sendMessage(tenantId, channel, text, {
            blocks,
            threadTs,
            distributionId,
            recipientName
        });

        res.json(result);
    } catch (error) {
        logger.error('[Slack] POST /send failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/slack/send-survey
 * @desc    Send survey invitation via Slack
 * @access  Private
 */
router.post('/send-survey', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { channel, surveyData, distributionId, recipientName } = req.body;

        if (!channel || !surveyData || !surveyData.surveyUrl) {
            return res.status(400).json({
                success: false,
                error: 'channel and surveyData with surveyUrl are required'
            });
        }

        const result = await SlackService.sendSurveyInvitation(
            tenantId,
            channel,
            surveyData,
            { distributionId, recipientName }
        );

        res.json(result);
    } catch (error) {
        logger.error('[Slack] POST /send-survey failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/slack/events
 * @desc    Webhook endpoint for Slack Events API
 * @access  Public (Slack servers)
 */
router.post('/events', async (req, res) => {
    try {
        const event = req.body;

        // Handle URL verification challenge
        if (event.type === 'url_verification') {
            return res.json({ challenge: event.challenge });
        }

        // Handle event callbacks
        if (event.type === 'event_callback') {
            // Process event asynchronously
            SlackService.handleWebhookEvent(event.event).catch(error => {
                logger.error('[Slack] Event processing failed', {
                    error: error.message,
                    event
                });
            });
        }

        // Respond immediately to Slack
        res.json({ ok: true });
    } catch (error) {
        logger.error('[Slack] POST /events failed', {
            error: error.message
        });
        res.status(500).json({ ok: false });
    }
});

/**
 * @route   GET /api/slack/stats/:distributionId
 * @desc    Get message statistics for distribution
 * @access  Private
 */
router.get('/stats/:distributionId', authenticate, async (req, res) => {
    try {
        const distributionId = parseInt(req.params.distributionId);

        const stats = await SlackService.getMessageStats(distributionId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('[Slack] GET /stats/:distributionId failed', {
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
 * @route   GET /api/slack/messages/:distributionId
 * @desc    Get messages for distribution
 * @access  Private
 */
router.get('/messages/:distributionId', authenticate, async (req, res) => {
    try {
        const distributionId = parseInt(req.params.distributionId);
        const { status, limit = 50, offset = 0 } = req.query;

        let sql = `SELECT * FROM slack_messages WHERE distribution_id = $1`;
        const params = [distributionId];
        let paramIndex = 2;

        if (status) {
            sql += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('[Slack] GET /messages/:distributionId failed', {
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
