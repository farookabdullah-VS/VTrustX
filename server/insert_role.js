const { pool } = require('./src/infrastructure/database/db');

async function insertRole() {
    try {
        const res = await pool.query(`
            INSERT INTO roles (tenant_id, name, description, permissions) 
            VALUES (1, 'Test Role', 'Test', '{}') 
            RETURNING *
        `);
        console.log('Inserted:', res.rows[0]);
    } catch (err) {
        console.error('Insert failed:', err.message);
    } finally {
        await pool.end();
    }
}

insertRole();
