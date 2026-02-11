// Mock the db module before requiring PostgresRepository
const mockQuery = jest.fn();
jest.mock('../db', () => ({
    query: mockQuery,
}));

const PostgresRepository = require('../PostgresRepository');

describe('PostgresRepository', () => {
    let repo;

    beforeEach(() => {
        repo = new PostgresRepository('test_table');
        mockQuery.mockReset();
    });

    describe('constructor', () => {
        it('should set tableName', () => {
            expect(repo.tableName).toBe('test_table');
        });

        it('should default client to null', () => {
            expect(repo._client).toBeNull();
        });
    });

    describe('validateKey', () => {
        it('should accept valid alphanumeric column names', () => {
            expect(repo.validateKey('name')).toBe('name');
            expect(repo.validateKey('created_at')).toBe('created_at');
            expect(repo.validateKey('columnName123')).toBe('columnName123');
        });

        it('should reject SQL injection attempts', () => {
            expect(() => repo.validateKey('name; DROP TABLE')).toThrow('Invalid column name');
            expect(() => repo.validateKey("name' OR '1'='1")).toThrow('Invalid column name');
            expect(() => repo.validateKey('name--comment')).toThrow('Invalid column name');
        });

        it('should reject empty string', () => {
            expect(() => repo.validateKey('')).toThrow('Invalid column name');
        });

        it('should reject special characters', () => {
            expect(() => repo.validateKey('col.name')).toThrow('Invalid column name');
            expect(() => repo.validateKey('col name')).toThrow('Invalid column name');
        });
    });

    describe('findAll', () => {
        it('should query all records', async () => {
            const rows = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
            mockQuery.mockResolvedValue({ rows });

            const result = await repo.findAll();
            expect(result).toEqual(rows);
            expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM test_table', undefined);
        });
    });

    describe('findById', () => {
        it('should return a single record by id', async () => {
            const row = { id: 1, name: 'Test' };
            mockQuery.mockResolvedValue({ rows: [row] });

            const result = await repo.findById(1);
            expect(result).toEqual(row);
            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT * FROM test_table WHERE id = $1',
                [1]
            );
        });

        it('should return undefined when not found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await repo.findById(999);
            expect(result).toBeUndefined();
        });
    });

    describe('findBy', () => {
        it('should find by a specific column', async () => {
            const row = { id: 1, email: 'test@test.com' };
            mockQuery.mockResolvedValue({ rows: [row] });

            const result = await repo.findBy('email', 'test@test.com');
            expect(result).toEqual(row);
            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT * FROM test_table WHERE email = $1',
                ['test@test.com']
            );
        });

        it('should validate column name', () => {
            expect(() => repo.findBy('bad col', 'value')).rejects;
        });
    });

    describe('findAllBy', () => {
        it('should find all records matching column value', async () => {
            const rows = [{ id: 1 }, { id: 2 }];
            mockQuery.mockResolvedValue({ rows });

            const result = await repo.findAllBy('tenant_id', 5);
            expect(result).toEqual(rows);
        });

        it('should support orderBy clause', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            await repo.findAllBy('tenant_id', 5, 'created_at DESC');
            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT * FROM test_table WHERE tenant_id = $1 ORDER BY created_at DESC',
                [5]
            );
        });
    });

    describe('create', () => {
        it('should insert a new record and return it', async () => {
            const item = { name: 'Test', email: 'test@test.com' };
            const created = { id: 1, ...item };
            mockQuery.mockResolvedValue({ rows: [created] });

            const result = await repo.create(item);
            expect(result).toEqual(created);
            expect(mockQuery).toHaveBeenCalledWith(
                'INSERT INTO test_table (name, email) VALUES ($1, $2) RETURNING *',
                ['Test', 'test@test.com']
            );
        });

        it('should throw on query error', async () => {
            mockQuery.mockRejectedValue(new Error('duplicate key'));
            await expect(repo.create({ name: 'Test' })).rejects.toThrow('duplicate key');
        });
    });

    describe('update', () => {
        it('should update a record by id', async () => {
            const updated = { id: 1, name: 'Updated' };
            mockQuery.mockResolvedValue({ rows: [updated] });

            const result = await repo.update(1, { name: 'Updated' });
            expect(result).toEqual(updated);
            expect(mockQuery).toHaveBeenCalledWith(
                'UPDATE test_table SET name = $1 WHERE id = $2 RETURNING *',
                ['Updated', 1]
            );
        });

        it('should skip id and created_at fields', async () => {
            mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'X' }] });

            await repo.update(1, { id: 999, created_at: 'now', name: 'X' });
            expect(mockQuery).toHaveBeenCalledWith(
                'UPDATE test_table SET name = $1 WHERE id = $2 RETURNING *',
                ['X', 1]
            );
        });

        it('should return existing record when no fields to update', async () => {
            const row = { id: 1, name: 'Old' };
            mockQuery.mockResolvedValue({ rows: [row] });

            const result = await repo.update(1, { id: 1, created_at: 'now' });
            expect(result).toEqual(row);
        });
    });

    describe('delete', () => {
        it('should delete a record by id', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await repo.delete(1);
            expect(result).toBe(true);
            expect(mockQuery).toHaveBeenCalledWith(
                'DELETE FROM test_table WHERE id = $1',
                [1]
            );
        });
    });

    describe('withClient', () => {
        it('should create a scoped repository with the given client', () => {
            const mockClient = { query: jest.fn() };
            const scoped = repo.withClient(mockClient);

            expect(scoped).toBeInstanceOf(PostgresRepository);
            expect(scoped.tableName).toBe('test_table');
            expect(scoped._client).toBe(mockClient);
        });

        it('should use client.query instead of db.query', async () => {
            const mockClient = { query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] }) };
            const scoped = repo.withClient(mockClient);

            await scoped.findById(1);
            expect(mockClient.query).toHaveBeenCalled();
            expect(mockQuery).not.toHaveBeenCalled();
        });
    });
});
