const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function patch() {
    try {
        console.log("Patching Tenant Data...");

        // Ensure Tenant
        let tenantId;
        const tRes = await pool.query("SELECT id FROM tenants LIMIT 1");
        if (tRes.rows.length === 0) {
            const newT = await pool.query("INSERT INTO tenants (name, plan) VALUES ('Default Org', 'enterprise') RETURNING id");
            tenantId = newT.rows[0].id;
        } else {
            tenantId = tRes.rows[0].id;
        }
        console.log("Using Tenant:", tenantId);

        // Update ALL Users to belong to this tenant (if null)
        const uRes = await pool.query("UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tenants)", [tenantId]);
        console.log("Updated Users:", uRes.rowCount);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
patch();
