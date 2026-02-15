/**
 * Performance Monitoring Service
 * Tracks API response times, database queries, and system metrics
 */

const { query } = require('../database/db');
const logger = require('../logger');

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.slowQueryThreshold = 1000; // 1 second
        this.slowApiThreshold = 2000; // 2 seconds
    }

    /**
     * Track API endpoint performance
     */
    trackApiCall(endpoint, method, duration, statusCode, tenantId = null) {
        const metricKey = `api:${method}:${endpoint}`;

        if (!this.metrics.has(metricKey)) {
            this.metrics.set(metricKey, {
                count: 0,
                totalDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                errors: 0,
                slowRequests: 0
            });
        }

        const metric = this.metrics.get(metricKey);
        metric.count++;
        metric.totalDuration += duration;
        metric.minDuration = Math.min(metric.minDuration, duration);
        metric.maxDuration = Math.max(metric.maxDuration, duration);

        if (statusCode >= 400) {
            metric.errors++;
        }

        if (duration > this.slowApiThreshold) {
            metric.slowRequests++;
            logger.warn('[PerformanceMonitor] Slow API request detected', {
                endpoint,
                method,
                duration: `${duration}ms`,
                statusCode,
                tenantId
            });
        }

        // Store in database asynchronously (fire and forget)
        this.persistMetric('api_call', {
            endpoint,
            method,
            duration,
            status_code: statusCode,
            tenant_id: tenantId,
            timestamp: new Date()
        }).catch(err => {
            logger.error('[PerformanceMonitor] Failed to persist API metric', { error: err.message });
        });
    }

    /**
     * Track database query performance
     */
    trackDatabaseQuery(queryText, duration, tenantId = null) {
        const metricKey = 'db:query';

        if (!this.metrics.has(metricKey)) {
            this.metrics.set(metricKey, {
                count: 0,
                totalDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                slowQueries: 0
            });
        }

        const metric = this.metrics.get(metricKey);
        metric.count++;
        metric.totalDuration += duration;
        metric.minDuration = Math.min(metric.minDuration, duration);
        metric.maxDuration = Math.max(metric.maxDuration, duration);

        if (duration > this.slowQueryThreshold) {
            metric.slowQueries++;

            // Extract table name from query
            const tableMatch = queryText.match(/FROM\s+(\w+)|UPDATE\s+(\w+)|INSERT INTO\s+(\w+)/i);
            const table = tableMatch ? (tableMatch[1] || tableMatch[2] || tableMatch[3]) : 'unknown';

            logger.warn('[PerformanceMonitor] Slow database query detected', {
                table,
                duration: `${duration}ms`,
                query: queryText.substring(0, 200), // First 200 chars
                tenantId
            });

            // Store slow queries for analysis
            this.persistMetric('slow_query', {
                query_text: queryText.substring(0, 1000),
                duration,
                table_name: table,
                tenant_id: tenantId,
                timestamp: new Date()
            }).catch(err => {
                logger.error('[PerformanceMonitor] Failed to persist slow query', { error: err.message });
            });
        }
    }

    /**
     * Track custom performance metric
     */
    trackCustomMetric(category, name, value, metadata = {}) {
        const metricKey = `custom:${category}:${name}`;

        if (!this.metrics.has(metricKey)) {
            this.metrics.set(metricKey, {
                count: 0,
                totalValue: 0,
                minValue: Infinity,
                maxValue: 0
            });
        }

        const metric = this.metrics.get(metricKey);
        metric.count++;
        metric.totalValue += value;
        metric.minValue = Math.min(metric.minValue, value);
        metric.maxValue = Math.max(metric.maxValue, value);

        // Store in database
        this.persistMetric('custom_metric', {
            category,
            metric_name: name,
            value,
            metadata: JSON.stringify(metadata),
            timestamp: new Date()
        }).catch(err => {
            logger.error('[PerformanceMonitor] Failed to persist custom metric', { error: err.message });
        });
    }

    /**
     * Get current metrics summary
     */
    getMetrics() {
        const summary = {};

        for (const [key, metric] of this.metrics.entries()) {
            const avgDuration = metric.totalDuration ? metric.totalDuration / metric.count : 0;
            const avgValue = metric.totalValue !== undefined ? metric.totalValue / metric.count : 0;

            summary[key] = {
                count: metric.count,
                average: avgDuration || avgValue,
                min: metric.minDuration !== Infinity ? metric.minDuration : (metric.minValue !== Infinity ? metric.minValue : 0),
                max: metric.maxDuration || metric.maxValue || 0,
                errors: metric.errors || 0,
                slowRequests: metric.slowRequests || 0,
                slowQueries: metric.slowQueries || 0
            };
        }

        return summary;
    }

    /**
     * Get performance statistics for a time period
     */
    async getStatistics(tenantId = null, hours = 24) {
        try {
            const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);

            // API performance stats
            const apiStats = await query(`
                SELECT
                    endpoint,
                    method,
                    COUNT(*) as request_count,
                    AVG(duration) as avg_duration,
                    MIN(duration) as min_duration,
                    MAX(duration) as max_duration,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration,
                    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
                    COUNT(CASE WHEN duration > $1 THEN 1 END) as slow_count
                FROM performance_metrics
                WHERE metric_type = 'api_call'
                    AND timestamp >= $2
                    ${tenantId ? 'AND tenant_id = $3' : ''}
                GROUP BY endpoint, method
                ORDER BY request_count DESC
                LIMIT 50
            `, tenantId ? [this.slowApiThreshold, sinceTime, tenantId] : [this.slowApiThreshold, sinceTime]);

            // Database performance stats
            const dbStats = await query(`
                SELECT
                    table_name,
                    COUNT(*) as query_count,
                    AVG(duration) as avg_duration,
                    MAX(duration) as max_duration,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration
                FROM performance_metrics
                WHERE metric_type = 'slow_query'
                    AND timestamp >= $1
                    ${tenantId ? 'AND tenant_id = $2' : ''}
                GROUP BY table_name
                ORDER BY query_count DESC
                LIMIT 20
            `, tenantId ? [sinceTime, tenantId] : [sinceTime]);

            // System resource usage
            const systemStats = {
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
                cpuUsage: process.cpuUsage()
            };

            return {
                api: apiStats.rows,
                database: dbStats.rows,
                system: systemStats,
                period: `${hours} hours`,
                generatedAt: new Date()
            };
        } catch (error) {
            logger.error('[PerformanceMonitor] Failed to get statistics', { error: error.message });
            throw error;
        }
    }

    /**
     * Get slowest endpoints
     */
    async getSlowestEndpoints(limit = 10, hours = 24) {
        const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        const result = await query(`
            SELECT
                endpoint,
                method,
                AVG(duration) as avg_duration,
                MAX(duration) as max_duration,
                COUNT(*) as request_count,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
            FROM performance_metrics
            WHERE metric_type = 'api_call'
                AND timestamp >= $1
            GROUP BY endpoint, method
            ORDER BY avg_duration DESC
            LIMIT $2
        `, [sinceTime, limit]);

        return result.rows;
    }

    /**
     * Clear in-memory metrics (keeps database records)
     */
    clearMetrics() {
        this.metrics.clear();
        logger.info('[PerformanceMonitor] In-memory metrics cleared');
    }

    /**
     * Persist metric to database
     */
    async persistMetric(metricType, data) {
        try {
            await query(`
                INSERT INTO performance_metrics (
                    metric_type,
                    endpoint,
                    method,
                    duration,
                    status_code,
                    query_text,
                    table_name,
                    category,
                    metric_name,
                    value,
                    metadata,
                    tenant_id,
                    timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                metricType,
                data.endpoint || null,
                data.method || null,
                data.duration || null,
                data.status_code || null,
                data.query_text || null,
                data.table_name || null,
                data.category || null,
                data.metric_name || null,
                data.value || null,
                data.metadata || null,
                data.tenant_id || null,
                data.timestamp
            ]);
        } catch (error) {
            // Don't throw - performance monitoring should not break the app
            logger.error('[PerformanceMonitor] Failed to persist metric', {
                error: error.message,
                metricType
            });
        }
    }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
