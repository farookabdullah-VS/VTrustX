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

async function initDb() {
    try {
        const sqlPath = path.join(__dirname, '..', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Reading init.sql from:', sqlPath);
        console.log('Running SQL commands...');

        await pool.query(sql);

        console.log('✅ Database initialized successfully! Tables created if they didn\'t exist.');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    } finally {
        await pool.end();
    }
}

initDb();
