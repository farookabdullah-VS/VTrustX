
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    user: 'postgres',
    password: 'Yaalla@123',
    host: '127.0.0.1',
    port: 15432,
    database: 'rayix-db',
});

async function resetAdmin() {
    try {
        console.log("Resetting admin password...");

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);

        const res = await pool.query(
            "UPDATE users SET password = $1 WHERE username = 'admin' RETURNING id, username",
            [hash]
        );

        if (res.rowCount > 0) {
            console.log("Admin password reset successfully for user:", res.rows[0].username);
        } else {
            console.log("Admin user NOT FOUND. Creating it...");
            // Ensure Default Tenant Exists
            const tenantRes = await pool.query("SELECT id FROM tenants WHERE name = 'Default Organization' LIMIT 1");
            let tenantId;
            if (tenantRes.rows.length === 0) {
                const newTenant = await pool.query("INSERT INTO tenants (name, plan, subscription_status) VALUES ($1, $2, $3) RETURNING id", ['Default Organization', 'enterprise', 'active']);
                tenantId = newTenant.rows[0].id;
            } else {
                tenantId = tenantRes.rows[0].id;
            }

            await pool.query("INSERT INTO users (username, password, role, tenant_id, email, name) VALUES ($1, $2, $3, $4, $5, $6)",
                ['admin', hash, 'admin', tenantId, 'admin@vtrustx.ai', 'System administrator']);
            console.log("Admin user created.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

resetAdmin();
