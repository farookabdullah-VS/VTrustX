const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function reset() {
    try {
        console.log("Resetting Data...");

        // Clear
        await pool.query('DELETE FROM users');
        await pool.query('DELETE FROM tenants');

        // Tenant
        const tRes = await pool.query("INSERT INTO tenants (name, plan) VALUES ('Demo Org', 'enterprise') RETURNING id");
        const tenantId = tRes.rows[0].id;
        console.log("Created Tenant:", tenantId);

        // User
        await pool.query("INSERT INTO users (username, password, role, tenant_id) VALUES ('admin', 'admin', 'admin', $1)", [tenantId]);
        console.log("Created User: admin / admin");

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
reset();
