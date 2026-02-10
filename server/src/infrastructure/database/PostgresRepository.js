const { query } = require('./db');

class PostgresRepository {
    constructor(tableName) {
        this.tableName = tableName;
    }

    async findAll() {
        const res = await query(`SELECT * FROM ${this.tableName}`);
        return res.rows;
    }

    async findById(id) {
        const res = await query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
        return res.rows[0];
    }

    async findBy(column, value) {
        const res = await query(`SELECT * FROM ${this.tableName} WHERE ${column} = $1`, [value]);
        return res.rows[0];
    }

    async findAllBy(column, value, orderBy = null) {
        let sql = `SELECT * FROM ${this.tableName} WHERE ${column} = $1`;
        if (orderBy) sql += ` ORDER BY ${orderBy}`;
        const res = await query(sql, [value]);
        return res.rows;
    }

    async create(item) {
        // Construct keys and values for INSERT
        // Note: item should match table columns.
        // For 'submissions' and 'forms', we have specific JSON columns, so we might need specialized handling 
        // OR we ensure the 'item' passed here extracts them correctly.
        // 
        // For a generic repo, this is tricky because of the different schemas.
        // However, looking at the code, we can probably treat this simple repo as accepting an object mapping to columns.

        const keys = Object.keys(item);
        const values = Object.values(item);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;

        try {
            const res = await query(sql, values);
            return res.rows[0];
        } catch (err) {
            console.error(`Error creating in ${this.tableName}:`, err);
            throw err;
        }
    }

    async update(id, item) {
        // IMPORTANT: Generic update is hard if we don't know which fields changed.
        // For now, let's assume 'item' contains ALL fields including the one to update?
        // OR we strictly update what's passed.
        // Also need to exclude 'id' from the update set if passed.

        const keys = Object.keys(item).filter(k => k !== 'id' && k !== 'created_at');
        const values = keys.map(k => item[k]);

        if (keys.length === 0) return this.findById(id);

        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

        // Add ID as the last parameter
        values.push(id);
        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${values.length} RETURNING *`;

        const res = await query(sql, values);
        return res.rows[0];
    }

    async delete(id) {
        await query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
        return true;
    }
}

module.exports = PostgresRepository;
