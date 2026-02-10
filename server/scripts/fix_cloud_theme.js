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
        console.log("Adding missing theme column to tenants...");
        await pool.query("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'");
        console.log("Success!");
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
