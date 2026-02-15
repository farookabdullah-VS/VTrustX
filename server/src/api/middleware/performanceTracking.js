/**
 * Performance Tracking Middleware
 * Automatically tracks response times for all API endpoints
 */

const performanceMonitor = require('../../infrastructure/monitoring/PerformanceMonitor');
const logger = require('../../infrastructure/logger');

/**
 * Middleware to track API performance
 */
function performanceTracking(req, res, next) {
    const startTime = Date.now();

    // Extract tenant ID from request (if authenticated)
    const tenantId = req.user?.tenant_id || null;

    // Store original end function
    const originalEnd = res.end;

    // Override res.end to capture when response is sent
    res.end = function (...args) {
        // Calculate duration
        const duration = Date.now() - startTime;

        // Get endpoint path (without query params)
        const endpoint = req.route?.path || req.path || 'unknown';
        const method = req.method;
        const statusCode = res.statusCode;

        // Track the metric
        performanceMonitor.trackApiCall(endpoint, method, duration, statusCode, tenantId);

        // Log slow requests (> 5 seconds)
        if (duration > 5000) {
            logger.warn('[Performance] Very slow request detected', {
                endpoint,
                method,
                duration: `${duration}ms`,
                statusCode,
                tenantId,
                userAgent: req.get('user-agent')
            });
        }

        // Call original end function
        originalEnd.apply(res, args);
    };

    next();
}

/**
 * Middleware to track database query performance
 * Wraps database query function
 */
function wrapDatabaseQuery(originalQuery) {
    return async function wrappedQuery(queryText, params, client) {
        const startTime = Date.now();

        try {
            const result = await originalQuery.call(this, queryText, params, client);
            const duration = Date.now() - startTime;

            // Track query performance
            performanceMonitor.trackDatabaseQuery(queryText, duration);

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            performanceMonitor.trackDatabaseQuery(queryText, duration);
            throw error;
        }
    };
}

module.exports = {
    performanceTracking,
    wrapDatabaseQuery
};
