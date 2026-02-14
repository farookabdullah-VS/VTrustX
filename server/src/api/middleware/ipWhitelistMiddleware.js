const IPWhitelistService = require('../../services/IPWhitelistService');
const logger = require('../../infrastructure/logger');

/**
 * IP Whitelist Middleware
 *
 * Checks incoming requests against tenant IP whitelist rules.
 * Can be applied globally or to specific routes.
 *
 * Usage:
 * - Global: app.use(ipWhitelistMiddleware())
 * - Route-specific: router.post('/sensitive', ipWhitelistMiddleware(), handler)
 */

/**
 * Create IP whitelist middleware
 *
 * @param {object} options - Middleware options
 * @returns {Function} - Express middleware
 */
function ipWhitelistMiddleware(options = {}) {
    const {
        skipPublicRoutes = true,
        publicPaths = [
            '/health',
            '/ready',
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/csrf-token',
            '/api/auth/refresh',
            '/api/webhooks',
            '/public'
        ]
    } = options;

    return async (req, res, next) => {
        try {
            // Skip health checks and public routes
            if (skipPublicRoutes && publicPaths.some(path => req.path.startsWith(path))) {
                return next();
            }

            // Skip if user not authenticated (let auth middleware handle)
            if (!req.user || !req.user.tenant_id) {
                return next();
            }

            // Get client IP address
            const ipAddress = getClientIP(req);

            if (!ipAddress) {
                logger.warn('[IPWhitelistMiddleware] Could not determine client IP', {
                    path: req.path,
                    user: req.user?.id
                });
                return next();
            }

            // Check IP access
            const accessCheck = await IPWhitelistService.checkIPAccess(
                req.user.tenant_id,
                ipAddress,
                {
                    userRole: req.user.role,
                    userId: req.user.id,
                    requestPath: req.originalUrl || req.url,
                    userAgent: req.headers['user-agent']
                }
            );

            if (!accessCheck.allowed) {
                logger.warn('[IPWhitelistMiddleware] IP access denied', {
                    tenantId: req.user.tenant_id,
                    userId: req.user.id,
                    ipAddress,
                    reason: accessCheck.reason,
                    path: req.path
                });

                return res.status(403).json({
                    error: 'Access denied',
                    message: 'Your IP address is not whitelisted for this tenant',
                    reason: accessCheck.reason,
                    ipAddress: ipAddress,
                    help: 'Please contact your administrator to whitelist your IP address'
                });
            }

            // Access allowed - continue
            req.ipWhitelistCheck = accessCheck;
            next();
        } catch (error) {
            logger.error('[IPWhitelistMiddleware] Middleware failed', {
                error: error.message,
                path: req.path,
                user: req.user?.id
            });

            // Fail-open: Allow access if middleware fails
            next();
        }
    };
}

/**
 * Get client IP address from request
 * Handles various proxy configurations
 *
 * @param {object} req - Express request
 * @returns {string} - Client IP address
 */
function getClientIP(req) {
    // Check common headers for proxied requests
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // x-forwarded-for can be a comma-separated list, take the first IP
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }

    // Cloudflare
    const cfConnectingIP = req.headers['cf-connecting-ip'];
    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    // AWS ELB
    const awsClientIP = req.headers['x-forwarded-for'];
    if (awsClientIP) {
        return awsClientIP.split(',')[0].trim();
    }

    // Express built-in
    if (req.ip) {
        // Remove IPv6 prefix if present
        return req.ip.replace(/^::ffff:/, '');
    }

    // Socket remote address (fallback)
    if (req.connection && req.connection.remoteAddress) {
        return req.connection.remoteAddress.replace(/^::ffff:/, '');
    }

    return null;
}

/**
 * Middleware specifically for admin-only routes
 * Enforces IP whitelist even if enforcement_mode is 'monitor'
 */
function ipWhitelistStrict(options = {}) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.tenant_id) {
                return next();
            }

            const ipAddress = getClientIP(req);
            if (!ipAddress) {
                return next();
            }

            // Always enforce for strict mode
            const accessCheck = await IPWhitelistService.checkIPAccess(
                req.user.tenant_id,
                ipAddress,
                {
                    userRole: req.user.role,
                    userId: req.user.id,
                    requestPath: req.originalUrl || req.url,
                    userAgent: req.headers['user-agent']
                }
            );

            // Force deny if not explicitly allowed
            if (!accessCheck.allowed || accessCheck.reason === 'check_failed') {
                logger.warn('[IPWhitelistMiddleware:Strict] IP access denied', {
                    tenantId: req.user.tenant_id,
                    userId: req.user.id,
                    ipAddress,
                    reason: accessCheck.reason
                });

                return res.status(403).json({
                    error: 'Access denied',
                    message: 'Your IP address must be whitelisted to access this resource',
                    ipAddress: ipAddress
                });
            }

            req.ipWhitelistCheck = accessCheck;
            next();
        } catch (error) {
            logger.error('[IPWhitelistMiddleware:Strict] Middleware failed', {
                error: error.message,
                path: req.path
            });

            // Fail-closed for strict mode: Deny access if check fails
            return res.status(500).json({
                error: 'Security check failed',
                message: 'Unable to verify IP whitelist status'
            });
        }
    };
}

module.exports = {
    ipWhitelistMiddleware,
    ipWhitelistStrict,
    getClientIP
};
