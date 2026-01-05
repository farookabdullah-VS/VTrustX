const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function fixUsers() {
    try {
        console.log("Fixing Users table...");

        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
        `);

        // Update existing users to have tenant_id = 1
        await pool.query(`UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL`);

        console.log("✅ Users table updated with tenant_id.");

    } catch (e) {
        console.error("Fix Users Error:", e.message);
    } finally {
        await pool.end();
    }
}

fixUsers();
