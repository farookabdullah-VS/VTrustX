/**
 * Webhook Management Routes
 *
 * Endpoints for managing webhooks (authenticated users only):
 * - POST /api/webhooks - Create webhook subscription
 * - GET /api/webhooks - List webhooks
 * - GET /api/webhooks/:id - Get webhook details
 * - PUT /api/webhooks/:id - Update webhook
 * - DELETE /api/webhooks/:id - Delete webhook
 * - GET /api/webhooks/:id/deliveries - Get delivery logs
 * - POST /api/webhooks/:id/test - Test webhook delivery
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const WebhookService = require('../../services/WebhookService');
const logger = require('../../infrastructure/logger');

/**
 * POST /api/webhooks
 * Create a new webhook subscription
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const webhookData = req.body;

        const webhook = await WebhookService.createWebhook(tenantId, webhookData);

        return res.status(201).json({
            success: true,
            webhook,
            message: 'Webhook created successfully. Use the secret for HMAC verification.'
        });
    } catch (error) {
        logger.error('[Webhooks API] Failed to create webhook', {
            error: error.message
        });
        return res.status(500).json({
            error: error.message || 'Failed to create webhook'
        });
    }
});

/**
 * GET /api/webhooks
 * List all webhooks for tenant
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const webhooks = await WebhookService.listWebhooks(tenantId);

        return res.json({
            webhooks,
            count: webhooks.length
        });
    } catch (error) {
        logger.error('[Webhooks API] Failed to list webhooks', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to retrieve webhooks'
        });
    }
});

/**
 * GET /api/webhooks/:id
 * Get webhook details (including secret)
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const webhook = await WebhookService.getWebhook(parseInt(id), tenantId);

        return res.json({ webhook });
    } catch (error) {
        logger.error('[Webhooks API] Failed to get webhook', {
            error: error.message,
            webhookId: req.params.id
        });

        if (error.message === 'Webhook not found') {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        return res.status(500).json({
            error: 'Failed to retrieve webhook'
        });
    }
});

/**
 * PUT /api/webhooks/:id
 * Update webhook subscription
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const updates = req.body;

        const webhook = await WebhookService.updateWebhook(parseInt(id), tenantId, updates);

        return res.json({
            success: true,
            webhook
        });
    } catch (error) {
        logger.error('[Webhooks API] Failed to update webhook', {
            error: error.message,
            webhookId: req.params.id
        });

        if (error.message === 'Webhook not found') {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        return res.status(500).json({
            error: error.message || 'Failed to update webhook'
        });
    }
});

/**
 * DELETE /api/webhooks/:id
 * Delete webhook subscription
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        await WebhookService.deleteWebhook(parseInt(id), tenantId);

        return res.json({
            success: true,
            message: 'Webhook deleted successfully'
        });
    } catch (error) {
        logger.error('[Webhooks API] Failed to delete webhook', {
            error: error.message,
            webhookId: req.params.id
        });

        if (error.message === 'Webhook not found') {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        return res.status(500).json({
            error: 'Failed to delete webhook'
        });
    }
});

/**
 * GET /api/webhooks/:id/deliveries
 * Get webhook delivery logs
 */
router.get('/:id/deliveries', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;

        const deliveries = await WebhookService.getDeliveryLogs(parseInt(id), tenantId, limit);

        return res.json({
            deliveries,
            count: deliveries.length
        });
    } catch (error) {
        logger.error('[Webhooks API] Failed to get delivery logs', {
            error: error.message,
            webhookId: req.params.id
        });
        return res.status(500).json({
            error: 'Failed to retrieve delivery logs'
        });
    }
});

/**
 * POST /api/webhooks/:id/test
 * Test webhook delivery with sample payload
 */
router.post('/:id/test', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        // Get webhook
        const webhook = await WebhookService.getWebhook(parseInt(id), tenantId);

        // Send test payload
        const testPayload = {
            event: 'webhook.test',
            timestamp: new Date().toISOString(),
            data: {
                message: 'This is a test webhook delivery',
                webhook_id: webhook.id,
                webhook_name: webhook.name
            }
        };

        await WebhookService.queueDelivery(webhook, 'webhook.test', testPayload);

        return res.json({
            success: true,
            message: 'Test webhook queued for delivery. Check delivery logs for results.'
        });
    } catch (error) {
        logger.error('[Webhooks API] Failed to test webhook', {
            error: error.message,
            webhookId: req.params.id
        });

        if (error.message === 'Webhook not found') {
            return res.status(404).json({ error: 'Webhook not found' });
        }

        return res.status(500).json({
            error: 'Failed to test webhook'
        });
    }
});

module.exports = router;
