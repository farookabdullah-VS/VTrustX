/**
 * Performance Monitoring API Routes
 * Provides endpoints for viewing performance metrics and statistics
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const performanceMonitor = require('../../infrastructure/monitoring/PerformanceMonitor');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

/**
 * GET /api/performance/metrics
 * Get current in-memory metrics summary
 */
router.get('/metrics', authenticate, requireRole('admin'), (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();

        res.json({
            success: true,
            metrics,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('[Performance API] Failed to get metrics', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve metrics'
        });
    }
});

/**
 * GET /api/performance/statistics
 * Get detailed performance statistics for a time period
 */
router.get('/statistics', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { hours = 24, tenant_id } = req.query;
        const hoursNum = parseInt(hours, 10) || 24;

        // Admins can view all tenants, regular users only their own
        const tenantId = req.user.role === 'super_admin' && tenant_id
            ? parseInt(tenant_id, 10)
            : req.user.tenant_id;

        const statistics = await performanceMonitor.getStatistics(tenantId, hoursNum);

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        logger.error('[Performance API] Failed to get statistics', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
});

/**
 * GET /api/performance/slowest
 * Get slowest API endpoints
 */
router.get('/slowest', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { limit = 10, hours = 24 } = req.query;
        const limitNum = parseInt(limit, 10) || 10;
        const hoursNum = parseInt(hours, 10) || 24;

        const slowest = await performanceMonitor.getSlowestEndpoints(limitNum, hoursNum);

        res.json({
            success: true,
            data: slowest,
            period: `${hoursNum} hours`
        });
    } catch (error) {
        logger.error('[Performance API] Failed to get slowest endpoints', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve slowest endpoints'
        });
    }
});

/**
 * GET /api/performance/alerts
 * Get performance alerts
 */
router.get('/alerts', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { resolved = false, severity, limit = 50 } = req.query;
        const tenantId = req.user.role === 'super_admin' ? req.query.tenant_id : req.user.tenant_id;

        let queryText = `
            SELECT *
            FROM performance_alerts
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (resolved !== 'all') {
            queryText += ` AND resolved = $${paramIndex++}`;
            params.push(resolved === 'true' || resolved === true);
        }

        if (severity) {
            queryText += ` AND severity = $${paramIndex++}`;
            params.push(severity);
        }

        if (tenantId) {
            queryText += ` AND (tenant_id = $${paramIndex++} OR tenant_id IS NULL)`;
            params.push(tenantId);
        }

        queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit, 10));

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        logger.error('[Performance API] Failed to get alerts', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve alerts'
        });
    }
});

/**
 * PUT /api/performance/alerts/:id/resolve
 * Mark an alert as resolved
 */
router.put('/alerts/:id/resolve', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            UPDATE performance_alerts
            SET resolved = true, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('[Performance API] Failed to resolve alert', { error: error.message, alertId: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Failed to resolve alert'
        });
    }
});

/**
 * GET /api/performance/timeline
 * Get performance metrics over time (for charts)
 */
router.get('/timeline', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { hours = 24, interval = 'hour' } = req.query;
        const hoursNum = parseInt(hours, 10) || 24;
        const tenantId = req.user.role === 'super_admin' ? req.query.tenant_id : req.user.tenant_id;

        // Determine time bucket size
        const timeFormat = interval === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH24:00:00';
        const timeTrunc = interval === 'day' ? 'day' : 'hour';

        const sinceTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

        const result = await query(`
            SELECT
                DATE_TRUNC($1, timestamp) as time_bucket,
                metric_type,
                COUNT(*) as count,
                AVG(duration) as avg_duration,
                MAX(duration) as max_duration,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
            FROM performance_metrics
            WHERE timestamp >= $2
                ${tenantId ? 'AND tenant_id = $3' : ''}
            GROUP BY time_bucket, metric_type
            ORDER BY time_bucket ASC
        `, tenantId ? [timeTrunc, sinceTime, tenantId] : [timeTrunc, sinceTime]);

        res.json({
            success: true,
            data: result.rows,
            period: `${hoursNum} hours`,
            interval
        });
    } catch (error) {
        logger.error('[Performance API] Failed to get timeline', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve timeline data'
        });
    }
});

/**
 * DELETE /api/performance/metrics
 * Clear in-memory metrics (keeps database records)
 */
router.delete('/metrics', authenticate, requireRole('super_admin'), (req, res) => {
    try {
        performanceMonitor.clearMetrics();

        res.json({
            success: true,
            message: 'In-memory metrics cleared'
        });
    } catch (error) {
        logger.error('[Performance API] Failed to clear metrics', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to clear metrics'
        });
    }
});

/**
 * GET /api/performance/system
 * Get current system resource usage
 */
router.get('/system', authenticate, requireRole('admin'), (req, res) => {
    try {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        const systemInfo = {
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                external: Math.round(memoryUsage.external / 1024 / 1024), // MB
                heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
            },
            cpu: {
                user: Math.round(cpuUsage.user / 1000), // milliseconds
                system: Math.round(cpuUsage.system / 1000) // milliseconds
            },
            uptime: {
                seconds: Math.round(process.uptime()),
                formatted: formatUptime(process.uptime())
            },
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        res.json({
            success: true,
            data: systemInfo,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('[Performance API] Failed to get system info', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve system information'
        });
    }
});

/**
 * Helper function to format uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
}

module.exports = router;
