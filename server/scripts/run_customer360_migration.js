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

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'add_customer360_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running Migration:', sqlPath);
        await pool.query(sql);
        console.log('✅ Customer 360 Foundation tables created.');
    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
