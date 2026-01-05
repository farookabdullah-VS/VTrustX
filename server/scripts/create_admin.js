const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function createAdmin() {
    try {
        console.log("Creating Admin User...");

        // Ensure Tenant
        let tenantId;
        const tRes = await pool.query("SELECT id FROM tenants LIMIT 1");
        if (tRes.rows.length === 0) {
            const newT = await pool.query("INSERT INTO tenants (name, plan) VALUES ('Default Org', 'enterprise') RETURNING id");
            tenantId = newT.rows[0].id;
        } else {
            tenantId = tRes.rows[0].id;
        }
        console.log("Tenant ID:", tenantId);

        // Check if admin exists
        const uRes = await pool.query("SELECT * FROM users WHERE username = 'admin'");
        if (uRes.rows.length === 0) {
            await pool.query("INSERT INTO users (username, password, role, tenant_id) VALUES ('admin', 'admin', 'admin', $1)", [tenantId]);
            console.log("Created User: admin / admin");
        } else {
            console.log("User 'admin' already exists. Updating password to 'admin'...");
            await pool.query("UPDATE users SET password = 'admin', tenant_id = $1 WHERE username = 'admin'", [tenantId]);
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
createAdmin();
