const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'add_persona_engine_fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running Migration:', sqlPath);
        await pool.query(sql);
        console.log('✅ Migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
