/**
 * Audit Log Routes
 *
 * Endpoints for querying and managing audit logs:
 * - GET /api/audit-logs - Query audit logs with filters
 * - GET /api/audit-logs/stats - Get audit statistics
 * - GET /api/audit-logs/alerts - Get recent critical/warning events
 * - GET /api/audit-logs/user/:userId - Get user activity timeline
 * - GET /api/audit-logs/resource/:type/:id - Get resource history
 * - POST /api/audit-logs/cleanup - Manually trigger cleanup (admin only)
 * - GET /api/audit-logs/retention-policy - Get retention policy
 * - PUT /api/audit-logs/retention-policy - Update retention policy (admin only)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const AuditLogService = require('../../services/AuditLogService');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

/**
 * GET /api/audit-logs
 * Query audit logs with filters
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const {
            userId,
            action,
            category,
            resourceType,
            resourceId,
            status,
            severity,
            startDate,
            endDate,
            limit = 100,
            offset = 0,
            orderBy = 'created_at',
            orderDir = 'DESC'
        } = req.query;

        const logs = await AuditLogService.query({
            tenantId,
            userId: userId ? parseInt(userId) : undefined,
            action,
            category,
            resourceType,
            resourceId,
            status,
            severity,
            startDate,
            endDate,
            limit: Math.min(parseInt(limit), 1000), // Max 1000 records
            offset: parseInt(offset),
            orderBy,
            orderDir
        });

        // Get total count for pagination
        const countResult = await query(
            `SELECT COUNT(*) as total FROM audit_logs WHERE tenant_id = $1`,
            [tenantId]
        );

        return res.json({
            logs,
            count: logs.length,
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        logger.error('[Audit API] Query failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to query audit logs'
        });
    }
});

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const days = parseInt(req.query.days) || 30;

        const stats = await AuditLogService.getStats(tenantId, days);

        return res.json({
            stats,
            period: `${days} days`
        });
    } catch (error) {
        logger.error('[Audit API] Get stats failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to get audit statistics'
        });
    }
});

/**
 * GET /api/audit-logs/alerts
 * Get recent critical/warning events
 */
router.get('/alerts', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);

        const alerts = await AuditLogService.getAlerts(tenantId, limit);

        return res.json({
            alerts,
            count: alerts.length
        });
    } catch (error) {
        logger.error('[Audit API] Get alerts failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to get alerts'
        });
    }
});

/**
 * GET /api/audit-logs/user/:userId
 * Get user activity timeline
 */
router.get('/user/:userId', authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);

        // Check if user can view this user's activity
        // (Either viewing own activity or is admin)
        if (req.user.id !== userId && !['admin', 'tenant_admin'].includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden: You can only view your own activity'
            });
        }

        const activity = await AuditLogService.getUserActivity(userId, limit);

        return res.json({
            activity,
            count: activity.length,
            userId
        });
    } catch (error) {
        logger.error('[Audit API] Get user activity failed', {
            error: error.message,
            userId: req.params.userId
        });
        return res.status(500).json({
            error: 'Failed to get user activity'
        });
    }
});

/**
 * GET /api/audit-logs/resource/:type/:id
 * Get resource history
 */
router.get('/resource/:type/:id', authenticate, async (req, res) => {
    try {
        const { type, id } = req.params;

        const history = await AuditLogService.getResourceHistory(type, id);

        return res.json({
            history,
            count: history.length,
            resourceType: type,
            resourceId: id
        });
    } catch (error) {
        logger.error('[Audit API] Get resource history failed', {
            error: error.message,
            resourceType: req.params.type,
            resourceId: req.params.id
        });
        return res.status(500).json({
            error: 'Failed to get resource history'
        });
    }
});

/**
 * POST /api/audit-logs/cleanup
 * Manually trigger cleanup (admin only)
 */
router.post('/cleanup', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const deleted = await AuditLogService.cleanupOldLogs(tenantId);

        // Log the cleanup action
        await AuditLogService.log({
            tenantId,
            userId: req.user.id,
            actorEmail: req.user.email,
            action: 'audit.cleanup',
            category: 'system',
            metadata: { deletedCount: deleted },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.json({
            success: true,
            deletedCount: deleted,
            message: `Deleted ${deleted} old audit log entries`
        });
    } catch (error) {
        logger.error('[Audit API] Cleanup failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to cleanup audit logs'
        });
    }
});

