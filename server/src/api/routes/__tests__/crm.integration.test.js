const request = require('supertest');
const { createTestApp, generateTestToken, mockAuthenticate } = require('../../../test/helpers');

// Mock dependencies
const mockPoolQuery = jest.fn();
const mockPoolConnect = jest.fn();
const mockRepoCreate = jest.fn();
const mockRepoUpdate = jest.fn();
const mockRepoFindById = jest.fn();

jest.mock('../../../infrastructure/database/PostgresRepository', () => {
    return jest.fn().mockImplementation(() => ({
        create: mockRepoCreate,
        update: mockRepoUpdate,
        findById: mockRepoFindById,
        findAllBy: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(true),
        withClient: jest.fn().mockReturnThis(),
    }));
});

jest.mock('../../../infrastructure/database/db', () => {
    const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
    };
    return {
        query: mockPoolQuery,
        pool: { query: mockPoolQuery },
        connect: mockPoolConnect.mockResolvedValue(mockClient),
        transaction: jest.fn((cb) => cb(mockClient)),
        _mockClient: mockClient,
    };
});

jest.mock('../../../infrastructure/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

jest.mock('../../middleware/auth', () => require('../../../test/helpers').mockAuthenticate);
jest.mock('../../middleware/validate', () => () => (req, res, next) => next());
jest.mock('../../../services/workflowEngine', () => ({
    evaluate: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../services/emailService', () => ({
    sendTemplate: jest.fn(),
}));

const crmRouter = require('../crm');

describe('CRM Routes', () => {
    let app;
    let token;

    beforeEach(() => {
        app = createTestApp();
        app.use('/api/crm', crmRouter);
        token = generateTestToken();
        mockPoolQuery.mockReset();
        mockRepoCreate.mockReset();
        mockRepoUpdate.mockReset();
        mockRepoFindById.mockReset();
    });

    describe('GET /tickets (list)', () => {
        it('should return tickets without pagination', async () => {
            const tickets = [
                { id: 1, subject: 'Bug', status: 'new', tenant_id: 'test-tenant-1' },
                { id: 2, subject: 'Feature', status: 'open', tenant_id: 'test-tenant-1' },
            ];
            mockPoolQuery.mockResolvedValueOnce({ rows: tickets });

            const res = await request(app)
                .get('/api/crm/tickets')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });

        it('should return paginated tickets', async () => {
            // Count query + data query in parallel
            mockPoolQuery
                .mockResolvedValueOnce({ rows: [{ total: '5' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, subject: 'Test' }] });

            const res = await request(app)
                .get('/api/crm/tickets?page=1&limit=10')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.pagination.total).toBe(5);
        });

        it('should filter by status', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/crm/tickets?status=open')
                .set('Authorization', `Bearer ${token}`);

            const queryCall = mockPoolQuery.mock.calls[0];
            expect(queryCall[0]).toContain('t.status = $');
            expect(queryCall[1]).toContain('open');
        });

        it('should filter by priority', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/crm/tickets?priority=high')
                .set('Authorization', `Bearer ${token}`);

            expect(mockPoolQuery.mock.calls[0][1]).toContain('high');
        });

        it('should search by subject/description/code', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/crm/tickets?search=login')
                .set('Authorization', `Bearer ${token}`);

            expect(mockPoolQuery.mock.calls[0][0]).toContain('ILIKE');
        });

        it('should sort by specified column', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/crm/tickets?sort=priority&order=asc')
                .set('Authorization', `Bearer ${token}`);

            expect(mockPoolQuery.mock.calls[0][0]).toContain('t.priority');
            expect(mockPoolQuery.mock.calls[0][0]).toContain('ASC');
        });
    });

    describe('GET /tickets/:id (detail)', () => {
        it('should return ticket with messages', async () => {
            const ticket = { id: 1, subject: 'Bug', status: 'new', tenant_id: 'test-tenant-1' };
            const messages = [{ id: 1, body: 'Help!', ticket_id: 1 }];
            mockPoolQuery
                .mockResolvedValueOnce({ rows: [ticket] })
                .mockResolvedValueOnce({ rows: messages });

            const res = await request(app)
                .get('/api/crm/tickets/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.messages).toHaveLength(1);
        });

        it('should return 404 when ticket not found', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/crm/tickets/999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST /tickets (create)', () => {
        it('should create a ticket', async () => {
            // Contact lookup
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', email: 'test@test.com' }] });
            // SLA lookup
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            // Assignment rules
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            // Teams batch fetch
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'General Support' }] });
            // Repo create
            mockRepoCreate.mockResolvedValue({ id: 1, ticket_code: 'TCK-123456', subject: 'Test' });
            // Contact fetch for notification
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ name: 'Test', email: 'test@test.com' }] });

            const res = await request(app)
                .post('/api/crm/tickets')
                .set('Authorization', `Bearer ${token}`)
                .send({ subject: 'Test ticket', description: 'desc', priority: 'medium' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('ticket_code');
        });

        it('should auto-create contact when not provided', async () => {
            // Contact search (not found)
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            // Contact auto-create via repo
            mockRepoCreate.mockResolvedValueOnce({ id: 99, name: 'testuser' });
            // SLA
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            // Rules
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            // Teams batch
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            // Ticket create
            mockRepoCreate.mockResolvedValueOnce({ id: 1, ticket_code: 'TCK-111111', subject: 'Auto' });
            // Contact for notification
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ name: 'testuser', email: 'test@test.com' }] });

            const res = await request(app)
                .post('/api/crm/tickets')
                .set('Authorization', `Bearer ${token}`)
                .send({ subject: 'Auto contact test' });

            expect(res.status).toBe(201);
        });
    });

    describe('PUT /tickets/:id (update)', () => {
        it('should update a ticket with valid transition', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'new' }] });
            mockRepoUpdate.mockResolvedValue({ id: 1, status: 'open' });
            mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // audit log
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ contact_email: null }] }); // fresh ticket

            const res = await request(app)
                .put('/api/crm/tickets/1')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'open' });

            expect(res.status).toBe(200);
        });

        it('should reject invalid status transition', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'new' }] });

            const res = await request(app)
                .put('/api/crm/tickets/1')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'resolved' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Invalid status transition');
        });

        it('should return 404 when ticket not found', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .put('/api/crm/tickets/999')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'open' });

            expect(res.status).toBe(404);
        });

        it('should set closed_at on closing', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'open' }] });
            mockRepoUpdate.mockResolvedValue({ id: 1, status: 'closed' });
            mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // audit
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ contact_email: null }] }); // fresh

            const res = await request(app)
                .put('/api/crm/tickets/1')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'closed' });

            expect(res.status).toBe(200);
            // Verify closed_at was set in the update call
            const updateArgs = mockRepoUpdate.mock.calls[0][1];
            expect(updateArgs.closed_at).toBeInstanceOf(Date);
        });

        it('should clear closed_at when reopening', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'closed' }] });
            mockRepoUpdate.mockResolvedValue({ id: 1, status: 'open' });
            mockPoolQuery.mockResolvedValueOnce({ rows: [] }); // audit
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ contact_email: null }] }); // fresh

            const res = await request(app)
                .put('/api/crm/tickets/1')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'open' });

            expect(res.status).toBe(200);
            expect(mockRepoUpdate.mock.calls[0][1].closed_at).toBeNull();
        });
    });

    describe('GET /tickets/:id/transitions', () => {
        it('should return allowed transitions', async () => {
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ status: 'new' }] });

            const res = await request(app)
                .get('/api/crm/tickets/1/transitions')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.currentStatus).toBe('new');
            expect(res.body.allowedTransitions).toContain('open');
        });
    });

    describe('PUT /tickets/bulk (bulk update)', () => {
        it('should batch update multiple tickets', async () => {
            const db = require('../../../infrastructure/database/db');
            const mockClient = await db.connect();

            // Batch verify query
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({
                    rows: [
                        { id: 1, status: 'new' },
                        { id: 2, status: 'new' },
                    ]
                });

            mockRepoUpdate
                .mockResolvedValueOnce({ id: 1, status: 'open' })
                .mockResolvedValueOnce({ id: 2, status: 'open' });

            // Batch audit insert
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // COMMIT
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .put('/api/crm/tickets/bulk')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    ticketIds: [1, 2],
                    updates: { status: 'open' },
                });

            expect(res.status).toBe(200);
            expect(res.body.updated).toEqual(expect.arrayContaining([1, 2]));
        });

        it('should report errors for missing tickets', async () => {
            const db = require('../../../infrastructure/database/db');
            const mockClient = await db.connect();

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 1, status: 'new' }] }); // Only ticket 1 found

            mockRepoUpdate.mockResolvedValueOnce({ id: 1, status: 'open' });
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // audit
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const res = await request(app)
                .put('/api/crm/tickets/bulk')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    ticketIds: [1, 999],
                    updates: { status: 'open' },
                });

            expect(res.status).toBe(200);
            expect(res.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ id: 999, error: 'Not found' })])
            );
        });

        it('should reject invalid transition in bulk', async () => {
            const db = require('../../../infrastructure/database/db');
            const mockClient = await db.connect();

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 1, status: 'new' }] }); // new -> resolved is invalid

            mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT (no updates)

            const res = await request(app)
                .put('/api/crm/tickets/bulk')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    ticketIds: [1],
                    updates: { status: 'resolved' },
                });

            expect(res.status).toBe(200);
            expect(res.body.errors).toHaveLength(1);
            expect(res.body.errors[0].error).toContain('Invalid transition');
        });
    });

    describe('GET /stats', () => {
        it('should return aggregated stats', async () => {
            mockPoolQuery
                .mockResolvedValueOnce({ rows: [{ status: 'new', count: '5' }] })
                .mockResolvedValueOnce({ rows: [{ name: 'Support', count: '3' }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ priority: 'high', count: '2' }] });

            const res = await request(app)
                .get('/api/crm/stats')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('byStatus');
            expect(res.body).toHaveProperty('byTeam');
            expect(res.body).toHaveProperty('byPriority');
            expect(res.body).toHaveProperty('breaches');
        });
    });

    describe('POST /public/tickets', () => {
        it('should create ticket without auth', async () => {
            // Tenant resolution
            mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Contact lookup
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            // Contact create via repo
            mockRepoCreate.mockResolvedValueOnce({ id: 1, name: 'John' });
            // Team lookup
            mockPoolQuery.mockResolvedValueOnce({ rows: [] });
            // Ticket create
            mockRepoCreate.mockResolvedValueOnce({ id: 1, ticket_code: 'TCK-222222' });

            const res = await request(app)
                .post('/api/crm/public/tickets')
                .send({
                    name: 'John',
                    email: 'john@example.com',
                    subject: 'Public ticket',
                });

            expect(res.status).toBe(201);
        });

        it('should require name, email, subject', async () => {
            const res = await request(app)
                .post('/api/crm/public/tickets')
                .send({ description: 'missing fields' });

            expect(res.status).toBe(400);
        });
    });
});
