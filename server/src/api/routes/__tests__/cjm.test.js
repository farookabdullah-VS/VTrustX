const request = require('supertest');
const { createTestApp, generateTestToken, mockAuthenticate } = require('../../../test/helpers');

const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock('../../../infrastructure/database/db', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

jest.mock('../../middleware/auth', () => require('../../../test/helpers').mockAuthenticate);

const cjmRouter = require('../cjm');

describe('CJM Routes', () => {
    let app;
    let token;

    beforeEach(() => {
        app = createTestApp();
        app.use('/api/cjm', cjmRouter);
        token = generateTestToken();
        mockQuery.mockReset();
        mockTransaction.mockReset();
    });

    describe('GET / (list maps)', () => {
        it('should return maps for tenant', async () => {
            const maps = [
                { id: 'uuid-1', title: 'Journey A', status: 'draft' },
                { id: 'uuid-2', title: 'Journey B', status: 'published' },
            ];
            mockQuery.mockResolvedValueOnce({ rows: maps });

            const res = await request(app)
                .get('/api/cjm')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });

        it('should filter by search', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'uuid-1', title: 'Onboarding' }] });

            const res = await request(app)
                .get('/api/cjm?search=onboard')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(mockQuery.mock.calls[0][0]).toContain('ILIKE');
        });

        it('should filter by status', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/cjm?status=draft')
                .set('Authorization', `Bearer ${token}`);

            expect(mockQuery.mock.calls[0][1]).toContain('draft');
        });

        it('should sort by title', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/cjm?sort=title')
                .set('Authorization', `Bearer ${token}`);

            expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY title ASC');
        });
    });

    describe('GET /:id (get map)', () => {
        it('should return a map', async () => {
            const map = { id: 'uuid-1', title: 'Test', data: {} };
            mockQuery.mockResolvedValueOnce({ rows: [map] });

            const res = await request(app)
                .get('/api/cjm/uuid-1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Test');
        });

        it('should return 404 when map not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/cjm/nonexistent')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST / (create map)', () => {
        it('should create a new map', async () => {
            const created = { id: 'uuid-new', title: 'New Journey', status: 'draft' };
            mockQuery.mockResolvedValueOnce({ rows: [created] });

            const res = await request(app)
                .post('/api/cjm')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'New Journey' });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('New Journey');
        });

        it('should use default title if not provided', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'uuid-new', title: 'Untitled Journey' }] });

            const res = await request(app)
                .post('/api/cjm')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(200);
        });
    });

    describe('PUT /:id (update map)', () => {
        it('should auto-create version on update', async () => {
            // Current data for versioning
            mockQuery.mockResolvedValueOnce({ rows: [{ data: { stages: [] } }] });
            // Version count
            mockQuery.mockResolvedValueOnce({ rows: [{ max_ver: 2 }] });
            // Insert version
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Update map
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .put('/api/cjm/uuid-1')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Updated', data: { stages: [{ id: 's1' }] } });

            expect(res.status).toBe(200);
            // Should have inserted a version with version_number 3
            expect(mockQuery.mock.calls[2][1]).toContain(3);
        });
    });

    describe('DELETE /:id (delete map)', () => {
        it('should cascade delete in a transaction', async () => {
            const mockClient = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
            };
            mockTransaction.mockImplementation(async (cb) => cb(mockClient));

            const res = await request(app)
                .delete('/api/cjm/uuid-1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(mockTransaction).toHaveBeenCalled();
            // Should have 4 DELETE queries within transaction
            expect(mockClient.query).toHaveBeenCalledTimes(4);
            // Verify order: comments, shares, versions, maps
            expect(mockClient.query.mock.calls[0][0]).toContain('cjm_comments');
            expect(mockClient.query.mock.calls[1][0]).toContain('cjm_shares');
            expect(mockClient.query.mock.calls[2][0]).toContain('cjm_versions');
            expect(mockClient.query.mock.calls[3][0]).toContain('cjm_maps');
        });

        it('should return 500 on transaction failure', async () => {
            mockTransaction.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .delete('/api/cjm/uuid-1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(500);
        });
    });

    describe('POST /:id/duplicate', () => {
        it('should duplicate a map', async () => {
            const original = { id: 'uuid-1', title: 'Original', description: 'Desc', data: {}, persona_id: null, tags: '[]' };
            mockQuery.mockResolvedValueOnce({ rows: [original] });
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'uuid-copy', title: 'Original (Copy)' }] });

            const res = await request(app)
                .post('/api/cjm/uuid-1/duplicate')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Original (Copy)');
        });

        it('should return 404 if map not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/cjm/nonexistent/duplicate')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});
