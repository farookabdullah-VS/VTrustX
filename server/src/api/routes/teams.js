/**
 * Microsoft Teams Bot API Routes
 *
 * Endpoints:
 * - GET/POST /api/teams/config - Bot configuration management
 * - POST /api/teams/test - Test bot credentials
 * - POST /api/teams/send - Send message to Teams
 * - POST /api/teams/send-survey - Send survey invitation
 * - POST /api/teams/messaging - Bot Framework webhook
 * - GET /api/teams/stats/:distributionId - Distribution statistics
 * - GET /api/teams/messages/:distributionId - Get messages for distribution
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const TeamsService = require('../../services/TeamsService');
const logger = require('../../infrastructure/logger');
const { query } = require('../../infrastructure/database/db');

/**
 * GET /api/teams/config
 * Get Teams bot configuration for current tenant
 */
router.get('/config', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const config = await TeamsService.getBotConfig(tenantId);

        if (!config) {
            return res.json({ configured: false });
        }

        // Mask app password for security
        return res.json({
            configured: true,
            config: {
                id: config.id,
                appId: config.app_id,
                botName: config.bot_name,
                serviceUrl: config.service_url,
                tenantFilter: config.tenant_filter,
                allowTeams: config.allow_teams,
                allowChannels: config.allow_channels,
                allowGroupChat: config.allow_group_chat,
                welcomeMessage: config.welcome_message,
                isActive: config.is_active,
                createdAt: config.created_at,
                updatedAt: config.updated_at
            }
        });
    } catch (error) {
        logger.error('[Teams API] Failed to get config', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to retrieve Teams bot configuration'
        });
    }
});

/**
 * POST /api/teams/config
 * Save or update Teams bot configuration
 */
router.post('/config', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
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
        } = req.body;

        // Validation
        if (!appId || !appPassword) {
            return res.status(400).json({
                error: 'App ID and App Password are required'
            });
        }

        // Save configuration
        const config = await TeamsService.saveBotConfig(tenantId, {
            appId,
            appPassword,
            botName,
            serviceUrl,
            tenantFilter,
            allowTeams,
            allowChannels,
            allowGroupChat,
            welcomeMessage
        });

        return res.json({
            success: true,
            message: 'Teams bot configuration saved successfully',
            config: {
                id: config.id,
                appId: config.app_id,
                botName: config.bot_name,
                isActive: config.is_active
            }
        });
    } catch (error) {
        logger.error('[Teams API] Failed to save config', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to save Teams bot configuration: ' + error.message
        });
    }
});

/**
 * POST /api/teams/test
 * Test Teams bot credentials
 */
