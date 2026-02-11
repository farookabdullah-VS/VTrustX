// Mock db before requiring workflowEngine
const mockPoolQuery = jest.fn();
const mockRepoUpdate = jest.fn();

jest.mock('../../infrastructure/database/db', () => ({
    pool: { query: mockPoolQuery },
    query: mockPoolQuery,
}));

jest.mock('../../infrastructure/database/PostgresRepository', () => {
    return jest.fn().mockImplementation(() => ({
        update: mockRepoUpdate,
    }));
});

const workflowEngine = require('../workflowEngine');

describe('WorkflowEngine', () => {
    beforeEach(() => {
        mockPoolQuery.mockReset();
        mockRepoUpdate.mockReset();
    });

    describe('evaluate', () => {
        it('should skip if entity has no tenant_id', async () => {
            await workflowEngine.evaluate('ticket', { id: 1 }, 'ticket_created');
            expect(mockPoolQuery).not.toHaveBeenCalled();
        });

        it('should fetch active workflows for the trigger', async () => {
            mockPoolQuery.mockResolvedValue({ rows: [] });

            await workflowEngine.evaluate('ticket', { id: 1, tenant_id: 't1' }, 'ticket_created');

            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.stringContaining('trigger_event'),
                ['t1', 'ticket_created']
            );
        });

        it('should execute matching workflow', async () => {
            mockPoolQuery.mockResolvedValueOnce({
                rows: [{
                    name: 'Auto-escalate',
                    conditions: [{ field: 'priority', operator: 'equals', value: 'urgent' }],
                    actions: [{ type: 'update_field', field: 'status', value: 'open' }],
                }]
            });
            mockRepoUpdate.mockResolvedValue({});

            await workflowEngine.evaluate('ticket', {
                id: 1,
                tenant_id: 't1',
                priority: 'urgent',
            }, 'ticket_created');

            expect(mockRepoUpdate).toHaveBeenCalledWith(1, { status: 'open' });
        });

        it('should not execute non-matching workflow', async () => {
            mockPoolQuery.mockResolvedValueOnce({
                rows: [{
                    name: 'Auto-escalate',
                    conditions: [{ field: 'priority', operator: 'equals', value: 'urgent' }],
                    actions: [{ type: 'update_field', field: 'status', value: 'open' }],
                }]
            });

            await workflowEngine.evaluate('ticket', {
                id: 1,
                tenant_id: 't1',
                priority: 'low',
            }, 'ticket_created');

            expect(mockRepoUpdate).not.toHaveBeenCalled();
        });
    });

    describe('checkConditions', () => {
        it('should return true for empty conditions', () => {
            expect(workflowEngine.checkConditions(null, {})).toBe(true);
            expect(workflowEngine.checkConditions([], {})).toBe(true);
        });

        it('should support equals operator', () => {
            const conds = [{ field: 'status', operator: 'equals', value: 'new' }];
            expect(workflowEngine.checkConditions(conds, { status: 'new' })).toBe(true);
            expect(workflowEngine.checkConditions(conds, { status: 'open' })).toBe(false);
        });

        it('should support not_equals operator', () => {
            const conds = [{ field: 'status', operator: 'not_equals', value: 'closed' }];
            expect(workflowEngine.checkConditions(conds, { status: 'open' })).toBe(true);
            expect(workflowEngine.checkConditions(conds, { status: 'closed' })).toBe(false);
        });

        it('should support contains operator', () => {
            const conds = [{ field: 'subject', operator: 'contains', value: 'urgent' }];
            expect(workflowEngine.checkConditions(conds, { subject: 'urgent: server down' })).toBe(true);
            expect(workflowEngine.checkConditions(conds, { subject: 'normal request' })).toBe(false);
        });

        it('should support greater_than operator', () => {
            const conds = [{ field: 'score', operator: 'greater_than', value: 5 }];
            expect(workflowEngine.checkConditions(conds, { score: 8 })).toBe(true);
            expect(workflowEngine.checkConditions(conds, { score: 3 })).toBe(false);
        });

        it('should support less_than operator', () => {
            const conds = [{ field: 'score', operator: 'less_than', value: 5 }];
            expect(workflowEngine.checkConditions(conds, { score: 3 })).toBe(true);
            expect(workflowEngine.checkConditions(conds, { score: 8 })).toBe(false);
        });

        it('should require all conditions (AND logic)', () => {
            const conds = [
                { field: 'priority', operator: 'equals', value: 'high' },
                { field: 'status', operator: 'equals', value: 'new' },
            ];
            expect(workflowEngine.checkConditions(conds, { priority: 'high', status: 'new' })).toBe(true);
            expect(workflowEngine.checkConditions(conds, { priority: 'high', status: 'open' })).toBe(false);
        });

        it('should return false for unknown operator', () => {
            const conds = [{ field: 'x', operator: 'regex', value: '.*' }];
            expect(workflowEngine.checkConditions(conds, { x: 'test' })).toBe(false);
        });

        it('should parse stringified conditions', () => {
            const conds = JSON.stringify([{ field: 'status', operator: 'equals', value: 'new' }]);
            expect(workflowEngine.checkConditions(conds, { status: 'new' })).toBe(true);
        });
    });

    describe('executeActions', () => {
        it('should handle update_field action', async () => {
            mockRepoUpdate.mockResolvedValue({});

            await workflowEngine.executeActions(
                [{ type: 'update_field', field: 'priority', value: 'urgent' }],
                { id: 1, tenant_id: 't1' }
            );

            expect(mockRepoUpdate).toHaveBeenCalledWith(1, { priority: 'urgent' });
        });

        it('should handle send_notification action', async () => {
            mockPoolQuery.mockResolvedValue({ rows: [] });

            await workflowEngine.executeActions(
                [{ type: 'send_notification', subject: 'Alert', message: 'Test' }],
                { id: 1, tenant_id: 't1', assigned_user_id: 5 }
            );

            expect(mockPoolQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO notifications'),
                expect.any(Array)
            );
        });

        it('should handle null/undefined actions', async () => {
            await workflowEngine.executeActions(null, {});
            await workflowEngine.executeActions(undefined, {});
            // Should not throw
        });

        it('should parse stringified actions', async () => {
            mockRepoUpdate.mockResolvedValue({});
            const actions = JSON.stringify([{ type: 'update_field', field: 'status', value: 'open' }]);

            await workflowEngine.executeActions(actions, { id: 1, tenant_id: 't1' });

            expect(mockRepoUpdate).toHaveBeenCalled();
        });
    });
});
