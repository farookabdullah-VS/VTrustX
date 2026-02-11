const { createTestApp, generateTestToken, JWT_SECRET } = require('../../../test/helpers');
const supertest = require('supertest');

// Mock database
jest.mock('../../../infrastructure/database/db', () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('../../../infrastructure/database/PostgresRepository', () => {
    return jest.fn().mockImplementation(() => ({
        findById: jest.fn().mockImplementation((id) => {
            if (id === 1) {
                return Promise.resolve({
                    id: 1,
                    username: 'testuser',
                    role: 'admin',
                    tenant_id: 'tenant-1',
                    role_id: null,
                });
            }
            return Promise.resolve(null);
        }),
    }));
});

jest.mock('../../../infrastructure/cache', () => ({
    authCache: {
        get: jest.fn().mockReturnValue(null),
        set: jest.fn(),
        del: jest.fn(),
    },
    tenantCache: {
        get: jest.fn().mockReturnValue(null),
        set: jest.fn(),
        del: jest.fn(),
    },
}));

const authenticate = require('../auth');

describe('Auth Middleware', () => {
    let app, request;

    beforeEach(() => {
        app = createTestApp();
        app.get('/protected', authenticate, (req, res) => {
            res.json({ user: req.user.username });
        });
        request = supertest(app);
    });

    describe('Cookie token', () => {
        it('should authenticate with access_token cookie', async () => {
            const token = generateTestToken({ id: 1 });
            const res = await request
                .get('/protected')
                .set('Cookie', `access_token=${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toBe('testuser');
        });
    });

    describe('Bearer token', () => {
        it('should authenticate with Authorization header', async () => {
            const token = generateTestToken({ id: 1 });
            const res = await request
                .get('/protected')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toBe('testuser');
        });
    });

    describe('Missing token', () => {
        it('should return 401 when no token provided', async () => {
            const res = await request.get('/protected');
            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/No token/i);
        });
    });

    describe('Expired token', () => {
        it('should return 401 for expired token', async () => {
            const jwt = require('jsonwebtoken');
            const expiredToken = jwt.sign(
                { id: 1, username: 'test', role: 'admin', tenant_id: 't1' },
                JWT_SECRET,
                { expiresIn: '-1h' }
            );

            const res = await request
                .get('/protected')
                .set('Cookie', `access_token=${expiredToken}`);

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/Invalid or expired/i);
        });
    });

    describe('Invalid token', () => {
        it('should return 401 for malformed token', async () => {
            const res = await request
                .get('/protected')
                .set('Authorization', 'Bearer invalid.token.here');

            expect(res.status).toBe(401);
        });
    });

    describe('User not found', () => {
        it('should return 401 when user ID not in DB', async () => {
            const token = generateTestToken({ id: 999 });
            const res = await request
                .get('/protected')
                .set('Cookie', `access_token=${token}`);

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/User not found/i);
        });
    });

    describe('Permission checks', () => {
        it('should pass when user has required permission', async () => {
            app.get('/perm-test',
                authenticate,
                authenticate.checkPermission('forms', 'view'),
                (req, res) => res.json({ ok: true })
            );

            const token = generateTestToken({ id: 1 });
            const res = await request
                .get('/perm-test')
                .set('Cookie', `access_token=${token}`);

            expect(res.status).toBe(200);
        });

        it('should deny when user lacks permission', async () => {
            // Override user permissions for this test
            const { authCache } = require('../../../infrastructure/cache');
            authCache.get.mockReturnValueOnce({
                id: 1,
                username: 'testuser',
                role: 'viewer',
                tenant_id: 'tenant-1',
                permissions: { forms: { view: true, create: false } },
            });

            app.get('/perm-deny',
                authenticate,
                authenticate.checkPermission('forms', 'delete'),
                (req, res) => res.json({ ok: true })
            );

            const token = generateTestToken({ id: 1 });
            const res = await request
                .get('/perm-deny')
                .set('Cookie', `access_token=${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('Cache', () => {
        it('should use cached user on subsequent requests', async () => {
            const { authCache } = require('../../../infrastructure/cache');
            const cachedUser = {
                id: 1,
                username: 'cached-user',
                role: 'admin',
                tenant_id: 'tenant-1',
                permissions: { forms: { view: true, create: true, update: true, delete: true } },
            };
            authCache.get.mockReturnValueOnce(cachedUser);

            const token = generateTestToken({ id: 1 });
            const res = await request
                .get('/protected')
                .set('Cookie', `access_token=${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toBe('cached-user');
        });
    });
});
