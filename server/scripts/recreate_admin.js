const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function recreate() {
    try {
        console.log("Recreating Admin...");

        // Find ID
        const res = await pool.query("SELECT id FROM users WHERE username = 'admin'");
        if (res.rows.length > 0) {
            const id = res.rows[0].id;
            console.log("Found admin ID:", id);

            // Nullify dependencies (Best effort)
            // Note: If you have other tables, add them here.
            await pool.query("UPDATE crm_accounts SET owner_id = NULL WHERE owner_id = $1", [id]);
            await pool.query("UPDATE tickets SET assigned_user_id = NULL WHERE assigned_user_id = $1", [id]);
            // Forms created_by? (Assuming no explicit FK or nullable) => Check schema?
            // Usually simpler to just DELETE and let error handler catch if strictly needed.

            await pool.query("DELETE FROM users WHERE id = $1", [id]);
            console.log("Deleted old admin.");
        }

        // Create
        // Ensure Tenant
        const tRes = await pool.query("SELECT id FROM tenants LIMIT 1");
        const tenantId = tRes.rows[0].id;

        await pool.query("INSERT INTO users (username, password, role, tenant_id) VALUES ('admin', 'admin', 'admin', $1)", [tenantId]);
        console.log("Created NEW admin / admin");

    } catch (e) {
        console.error("Error:", e.message);
        if (e.code === '23503') { // FK violation
            console.log("Could not delete due to dependencies. Resetting password instead.");
            const tRes = await pool.query("SELECT id FROM tenants LIMIT 1");
            await pool.query("UPDATE users SET password = 'admin', tenant_id = $1 WHERE username = 'admin'", [tRes.rows[0].id]);
            console.log("Password reset to 'admin'.");
        }
    } finally {
        pool.end();
    }
}
recreate();
