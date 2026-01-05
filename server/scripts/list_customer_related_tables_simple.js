const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function listTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE 'customer_%' OR table_name LIKE 'cx_%')
            ORDER BY table_name;
        `);

        const tables = res.rows.map(r => r.table_name);
        console.log('Customer Related Tables:');
        tables.forEach(t => console.log(`- ${t}`));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

listTables();
