const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function migrate() {
    try {
        const sqlPath = path.join(__dirname, 'migration_tenant.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Running Migration...");
        await pool.query(sql);
        console.log("Migration Complete.");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
migrate();
