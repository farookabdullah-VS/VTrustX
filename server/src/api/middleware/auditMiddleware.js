const AuditLogService = require('../../services/AuditLogService');
const logger = require('../../infrastructure/logger');

/**
 * Audit Middleware
 *
 * Automatically logs API requests for audit trail.
 * Captures request details, user info, and response status.
 *
 * Usage:
 * - Apply to specific routes: router.post('/resource', auditLog('resource.create', 'data_modification'), handler)
 * - Apply globally: app.use(auditMiddleware())
 */

/**
 * Create audit log middleware for specific actions
 *
 * @param {string} action - Action name (e.g., 'form.create')
 * @param {string} category - Category (authentication, data_modification, etc.)
 * @param {object} options - Additional options
 * @returns {Function} - Express middleware
 */
function auditLog(action, category, options = {}) {
    return async (req, res, next) => {
        const originalSend = res.send;
        const startTime = Date.now();

        // Capture response
        res.send = function (data) {
            res.send = originalSend;

            // Log audit event after response
            setImmediate(async () => {
                try {
                    const duration = Date.now() - startTime;
                    const status = res.statusCode < 400 ? 'success' : 'failure';
                    const severity = res.statusCode >= 500 ? 'critical' :
                                   res.statusCode >= 400 ? 'warning' : 'info';

                    await AuditLogService.log({
                        tenantId: req.user?.tenant_id,
                        userId: req.user?.id,
                        actorEmail: req.user?.email,
                        actorName: req.user?.name || req.user?.username,
                        action,
                        category,
                        resourceType: options.resourceType,
                        resourceId: options.getResourceId ? options.getResourceId(req, data) : req.params.id,
                        resourceName: options.getResourceName ? options.getResourceName(req, data) : null,
                        status,
                        severity,
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.headers['user-agent'],
                        requestMethod: req.method,
                        requestPath: req.originalUrl || req.url,
                        changes: options.getChanges ? options.getChanges(req, data) : null,
                        metadata: {
                            duration,
                            statusCode: res.statusCode,
                            ...(options.getMetadata ? options.getMetadata(req, data) : {})
                        },
                        errorMessage: status === 'failure' && data ? extractErrorMessage(data) : null,
                        sessionId: req.sessionID || req.cookies?.session_id
                    });
                } catch (error) {
                    logger.error('[Audit Middleware] Failed to log', {
                        error: error.message,
                        action
                    });
                }
            });

            return originalSend.call(this, data);
        };

        next();
    };
}

/**
 * Global audit middleware - logs all authenticated requests
 *
 * @param {object} options - Configuration options
 * @returns {Function} - Express middleware
 */
function auditMiddleware(options = {}) {
    const {
        skipPaths = ['/health', '/ready', '/api/auth/csrf-token'],
        skipMethods = ['GET', 'HEAD', 'OPTIONS'],
        onlyAuthenticated = true
    } = options;

    return async (req, res, next) => {
        // Skip health checks and non-modifying methods
        if (skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        if (skipMethods.includes(req.method)) {
            return next();
        }

        // Skip if only authenticated and user not present
        if (onlyAuthenticated && !req.user) {
            return next();
        }

        const originalSend = res.send;
        const startTime = Date.now();

        // Capture response
        res.send = function (data) {
            res.send = originalSend;

            // Log audit event after response
            setImmediate(async () => {
                try {
                    const duration = Date.now() - startTime;
                    const status = res.statusCode < 400 ? 'success' : 'failure';
                    const severity = res.statusCode >= 500 ? 'critical' :
                                   res.statusCode >= 400 ? 'warning' : 'info';

                    // Infer action and category from request
                    const { action, category, resourceType } = inferActionFromRequest(req);

                    await AuditLogService.log({
                        tenantId: req.user?.tenant_id,
                        userId: req.user?.id,
                        actorEmail: req.user?.email,
                        actorName: req.user?.name || req.user?.username,
                        action,
                        category,
                        resourceType,
                        resourceId: req.params.id,
                        status,
                        severity,
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.headers['user-agent'],
                        requestMethod: req.method,
                        requestPath: req.originalUrl || req.url,
                        metadata: {
                            duration,
                            statusCode: res.statusCode
                        },
                        errorMessage: status === 'failure' && data ? extractErrorMessage(data) : null,
                        sessionId: req.sessionID || req.cookies?.session_id
                    });
                } catch (error) {
                    logger.error('[Audit Middleware] Failed to log', {
                        error: error.message,
                        path: req.path
                    });
                }
            });

            return originalSend.call(this, data);
        };

        next();
    };
}

/**
 * Infer action and category from HTTP request
 */
function inferActionFromRequest(req) {
    const pathParts = req.path.split('/').filter(Boolean);
    const resourceType = pathParts[1]; // e.g., /api/forms -> 'forms'

    let action = `${resourceType}.${req.method.toLowerCase()}`;
    let category = 'data_access';

    switch (req.method) {
        case 'POST':
            action = `${resourceType}.create`;
            category = 'data_modification';
            break;
        case 'PUT':
        case 'PATCH':
            action = `${resourceType}.update`;
            category = 'data_modification';
            break;
        case 'DELETE':
            action = `${resourceType}.delete`;
            category = 'data_modification';
            break;
        case 'GET':
            if (req.path.includes('/export')) {
                action = `${resourceType}.export`;
                category = 'data_access';
            } else {
                action = `${resourceType}.view`;
                category = 'data_access';
            }
            break;
    }

    return { action, category, resourceType };
}

/**
 * Extract error message from response data
 */
function extractErrorMessage(data) {
    try {
        if (typeof data === 'string') {
            const parsed = JSON.parse(data);
            return parsed.error || parsed.message || null;
        }
        if (data && typeof data === 'object') {
            return data.error || data.message || null;
        }
    } catch (e) {
        // Ignore JSON parse errors
    }
    return null;
}

/**
 * Audit decorator for route handlers
 * Wraps a route handler to add audit logging
 */
function withAudit(action, category, options = {}) {
    return (handler) => {
        return async (req, res, next) => {
            // Add audit logging
            const middleware = auditLog(action, category, options);
            await middleware(req, res, () => {});

            // Execute handler
            return handler(req, res, next);
        };
    };
}

module.exports = {
    auditLog,
    auditMiddleware,
    withAudit
};
