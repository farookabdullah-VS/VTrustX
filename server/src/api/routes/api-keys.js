/**
 * API Key Management Routes
 *
 * Endpoints for managing API keys (authenticated users only):
 * - POST /api/api-keys - Create new API key
 * - GET /api/api-keys - List API keys
 * - GET /api/api-keys/:id/stats - Get API key usage stats
 * - PUT /api/api-keys/:id - Update API key
 * - DELETE /api/api-keys/:id - Delete API key
 * - POST /api/api-keys/:id/revoke - Revoke API key
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const APIKeyService = require('../../services/APIKeyService');
const logger = require('../../infrastructure/logger');

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const keyData = req.body;

        const apiKey = await APIKeyService.createAPIKey(tenantId, keyData);

        return res.status(201).json({
            success: true,
            api_key: apiKey,
            warning: 'Save this API key securely. It will not be shown again!'
        });
    } catch (error) {
        logger.error('[API Keys] Failed to create API key', {
            error: error.message
        });
        return res.status(500).json({
            error: error.message || 'Failed to create API key'
        });
    }
});

/**
 * GET /api/api-keys
 * List all API keys for tenant
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const apiKeys = await APIKeyService.listAPIKeys(tenantId);

        return res.json({
            api_keys: apiKeys,
            count: apiKeys.length
        });
    } catch (error) {
        logger.error('[API Keys] Failed to list API keys', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to retrieve API keys'
        });
    }
});

/**
 * GET /api/api-keys/:id/stats
 * Get API key usage statistics
 */
router.get('/:id/stats', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const stats = await APIKeyService.getAPIKeyStats(parseInt(id), tenantId);

        return res.json({ stats });
    } catch (error) {
        logger.error('[API Keys] Failed to get API key stats', {
            error: error.message,
            keyId: req.params.id
        });

        if (error.message === 'API key not found') {
            return res.status(404).json({ error: 'API key not found' });
        }

        return res.status(500).json({
            error: 'Failed to retrieve API key stats'
        });
    }
});

/**
 * PUT /api/api-keys/:id
 * Update API key (name, description, scopes, rate limit)
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const updates = req.body;

        const apiKey = await APIKeyService.updateAPIKey(parseInt(id), tenantId, updates);

        return res.json({
            success: true,
            api_key: apiKey
        });
    } catch (error) {
        logger.error('[API Keys] Failed to update API key', {
            error: error.message,
            keyId: req.params.id
        });

        if (error.message === 'API key not found') {
            return res.status(404).json({ error: 'API key not found' });
        }

        return res.status(500).json({
            error: error.message || 'Failed to update API key'
        });
    }
});

/**
 * POST /api/api-keys/:id/revoke
 * Revoke (deactivate) an API key
 */
router.post('/:id/revoke', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        await APIKeyService.revokeAPIKey(parseInt(id), tenantId);

        return res.json({
            success: true,
            message: 'API key revoked successfully'
        });
    } catch (error) {
        logger.error('[API Keys] Failed to revoke API key', {
            error: error.message,
            keyId: req.params.id
        });

        if (error.message === 'API key not found') {
            return res.status(404).json({ error: 'API key not found' });
        }

        return res.status(500).json({
            error: 'Failed to revoke API key'
        });
    }
});

/**
 * DELETE /api/api-keys/:id
 * Permanently delete an API key
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        await APIKeyService.deleteAPIKey(parseInt(id), tenantId);

        return res.json({
            success: true,
            message: 'API key deleted successfully'
        });
    } catch (error) {
        logger.error('[API Keys] Failed to delete API key', {
            error: error.message,
            keyId: req.params.id
        });

        if (error.message === 'API key not found') {
            return res.status(404).json({ error: 'API key not found' });
        }

        return res.status(500).json({
            error: 'Failed to delete API key'
        });
    }
});

module.exports = router;
