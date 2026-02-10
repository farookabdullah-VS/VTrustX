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
        const providers = await pool.query("SELECT id, name, provider, is_active FROM ai_providers");
        console.log("AI Providers:", JSON.stringify(providers.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
