const { query } = require('../../infrastructure/database/db');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');
const { authCache, tenantCache } = require('../../infrastructure/cache');

const jwt = require('jsonwebtoken');

// Real JWT Authentication with caching
// Reads token from httpOnly cookie first, falls back to Authorization header (for mobile/Capacitor)
const authenticate = async (req, res, next) => {
    try {
        let token = null;

        // 1. Try httpOnly cookie first
        if (req.cookies?.access_token) {
            token = req.cookies.access_token;
        }

        // 2. Fall back to Authorization header (mobile/Capacitor)
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) return res.status(401).json({ error: 'No token provided' });

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
        }

        // Verify Token
        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const userId = decoded.id;

        // Check auth cache first (user + permissions cached for 60s)
        const cacheKey = `${userId}`;
        let user = await authCache.get(cacheKey);

        if (!user) {
            user = await userRepo.findById(userId);
            if (!user) return res.status(401).json({ error: 'User not found' });

            // Fetch permissions if role_id exists
            user.permissions = {};
            if (user.role_id) {
                const roleRes = await query('SELECT permissions FROM roles WHERE id = $1', [user.role_id]);
                if (roleRes.rows.length > 0) {
                    user.permissions = roleRes.rows[0].permissions;
                }
            } else {
                // Fallback for legacy roles (admin/user)
                if (user.role === 'admin' || user.role === 'global_admin') {
                    user.permissions = {
                        forms: { view: true, create: true, update: true, delete: true },
                        users: { view: true, create: true, update: true, delete: true },
                        roles: { view: true, create: true, update: true, delete: true },
                        analytics: { view: true, create: true, update: true, delete: true },
                        contacts: { view: true, create: true, update: true, delete: true },
                        crm: { view: true, create: true, update: true, delete: true }
                    };
                } else {
                    user.permissions = {
                        forms: { view: true, create: false, update: false, delete: false },
                        users: { view: false, create: false, update: false, delete: false },
                        roles: { view: false, create: false, update: false, delete: false },
                        analytics: { view: true, create: false, update: false, delete: false },
                        contacts: { view: false, create: false, update: false, delete: false },
                        crm: { view: false, create: false, update: false, delete: false }
                    };
                }
            }

            // Cache for 60 seconds
            await authCache.set(cacheKey, user, 60);
        }

        req.user = user;

        // Fetch Tenant (cached for 5 minutes)
        if (user.tenant_id) {
            const tenantCacheKey = `${user.tenant_id}`;
            let tenant = await tenantCache.get(tenantCacheKey);

            if (!tenant) {
                tenant = await tenantRepo.findById(user.tenant_id);
                if (tenant) {
                    await tenantCache.set(tenantCacheKey, tenant, 300);
                }
            }

            req.tenant = tenant;

            // Check Subscription Expiry
            if (tenant && tenant.subscription_expires_at) {
                const expiry = new Date(tenant.subscription_expires_at);
                if (expiry < new Date()) {
                    if (user.role !== 'global_admin') {
                        return res.status(403).json({ error: 'Subscription expired. Please contact administrator.' });
                    }
                }
            }
        }

        next();
    } catch (err) {
        console.error("[AUTH_ERROR]", err);
        res.status(500).json({ error: err.message });
    }
};

authenticate.checkPermission = (module, action) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ error: 'Access denied: No permissions' });
        }

        const modPerms = req.user.permissions[module];
        if (!modPerms || !modPerms[action]) {
            return res.status(403).json({ error: `Access denied: Missing ${action} permission for ${module}` });
        }

        next();
    };
};

// Invalidate cache for a specific user (call on user/tenant update)
authenticate.invalidateUserCache = (userId) => {
    authCache.del(`auth:${userId}`);
};

authenticate.invalidateTenantCache = (tenantId) => {
    tenantCache.del(`tenant:${tenantId}`);
};

module.exports = authenticate;