/**
 * GET /api/audit-logs/retention-policy
 * Get retention policy for tenant
 */
router.get('/retention-policy', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(
            `SELECT * FROM audit_retention_policies WHERE tenant_id = $1`,
            [tenantId]
        );

        if (result.rows.length === 0) {
            // Return defaults
            return res.json({
                retention_days: 90,
                critical_retention_days: 365,
                auto_archive: false,
                archive_storage_path: null,
                isDefault: true
            });
        }

        return res.json({
            ...result.rows[0],
            isDefault: false
        });
    } catch (error) {
        logger.error('[Audit API] Get retention policy failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to get retention policy'
        });
    }
});

/**
 * PUT /api/audit-logs/retention-policy
 * Update retention policy (admin only)
 */
router.put('/retention-policy', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const {
            retention_days,
            critical_retention_days,
            auto_archive,
            archive_storage_path
        } = req.body;

        // Validate retention days
        if (retention_days !== undefined && retention_days < 0) {
            return res.status(400).json({
                error: 'Retention days must be >= 0 (0 = forever)'
            });
        }

        if (critical_retention_days !== undefined && critical_retention_days < 0) {
            return res.status(400).json({
                error: 'Critical retention days must be >= 0'
            });
        }

        // Upsert retention policy
        const result = await query(
            `INSERT INTO audit_retention_policies
            (tenant_id, retention_days, critical_retention_days, auto_archive, archive_storage_path)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tenant_id)
            DO UPDATE SET
                retention_days = COALESCE($2, audit_retention_policies.retention_days),
                critical_retention_days = COALESCE($3, audit_retention_policies.critical_retention_days),
                auto_archive = COALESCE($4, audit_retention_policies.auto_archive),
                archive_storage_path = COALESCE($5, audit_retention_policies.archive_storage_path),
                updated_at = NOW()
            RETURNING *`,
            [
                tenantId,
                retention_days !== undefined ? retention_days : null,
                critical_retention_days !== undefined ? critical_retention_days : null,
                auto_archive !== undefined ? auto_archive : null,
                archive_storage_path !== undefined ? archive_storage_path : null
            ]
        );

        // Log the policy change
        await AuditLogService.log({
            tenantId,
            userId: req.user.id,
            actorEmail: req.user.email,
            action: 'audit.retention_policy.update',
            category: 'system',
            severity: 'warning',
            metadata: {
                retention_days,
                critical_retention_days,
                auto_archive,
                archive_storage_path
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.json({
            success: true,
            policy: result.rows[0]
        });
    } catch (error) {
        logger.error('[Audit API] Update retention policy failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to update retention policy'
        });
    }
});

/**
 * GET /api/audit-logs/export
 * Export audit logs to CSV
 */
router.get('/export', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { startDate, endDate } = req.query;

        const logs = await AuditLogService.query({
            tenantId,
            startDate,
            endDate,
            limit: 10000, // Max 10k records for export
            offset: 0
        });

        // Convert to CSV
        const csvHeaders = [
            'Timestamp',
            'User',
            'Action',
            'Category',
            'Resource Type',
            'Resource ID',
            'Status',
            'Severity',
            'IP Address'
        ].join(',');

        const csvRows = logs.map(log => [
            log.created_at,
            log.actor_email || 'System',
            log.action,
            log.category,
            log.resource_type || '',
            log.resource_id || '',
            log.status,
            log.severity,
            log.ip_address || ''
        ].map(field => `"${field}"`).join(','));

        const csv = [csvHeaders, ...csvRows].join('\n');

        // Log the export action
        await AuditLogService.log({
            tenantId,
            userId: req.user.id,
            actorEmail: req.user.email,
            action: 'audit.export',
            category: 'data_access',
            severity: 'warning',
            metadata: { recordCount: logs.length, startDate, endDate },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        return res.send(csv);
    } catch (error) {
        logger.error('[Audit API] Export failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to export audit logs'
        });
    }
});

module.exports = router;