router.post('/test', authenticate, async (req, res) => {
    try {
        const { appId, appPassword } = req.body;

        if (!appId || !appPassword) {
            return res.status(400).json({
                error: 'App ID and App Password are required'
            });
        }

        const result = await TeamsService.testBotConfig(appId, appPassword);

        return res.json(result);
    } catch (error) {
        logger.error('[Teams API] Test failed', {
            error: error.message
        });
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/teams/send
 * Send message to Microsoft Teams conversation
 */
router.post('/send', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const {
            conversationId,
            text,
            adaptiveCard,
            channelId,
            userId,
            distributionId,
            recipientName
        } = req.body;

        // Validation
        if (!conversationId || !text) {
            return res.status(400).json({
                error: 'Conversation ID and message text are required'
            });
        }

        // Send message
        const result = await TeamsService.sendMessage(
            tenantId,
            conversationId,
            text,
            {
                adaptiveCard,
                channelId,
                userId,
                distributionId,
                recipientName
            }
        );

        if (result.success) {
            return res.json({
                success: true,
                messageId: result.messageId,
                activityId: result.activityId
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        logger.error('[Teams API] Send message failed', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/teams/send-survey
 * Send survey invitation with Adaptive Card
 */
router.post('/send-survey', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const {
            conversationId,
            surveyTitle,
            surveyDescription,
            surveyUrl,
            channelId,
            userId,
            distributionId,
            recipientName
        } = req.body;

        // Validation
        if (!conversationId || !surveyTitle || !surveyUrl) {
            return res.status(400).json({
                error: 'Conversation ID, survey title, and survey URL are required'
            });
        }

        // Send survey invitation
        const result = await TeamsService.sendSurveyInvitation(
            tenantId,
            conversationId,
            {
                title: surveyTitle,
                description: surveyDescription,
                surveyUrl
            },
            {
                channelId,
                userId,
                distributionId,
                recipientName
            }
        );

        if (result.success) {
            return res.json({
                success: true,
                messageId: result.messageId,
                activityId: result.activityId
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        logger.error('[Teams API] Send survey invitation failed', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/teams/messaging
 * Webhook endpoint for Microsoft Bot Framework activities
 * This endpoint is public (no authentication) as it receives events from Microsoft
 */
router.post('/messaging', async (req, res) => {
    try {
        const activity = req.body;

        logger.info('[Teams Webhook] Received activity', {
            type: activity.type,
            conversationId: activity.conversation?.id,
            activityId: activity.id
        });

        // Process the activity
        await TeamsService.handleBotActivity(activity);

        // Bot Framework expects 200 OK response
        return res.status(200).send();
    } catch (error) {
        logger.error('[Teams Webhook] Failed to process activity', {
            error: error.message,
            activity: req.body
        });
        // Still return 200 to prevent retries for invalid data
        return res.status(200).send();
    }
});

/**
 * GET /api/teams/stats/:distributionId
 * Get message statistics for a distribution
 */
router.get('/stats/:distributionId', authenticate, async (req, res) => {
    try {
        const { distributionId } = req.params;
        const tenantId = req.user.tenant_id;

        // Verify distribution belongs to tenant
        const distCheck = await query(
            'SELECT id FROM distributions WHERE id = $1 AND tenant_id = $2',
            [distributionId, tenantId]
        );

        if (distCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Distribution not found' });
        }

        const stats = await TeamsService.getMessageStats(distributionId);

        return res.json({
            distributionId: parseInt(distributionId),
            stats: {
                total: parseInt(stats.total) || 0,
                sent: parseInt(stats.sent) || 0,
                delivered: parseInt(stats.delivered) || 0,
                failed: parseInt(stats.failed) || 0,
                pending: parseInt(stats.pending) || 0
            }
        });
    } catch (error) {
        logger.error('[Teams API] Failed to get stats', {
            error: error.message,
            distributionId: req.params.distributionId
        });
        return res.status(500).json({
            error: 'Failed to retrieve message statistics'
        });
    }
});

/**
 * GET /api/teams/messages/:distributionId
 * Get all messages for a distribution
 */
router.get('/messages/:distributionId', authenticate, async (req, res) => {
    try {
        const { distributionId } = req.params;
        const tenantId = req.user.tenant_id;

        // Verify distribution belongs to tenant
        const distCheck = await query(
            'SELECT id FROM distributions WHERE id = $1 AND tenant_id = $2',
            [distributionId, tenantId]
        );

        if (distCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Distribution not found' });
        }

        const result = await query(
            `SELECT
                id, conversation_id, channel_id, user_id, recipient_name,
                message_text, activity_id, survey_url, status,
                sent_at, delivered_at, read_at, error_message,
                created_at, updated_at
            FROM teams_messages
            WHERE distribution_id = $1
            ORDER BY created_at DESC`,
            [distributionId]
        );

        return res.json({
            distributionId: parseInt(distributionId),
            messages: result.rows
        });
    } catch (error) {
        logger.error('[Teams API] Failed to get messages', {
            error: error.message,
            distributionId: req.params.distributionId
        });
        return res.status(500).json({
            error: 'Failed to retrieve messages'
        });
    }
});

module.exports = router;
