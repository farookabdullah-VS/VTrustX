const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function listTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Local Tables:', res.rows.map(r => r.table_name));

        // Also get row counts to see how much data we have
        for (const row of res.rows) {
            const countRes = await localPool.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
            console.log(`${row.table_name}: ${countRes.rows[0].count} rows`);
        }

    } catch (err) {
        console.error('Error connecting to local DB:', err);
    } finally {
        await localPool.end();
    }
}

listTables();
