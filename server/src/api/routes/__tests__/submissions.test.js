const request = require('supertest');
const { createTestApp, generateTestToken, mockAuthenticate } = require('../../../test/helpers');

// Mock dependencies
const mockQuery = jest.fn();
const mockTransaction = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../../infrastructure/database/PostgresRepository', () => {
    return jest.fn().mockImplementation(() => ({
        findAll: jest.fn().mockResolvedValue([]),
        findById: mockFindById,
        findBy: jest.fn(),
        findAllBy: jest.fn().mockResolvedValue([]),
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
        withClient: jest.fn().mockReturnValue({
            create: mockCreate,
        }),
    }));
});

jest.mock('../../../infrastructure/database/db', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

jest.mock('../../../infrastructure/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

jest.mock('../../middleware/auth', () => require('../../../test/helpers').mockAuthenticate);

jest.mock('../../../core/workflowEngine', () => ({
    processSubmission: jest.fn(),
}));

const submissionsRouter = require('../submissions');

describe('Submissions Routes', () => {
    let app;
    let token;

    beforeEach(() => {
        app = createTestApp();
        app.use('/api/submissions', submissionsRouter);
        token = generateTestToken();
        mockQuery.mockReset();
        mockTransaction.mockReset();
        mockFindById.mockReset();
        mockCreate.mockReset();
        mockUpdate.mockReset();
        mockDelete.mockReset();
    });

    describe('GET / (list submissions)', () => {
        it('should return submissions for tenant', async () => {
            const subs = [
                { id: 1, form_id: 1, data: { q1: 'a' }, tenant_id: 'test-tenant-1', created_at: new Date() },
            ];
            mockQuery.mockResolvedValueOnce({ rows: subs });

            const res = await request(app)
                .get('/api/submissions')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        it('should filter by formId', async () => {
            // Form ownership check
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Submissions
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/submissions?formId=1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should return 404 if form not owned by tenant', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] }); // form check fails

            const res = await request(app)
                .get('/api/submissions?formId=999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/submissions');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /:id (get submission)', () => {
        it('should return a submission by id', async () => {
            mockFindById.mockResolvedValue({
                id: 1,
                form_id: 1,
                data: { q1: 'answer' },
                tenant_id: 'test-tenant-1',
                created_at: new Date(),
            });

            const res = await request(app)
                .get('/api/submissions/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ q1: 'answer' });
        });

        it('should return 404 for wrong tenant', async () => {
            mockFindById.mockResolvedValue({
                id: 1,
                tenant_id: 'other-tenant',
            });

            const res = await request(app)
                .get('/api/submissions/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should return 404 when not found', async () => {
            mockFindById.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/submissions/999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST / (create submission)', () => {
        it('should create a submission (no quotas)', async () => {
            const mockClient = {
                query: jest.fn()
                    // form check with lock
                    .mockResolvedValueOnce({ rows: [{ response_limit: null, tenant_id: 'test-tenant-1' }] })
                    // active quotas
                    .mockResolvedValueOnce({ rows: [] }),
            };
            const savedRow = { id: 1, form_id: 1, data: { q1: 'a' }, tenant_id: 'test-tenant-1', created_at: new Date() };
            mockCreate.mockResolvedValue(savedRow);
            mockTransaction.mockImplementation(async (cb) => {
                const result = await cb(mockClient);
                return result;
            });
            // AI providers query
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/submissions')
                .send({ formId: 1, data: { q1: 'a' } });

            expect(res.status).toBe(201);
        });

        it('should return 404 if form not found', async () => {
            const mockClient = {
                query: jest.fn().mockResolvedValueOnce({ rows: [] }), // form not found
            };
            mockTransaction.mockImplementation(async (cb) => cb(mockClient));

            const res = await request(app)
                .post('/api/submissions')
                .send({ formId: 999, data: {} });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /:id (delete submission)', () => {
        it('should delete a submission owned by tenant', async () => {
            mockFindById.mockResolvedValue({
                id: 1,
                data: { q1: 'a' },
                tenant_id: 'test-tenant-1',
            });
            mockDelete.mockResolvedValue(true);
            mockCreate.mockResolvedValue({ id: 1 }); // audit log

            const res = await request(app)
                .delete('/api/submissions/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should return 404 for wrong tenant', async () => {
            mockFindById.mockResolvedValue({
                id: 1,
                tenant_id: 'other-tenant',
            });

            const res = await request(app)
                .delete('/api/submissions/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE / (bulk delete)', () => {
        it('should require formId query parameter', async () => {
            const res = await request(app)
                .delete('/api/submissions')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        it('should delete all submissions for a form', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // form check
            mockQuery.mockResolvedValueOnce({ rows: [] }); // delete
            mockCreate.mockResolvedValue({ id: 1 }); // audit

            const res = await request(app)
                .delete('/api/submissions?formId=1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });
    });
});
