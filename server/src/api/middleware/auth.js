const { query } = require('../../infrastructure/database/db');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

// Mock Authentication (extracts ID from token)
// In production: Use jsonwebtoken.verify()
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        if (!token || !token.startsWith('mock-jwt-token-')) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const userId = token.replace('mock-jwt-token-', '');

        // Validate ID is an integer
        if (!userId || isNaN(parseInt(userId))) {
            return res.status(401).json({ error: 'Invalid User ID in token' });
        }

        const user = await userRepo.findById(userId);

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
                user.permissions = { forms: { view: true, create: true, update: true, delete: true } };
            } else {
                user.permissions = { forms: { view: true, create: false, update: false, delete: false } };
            }
        }

        req.user = user;

        // Fetch Tenant
        if (user.tenant_id) {
            const tenant = await tenantRepo.findById(user.tenant_id);
            req.tenant = tenant;

            // Check Subscription Expiry
            if (tenant && tenant.subscription_expires_at) {
                const expiry = new Date(tenant.subscription_expires_at);
                if (expiry < new Date()) {
                    // Allow global admin bypass or specific route bypasses here if needed
                    if (user.role !== 'global_admin' && user.username !== 'admin') {
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

module.exports = authenticate;
