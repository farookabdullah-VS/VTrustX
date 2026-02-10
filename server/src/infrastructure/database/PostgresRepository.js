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

    validateKey(key) {
        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
            throw new Error(`Invalid column name: ${key}`);
        }
        return key;
    }

    async findBy(column, value) {
        this.validateKey(column);
        const res = await query(`SELECT * FROM ${this.tableName} WHERE ${column} = $1`, [value]);
        return res.rows[0];
    }

    async findAllBy(column, value, orderBy = null) {
        this.validateKey(column);
        let sql = `SELECT * FROM ${this.tableName} WHERE ${column} = $1`;
        if (orderBy) {
            // orderBy is a bit more complex, we should at least check parts
            const parts = orderBy.split(' ');
            parts.forEach(p => this.validateKey(p));
            sql += ` ORDER BY ${orderBy}`;
        }
        const res = await query(sql, [value]);
        return res.rows;
    }

    async create(item) {
        const keys = Object.keys(item).map(k => this.validateKey(k));
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
        const keys = Object.keys(item)
            .filter(k => k !== 'id' && k !== 'created_at')
            .map(k => this.validateKey(k));

        const values = keys.map(k => item[k]);

        if (keys.length === 0) return this.findById(id);

        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

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
