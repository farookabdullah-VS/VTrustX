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

/**
 * Create a mock database object with jest.fn() for query, connect, transaction.
 */
function mockDb(queryResults = { rows: [] }) {
    const mockClient = {
        query: jest.fn().mockResolvedValue(queryResults),
        release: jest.fn(),
    };
    return {
        query: jest.fn().mockResolvedValue(queryResults),
        connect: jest.fn().mockResolvedValue(mockClient),
        transaction: jest.fn().mockImplementation(async (cb) => cb(mockClient)),
        pool: { query: jest.fn().mockResolvedValue(queryResults) },
        _client: mockClient,
    };
}

/**
 * Create a mock PostgresRepository for a given table name.
 */
function mockRepository(tableName) {
    return {
        tableName,
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        findBy: jest.fn().mockResolvedValue(null),
        findAllBy: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(async (item) => ({ id: 1, ...item })),
        update: jest.fn().mockImplementation(async (id, item) => ({ id, ...item })),
        delete: jest.fn().mockResolvedValue(true),
        withClient: jest.fn().mockReturnThis(),
        validateKey: jest.fn().mockImplementation((k) => k),
    };
}

/**
 * Create a standardized mock request object.
 */
function createMockReq(overrides = {}) {
    return {
        user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'admin',
            tenant_id: 'test-tenant-1',
        },
        params: {},
        query: {},
        body: {},
        cookies: {},
        headers: {},
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue(''),
        ...overrides,
    };
}

/**
 * Create a standardized mock response object with spy methods.
 */
function createMockRes() {
    const res = {
        statusCode: 200,
        _json: null,
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockImplementation(function (data) {
            res._json = data;
            return res;
        }),
        send: jest.fn().mockReturnThis(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
}

module.exports = {
    generateTestToken,
    mockAuthenticate,
    createTestApp,
    JWT_SECRET,
    mockDb,
    mockRepository,
    createMockReq,
    createMockRes,
};
