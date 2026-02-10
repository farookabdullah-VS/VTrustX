const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: 'localhost',
    port: 5434,
    database: 'vtrustx-db',
});

async function run() {
    try {
        console.log("Creating Admin User...");

        // 1. Ensure Default Tenant Exists
        const tenantRes = await pool.query("SELECT id FROM tenants WHERE name = 'Default Organization' LIMIT 1");
        let tenantId;
        if (tenantRes.rows.length === 0) {
            const newTenant = await pool.query("INSERT INTO tenants (name, plan, subscription_status) VALUES ($1, $2, $3) RETURNING id", ['Default Organization', 'enterprise', 'active']);
            tenantId = newTenant.rows[0].id;
        } else {
            tenantId = tenantRes.rows[0].id;
        }

        // 2. Create Admin User
        const userRes = await pool.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
        if (userRes.rows.length === 0) {
            await pool.query("INSERT INTO users (username, password, role, tenant_id, email, name) VALUES ($1, $2, $3, $4, $5, $6)",
                ['admin', 'admin123', 'admin', tenantId, 'admin@vtrustx.ai', 'System administrator']);
            console.log("Admin user created: admin / admin123");
        } else {
            console.log("Admin user already exists.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
