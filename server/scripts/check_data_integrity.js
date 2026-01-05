const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function check() {
    try {
        console.log('--- USERS ---');
        const users = await pool.query('SELECT username, tenant_id, role FROM users');
        console.table(users.rows);

        console.log('--- TENANTS ---');
        const tenants = await pool.query('SELECT id, name FROM tenants');
        console.table(tenants.rows);

        console.log('--- CUSTOMERS ---');
        const customers = await pool.query('SELECT id, full_name, tenant_id FROM customers');
        console.table(customers.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
