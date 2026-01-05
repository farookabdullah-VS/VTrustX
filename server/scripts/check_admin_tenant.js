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
        const users = await pool.query('SELECT username, tenant_id, role FROM users WHERE username = \'admin\'');
        console.log(JSON.stringify(users.rows, null, 2));

        console.log('--- CUSTOMERS ---');
        const customers = await pool.query('SELECT id, full_name, tenant_id FROM customers');
        console.log(JSON.stringify(customers.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
