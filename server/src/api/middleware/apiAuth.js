const APIKeyService = require('../../services/APIKeyService');
const logger = require('../../infrastructure/logger');

/**
 * API Key Authentication Middleware
 *
 * Validates API keys for public API access:
 * - Extracts API key from Authorization header (Bearer token)
 * - Validates key and retrieves tenant ID and scopes
 * - Attaches tenant and scope info to request object
 * - Handles rate limiting
 */

/**
 * Authenticate API key from Authorization header
 */
async function authenticateAPIKey(req, res, next) {
    try {
        // Extract API key from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'API key required. Use: Authorization: Bearer vx_live_...'
            });
        }

        const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Validate API key
        const keyData = await APIKeyService.validateAPIKey(apiKey);

        // Attach to request for use in controllers
        req.apiKey = {
            keyId: keyData.keyId,
            tenantId: keyData.tenantId,
            name: keyData.name,
            scopes: keyData.scopes,
            rateLimit: keyData.rateLimit
        };

        // Also set req.user.tenant_id for compatibility with existing code
        req.user = {
            tenant_id: keyData.tenantId,
            role: 'api_user',
            api_key_id: keyData.keyId
        };

        logger.debug('[API Auth] API key authenticated', {
            keyId: keyData.keyId,
            tenantId: keyData.tenantId
        });

        next();
    } catch (error) {
        logger.warn('[API Auth] Authentication failed', {
            error: error.message,
            ip: req.ip
        });

        return res.status(401).json({
            error: 'Unauthorized',
            message: error.message
        });
    }
}

/**
 * Require specific scope(s) for API endpoint
 *
 * @param {...string} requiredScopes - Required scope(s)
 * @returns {Function} - Express middleware
 *
 * @example
 * router.get('/forms', authenticateAPIKey, requireScope('forms:read'), handler);
 */
function requireScope(...requiredScopes) {
    return (req, res, next) => {
        if (!req.apiKey || !req.apiKey.scopes) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'No scopes found. API key may be invalid.'
            });
        }

        const keyScopes = req.apiKey.scopes;

        // Check if key has at least one of the required scopes
        const hasRequiredScope = requiredScopes.some(scope =>
            APIKeyService.hasScope(keyScopes, scope)
        );

        if (!hasRequiredScope) {
            logger.warn('[API Auth] Insufficient scopes', {
                keyId: req.apiKey.keyId,
                requiredScopes,
                keyScopes
            });

            return res.status(403).json({
                error: 'Forbidden',
                message: `This endpoint requires one of these scopes: ${requiredScopes.join(', ')}`,
                provided_scopes: keyScopes
            });
        }

        next();
    };
}

/**
 * Simple in-memory rate limiter for API keys
 * (In production, use Redis for distributed rate limiting)
 */
const rateLimitStore = new Map();

function rateLimit(req, res, next) {
    if (!req.apiKey) {
        return next();
    }

    const keyId = req.apiKey.keyId;
    const limit = req.apiKey.rateLimit;
    const windowMs = 60 * 60 * 1000; // 1 hour

    const now = Date.now();
    const keyData = rateLimitStore.get(keyId) || { count: 0, resetAt: now + windowMs };

    // Reset if window has passed
    if (now >= keyData.resetAt) {
        keyData.count = 0;
        keyData.resetAt = now + windowMs;
    }

    // Increment request count
    keyData.count++;
    rateLimitStore.set(keyId, keyData);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - keyData.count));
    res.setHeader('X-RateLimit-Reset', new Date(keyData.resetAt).toISOString());

    // Check if limit exceeded
    if (keyData.count > limit) {
        logger.warn('[API Auth] Rate limit exceeded', {
            keyId,
            limit,
            count: keyData.count
        });

        return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Maximum ${limit} requests per hour.`,
            retry_after: Math.ceil((keyData.resetAt - now) / 1000)
        });
    }

    next();
}

module.exports = {
    authenticateAPIKey,
    requireScope,
    rateLimit
};
