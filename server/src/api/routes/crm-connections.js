/**
 * CRM Connections API Routes
 *
 * Endpoints for managing CRM integrations
 * - Connection CRUD
 * - OAuth flow
 * - Sync operations
 * - Field mappings
 * - Sync logs
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const CRMConnectionService = require('../../services/crm/CRMConnectionService');
const logger = require('../../infrastructure/logger');

/**
 * @route   GET /api/crm-connections/platforms
 * @desc    Get list of supported CRM platforms
 * @access  Private
 */
router.get('/platforms', authenticate, async (req, res) => {
    try {
        const platforms = CRMConnectionService.getSupportedPlatforms();

        res.json({
            success: true,
            data: platforms
        });
    } catch (error) {
        logger.error('[CRMConnections] GET /platforms failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/crm-connections
 * @desc    Create a new CRM connection
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;

        const connection = await CRMConnectionService.createConnection(
            tenantId,
            userId,
            req.body
        );

        res.status(201).json({
            success: true,
            data: connection
        });
    } catch (error) {
        logger.error('[CRMConnections] POST / failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/crm-connections
 * @desc    List all CRM connections for tenant
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { platform, status } = req.query;

        const connections = await CRMConnectionService.getConnections(tenantId, {
            platform,
            status
        });

        res.json({
            success: true,
            data: connections
        });
    } catch (error) {
        logger.error('[CRMConnections] GET / failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/crm-connections/:id
 * @desc    Get a specific CRM connection
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);

        const connection = await CRMConnectionService.getConnection(connectionId, tenantId);

        res.json({
            success: true,
            data: connection
        });
    } catch (error) {
        logger.error('[CRMConnections] GET /:id failed', { error: error.message });
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/crm-connections/:id
 * @desc    Update a CRM connection
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);

        const connection = await CRMConnectionService.updateConnection(
            connectionId,
            tenantId,
            req.body
        );

        res.json({
            success: true,
            data: connection
        });
    } catch (error) {
        logger.error('[CRMConnections] PUT /:id failed', { error: error.message });
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/crm-connections/:id
 * @desc    Delete a CRM connection
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);

        const result = await CRMConnectionService.deleteConnection(connectionId, tenantId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[CRMConnections] DELETE /:id failed', { error: error.message });
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/crm-connections/:id/test
 * @desc    Test a CRM connection
 * @access  Private
 */
router.post('/:id/test', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);

        const result = await CRMConnectionService.testConnection(connectionId, tenantId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[CRMConnections] POST /:id/test failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/crm-connections/:id/sync/contacts/to-crm
 * @desc    Sync contacts from VTrustX to CRM
 * @access  Private
 */
router.post('/:id/sync/contacts/to-crm', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);
        const { contactIds = [] } = req.body;

        const result = await CRMConnectionService.syncContactsToCRM(
            connectionId,
            tenantId,
            contactIds
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[CRMConnections] POST /:id/sync/contacts/to-crm failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/crm-connections/:id/sync/contacts/from-crm
 * @desc    Sync contacts from CRM to VTrustX
 * @access  Private
 */
router.post('/:id/sync/contacts/from-crm', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);
        const filters = req.body.filters || {};

        const result = await CRMConnectionService.syncContactsFromCRM(
            connectionId,
            tenantId,
            filters
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[CRMConnections] POST /:id/sync/contacts/from-crm failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/crm-connections/:id/push-response
 * @desc    Push a survey response to CRM
 * @access  Private
 */
router.post('/:id/push-response', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);
        const { submissionId } = req.body;

        if (!submissionId) {
            return res.status(400).json({
                success: false,
                error: 'submissionId is required'
            });
        }

        const result = await CRMConnectionService.pushResponseToCRM(
            connectionId,
            tenantId,
            submissionId
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[CRMConnections] POST /:id/push-response failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/crm-connections/:id/sync-logs
 * @desc    Get sync logs for a connection
 * @access  Private
 */
router.get('/:id/sync-logs', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);
        const { status, syncType, limit = 50, offset = 0 } = req.query;

        const logs = await CRMConnectionService.getSyncLogs(connectionId, tenantId, {
            status,
            syncType,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        logger.error('[CRMConnections] GET /:id/sync-logs failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/crm-connections/:id/available-fields
 * @desc    Get available fields from CRM
 * @access  Private
 */
router.get('/:id/available-fields', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const connectionId = parseInt(req.params.id);
        const { objectType = 'contact' } = req.query;

        const fields = await CRMConnectionService.getAvailableFields(
            connectionId,
            tenantId,
            objectType
        );

        res.json({
            success: true,
            data: fields
        });
    } catch (error) {
        logger.error('[CRMConnections] GET /:id/available-fields failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/crm-connections/oauth/:platform/url
 * @desc    Get OAuth authorization URL
 * @access  Private
 */
router.get('/oauth/:platform/url', authenticate, async (req, res) => {
    try {
        const { platform } = req.params;
        const { redirectUri } = req.query;

        if (!redirectUri) {
            return res.status(400).json({
                success: false,
                error: 'redirectUri is required'
            });
        }

        // Generate state for CSRF protection
        const state = require('crypto').randomBytes(32).toString('hex');

        // Store state in session/cache for validation
        // TODO: Implement state validation

        const config = {
            clientId: process.env[`${platform.toUpperCase()}_CLIENT_ID`],
            redirectUri,
            state
        };

        const authUrl = CRMConnectionService.getOAuthURL(platform, config);

        res.json({
            success: true,
            data: {
                authUrl,
                state
            }
        });
    } catch (error) {
        logger.error('[CRMConnections] GET /oauth/:platform/url failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
