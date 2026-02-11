const request = require('supertest');
const { createTestApp, generateTestToken, mockAuthenticate } = require('../../../test/helpers');

// Mock dependencies
const mockQuery = jest.fn();
const mockFindAllBy = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../../infrastructure/database/PostgresRepository', () => {
    return jest.fn().mockImplementation(() => ({
        findAllBy: mockFindAllBy,
        findById: mockFindById,
        findBy: jest.fn(),
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
        withClient: jest.fn().mockReturnThis(),
    }));
});

jest.mock('../../../infrastructure/database/db', () => ({
    query: mockQuery,
    transaction: jest.fn((cb) => cb({ query: mockQuery })),
}));

jest.mock('../../../infrastructure/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

jest.mock('../../../infrastructure/cache', () => ({
    rateLimitCache: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('../../middleware/auth', () => {
    const mock = require('../../../test/helpers').mockAuthenticate;
    return mock;
});

jest.mock('../debug_logger', () => jest.fn());

const formsRouter = require('../forms');

describe('Forms Routes', () => {
    let app;
    let token;

    beforeEach(() => {
        app = createTestApp();
        app.use('/api/forms', formsRouter);
        token = generateTestToken();
        mockQuery.mockReset();
        mockFindAllBy.mockReset();
        mockFindById.mockReset();
        mockCreate.mockReset();
        mockUpdate.mockReset();
        mockDelete.mockReset();
    });

    describe('GET / (list forms)', () => {
        it('should return all forms for tenant', async () => {
            mockFindAllBy.mockResolvedValue([
                { id: 1, title: 'Form A', tenant_id: 'test-tenant-1', is_published: true },
                { id: 2, title: 'Form B', tenant_id: 'test-tenant-1', is_published: false },
            ]);

            const res = await request(app)
                .get('/api/forms')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/forms');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /:id (get form)', () => {
        it('should return a form by id', async () => {
            mockFindById.mockResolvedValue({
                id: 1,
                title: 'Test Form',
                tenant_id: 'test-tenant-1',
                is_published: true,
                definition: { fields: [] },
            });

            const res = await request(app)
                .get('/api/forms/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Test Form');
        });

        it('should return 404 for wrong tenant', async () => {
            mockFindById.mockResolvedValue({
                id: 1,
                title: 'Test Form',
                tenant_id: 'other-tenant',
            });

            const res = await request(app)
                .get('/api/forms/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should return 404 when not found', async () => {
            mockFindById.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/forms/999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST / (create form)', () => {
        it('should create a form', async () => {
            mockCreate.mockResolvedValue({
                id: 1,
                title: 'New Form',
                tenant_id: 'test-tenant-1',
                is_published: false,
            });

            const res = await request(app)
                .post('/api/forms')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'New Form', definition: { fields: [] } });

            expect(res.status).toBe(201);
        });
    });

    describe('DELETE /:id (delete form)', () => {
        it('should delete a form owned by tenant', async () => {
            mockFindById.mockResolvedValue({
                id: 1,
                title: 'Test Form',
                tenant_id: 'test-tenant-1',
            });
            mockDelete.mockResolvedValue(true);
            mockQuery.mockResolvedValueOnce({ rows: [] }); // cascade delete submissions

            const res = await request(app)
                .delete('/api/forms/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(204);
        });

        it('should return 404 for wrong tenant', async () => {
            mockFindById.mockResolvedValue({
                id: 1,
                tenant_id: 'other-tenant',
            });

            const res = await request(app)
                .delete('/api/forms/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});
