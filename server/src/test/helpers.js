const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-production';

/**
 * Generate a test JWT token.
 */
function generateTestToken(payload = {}) {
    const defaults = {
        id: 1,
        username: 'testuser',
        role: 'admin',
        tenant_id: 'test-tenant-1',
    };
    return jwt.sign({ ...defaults, ...payload }, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Mock authenticate middleware — skips real DB lookup.
 * Attaches decoded token directly as req.user.
 */
function mockAuthenticate(req, res, next) {
    let token = req.cookies?.access_token;
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader) token = authHeader.split(' ')[1];
    }

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            ...decoded,
            permissions: { forms: { view: true, create: true, update: true, delete: true } },
        };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

mockAuthenticate.checkPermission = () => (req, res, next) => next();
mockAuthenticate.invalidateUserCache = () => {};
mockAuthenticate.invalidateTenantCache = () => {};

/**
 * Create a minimal Express app for testing.
 */
function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    return app;
}

module.exports = {
    generateTestToken,
    mockAuthenticate,
    createTestApp,
    JWT_SECRET,
};
