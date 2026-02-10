const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: 'localhost',
    port: 5434,
    database: 'vtrustx-db',
});

async function check() {
    try {
        const users = await pool.query("SELECT id, username, tenant_id FROM users");
        console.log("Users:", JSON.stringify(users.rows, null, 2));

        const tenants = await pool.query("SELECT id, name FROM tenants");
        console.log("Tenants:", JSON.stringify(tenants.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
