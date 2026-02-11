const request = require('supertest');
const { createTestApp, generateTestToken, mockAuthenticate } = require('../../../test/helpers');

// Mock db
const mockQuery = jest.fn();
jest.mock('../../../infrastructure/database/db', () => ({
    query: mockQuery,
    transaction: jest.fn((cb) => cb({ query: mockQuery })),
}));

jest.mock('../../../infrastructure/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

jest.mock('../../middleware/auth', () => require('../../../test/helpers').mockAuthenticate);

const quotasRouter = require('../quotas');

describe('Quotas Routes', () => {
    let app;
    let token;

    beforeEach(() => {
        app = createTestApp();
        app.use('/api/quotas', quotasRouter);
        token = generateTestToken();
        mockQuery.mockReset();
    });

    describe('GET /', () => {
        it('should require formId query parameter', async () => {
            const res = await request(app)
                .get('/api/quotas')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('formId');
        });

        it('should return 404 if form not owned by tenant', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] }); // form check
            const res = await request(app)
                .get('/api/quotas?formId=999')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('should return quotas with period counts', async () => {
            // Form ownership check
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Quotas query
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { id: 1, reset_period: 'daily', current_count: 5 },
                    { id: 2, reset_period: null, current_count: 10 },
                ]
            });
            // Batch period counter query
            mockQuery.mockResolvedValueOnce({
                rows: [{ quota_id: 1, period_key: `daily:${new Date().toISOString().split('T')[0]}`, count: 3 }]
            });

            const res = await request(app)
                .get('/api/quotas?formId=1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].current_count).toBe(3); // Updated from counter
            expect(res.body[1].current_count).toBe(10); // Unchanged, no period
        });

        it('should return quotas without period counters when none are periodic', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, reset_period: null, current_count: 7 }]
            });

            const res = await request(app)
                .get('/api/quotas?formId=1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body[0].current_count).toBe(7);
            // Should only have 2 queries: form check + quotas, no period counter query
            expect(mockQuery).toHaveBeenCalledTimes(2);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/quotas?formId=1');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /', () => {
        it('should create a quota', async () => {
            // Form check
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Submissions for count calculation
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Insert
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, form_id: 1, label: 'Test', limit_count: 100 }]
            });

            const res = await request(app)
                .post('/api/quotas')
                .set('Authorization', `Bearer ${token}`)
                .send({ form_id: 1, label: 'Test', limit_count: 100, criteria: {} });

            expect(res.status).toBe(201);
            expect(res.body.label).toBe('Test');
        });

        it('should return 404 if form not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/quotas')
                .set('Authorization', `Bearer ${token}`)
                .send({ form_id: 999, label: 'Test', limit_count: 100 });

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /:id', () => {
        it('should update a quota', async () => {
            // Quota+form check
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, form_id: 1, tenant_id: 'test-tenant-1' }]
            });
            // Submissions for recount
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Update
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, label: 'Updated', limit_count: 50 }]
            });

            const res = await request(app)
                .put('/api/quotas/1')
                .set('Authorization', `Bearer ${token}`)
                .send({ label: 'Updated', limit_count: 50, criteria: {} });

            expect(res.status).toBe(200);
            expect(res.body.label).toBe('Updated');
        });

        it('should return 404 if quota not found or wrong tenant', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .put('/api/quotas/999')
                .set('Authorization', `Bearer ${token}`)
                .send({ label: 'Test', limit_count: 50, criteria: {} });

            expect(res.status).toBe(404);
        });

        it('should reject invalid limit_count', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, form_id: 1, tenant_id: 'test-tenant-1' }]
            });

            const res = await request(app)
                .put('/api/quotas/1')
                .set('Authorization', `Bearer ${token}`)
                .send({ label: 'Test', limit_count: 'abc', criteria: {} });

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /:id', () => {
        it('should delete a quota', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .delete('/api/quotas/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('deleted');
        });

        it('should return 404 if quota not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .delete('/api/quotas/999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});
