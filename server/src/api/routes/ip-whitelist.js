/**
 * IP Whitelist Routes
 *
 * Endpoints for managing IP-based access control:
 * - GET /api/ip-whitelist/config - Get whitelist configuration
 * - PUT /api/ip-whitelist/config - Update configuration (admin only)
 * - GET /api/ip-whitelist/rules - List whitelist rules
 * - POST /api/ip-whitelist/rules - Add new rule (admin only)
 * - PUT /api/ip-whitelist/rules/:id - Update rule (admin only)
 * - DELETE /api/ip-whitelist/rules/:id - Delete rule (admin only)
 * - POST /api/ip-whitelist/test - Test if an IP is whitelisted
 * - GET /api/ip-whitelist/logs - Get access logs (admin only)
 * - GET /api/ip-whitelist/stats - Get access statistics (admin only)
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const IPWhitelistService = require('../../services/IPWhitelistService');
const { getClientIP } = require('../middleware/ipWhitelistMiddleware');
const logger = require('../../infrastructure/logger');

/**
 * GET /api/ip-whitelist/config
 * Get IP whitelist configuration
 */
router.get('/config', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const config = await IPWhitelistService.getConfig(tenantId);

        return res.json(config);
    } catch (error) {
        logger.error('[IP Whitelist API] Get config failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to get IP whitelist configuration'
        });
    }
});

/**
 * PUT /api/ip-whitelist/config
 * Update IP whitelist configuration (admin only)
 */
router.put('/config', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;
        const {
            enabled,
            enforcement_mode,
            bypass_roles,
            grace_period_minutes
        } = req.body;

        // Validate enforcement_mode
        if (enforcement_mode && !['enforce', 'monitor', 'disabled'].includes(enforcement_mode)) {
            return res.status(400).json({
                error: 'Invalid enforcement_mode. Must be: enforce, monitor, or disabled'
            });
        }

        const config = await IPWhitelistService.updateConfig(tenantId, userId, {
            enabled,
            enforcement_mode,
            bypass_roles,
            grace_period_minutes
        });

        return res.json({
            success: true,
            config
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Update config failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to update IP whitelist configuration'
        });
    }
});

/**
 * GET /api/ip-whitelist/rules
 * List whitelist rules
 */
router.get('/rules', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { is_active, search } = req.query;

        const filters = {};
        if (is_active !== undefined) {
            filters.is_active = is_active === 'true';
        }
        if (search) {
            filters.search = search;
        }

        const rules = await IPWhitelistService.getRules(tenantId, filters);

        return res.json({
            rules,
            count: rules.length
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Get rules failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to get IP whitelist rules'
        });
    }
});

/**
 * POST /api/ip-whitelist/rules
 * Add new whitelist rule (admin only)
 */
router.post('/rules', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;
        const {
            ip_address,
            ip_range,
            description,
            is_active
        } = req.body;

        const rule = await IPWhitelistService.addRule(tenantId, userId, {
            ip_address,
            ip_range,
            description,
            is_active
        });

        return res.status(201).json({
            success: true,
            rule
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Add rule failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(400).json({
            error: error.message || 'Failed to add IP whitelist rule'
        });
    }
});

/**
 * PUT /api/ip-whitelist/rules/:id
 * Update whitelist rule (admin only)
 */
router.put('/rules/:id', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const ruleId = parseInt(req.params.id);
        const tenantId = req.user.tenant_id;
        const {
            ip_address,
            ip_range,
            description,
            is_active
        } = req.body;

        const rule = await IPWhitelistService.updateRule(ruleId, tenantId, {
            ip_address,
            ip_range,
            description,
            is_active
        });

        return res.json({
            success: true,
            rule
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Update rule failed', {
            error: error.message,
            ruleId: req.params.id,
            tenantId: req.user?.tenant_id
        });
        return res.status(400).json({
            error: error.message || 'Failed to update IP whitelist rule'
        });
    }
});

/**
 * DELETE /api/ip-whitelist/rules/:id
 * Delete whitelist rule (admin only)
 */
router.delete('/rules/:id', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const ruleId = parseInt(req.params.id);
        const tenantId = req.user.tenant_id;

        await IPWhitelistService.deleteRule(ruleId, tenantId);

        return res.json({
            success: true,
            message: 'IP whitelist rule deleted'
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Delete rule failed', {
            error: error.message,
            ruleId: req.params.id,
            tenantId: req.user?.tenant_id
        });
        return res.status(400).json({
            error: error.message || 'Failed to delete IP whitelist rule'
        });
    }
});

/**
 * POST /api/ip-whitelist/test
 * Test if an IP address is whitelisted
 */
router.post('/test', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { ip_address } = req.body;

        if (!ip_address) {
            return res.status(400).json({
                error: 'ip_address is required'
            });
        }

        const accessCheck = await IPWhitelistService.checkIPAccess(
            tenantId,
            ip_address,
            {
                userRole: req.user.role,
                userId: req.user.id,
                requestPath: '/api/ip-whitelist/test',
                userAgent: req.headers['user-agent']
            }
        );

        return res.json({
            ip_address,
            allowed: accessCheck.allowed,
            reason: accessCheck.reason,
            matchedRule: accessCheck.matchedRule || null
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Test IP failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(400).json({
            error: error.message || 'Failed to test IP address'
        });
    }
});

/**
 * GET /api/ip-whitelist/logs
 * Get access logs (admin only)
 */
router.get('/logs', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const {
            ip_address,
            allowed,
            startDate,
            endDate,
            limit = 100,
            offset = 0
        } = req.query;

        const filters = {
            ip_address,
            allowed: allowed !== undefined ? allowed === 'true' : undefined,
            startDate,
            endDate,
            limit: Math.min(parseInt(limit), 500),
            offset: parseInt(offset)
        };

        const logs = await IPWhitelistService.getAccessLogs(tenantId, filters);

        return res.json({
            logs,
            count: logs.length,
            limit: filters.limit,
            offset: filters.offset
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Get logs failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to get access logs'
        });
    }
});

/**
 * GET /api/ip-whitelist/stats
 * Get access statistics (admin only)
 */
router.get('/stats', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const days = parseInt(req.query.days) || 7;

        const stats = await IPWhitelistService.getStats(tenantId, days);

        return res.json({
            stats,
            period: `${days} days`
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Get stats failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to get statistics'
        });
    }
});

/**
 * GET /api/ip-whitelist/current
 * Get current request IP address
 */
router.get('/current', authenticate, (req, res) => {
    try {
        const ipAddress = getClientIP(req);

        return res.json({
            ip_address: ipAddress,
            headers: {
                'x-forwarded-for': req.headers['x-forwarded-for'],
                'x-real-ip': req.headers['x-real-ip'],
                'cf-connecting-ip': req.headers['cf-connecting-ip']
            }
        });
    } catch (error) {
        logger.error('[IP Whitelist API] Get current IP failed', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to get current IP address'
        });
    }
});

module.exports = router;
