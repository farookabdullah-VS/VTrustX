
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: '127.0.0.1',
    port: 15432,
    database: 'vtrustx-db',
});

async function checkAdmin() {
    try {
        console.log("Checking admin user...");
        const res = await pool.query("SELECT id, username, email FROM users WHERE username = 'admin' OR email = 'admin@vtrustx.ai'");
        if (res.rows.length === 0) {
            console.log("Admin user DOES NOT exist.");
        } else {
            console.log("Admin user exists:", res.rows[0]);
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

checkAdmin();
