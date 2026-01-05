const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function listTableInfo() {
    try {
        console.log('--- Table: customers ---');

        // 1. Get Schema
        console.log('\n[Schema]');
        const schemaRes = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'customers'
            ORDER BY ordinal_position;
        `);
        if (schemaRes.rows.length === 0) {
            console.log('Table "customers" not found.');
        } else {
            console.log(JSON.stringify(schemaRes.rows, null, 2));
        }

        // 2. Get Data
        console.log('\n[Data - First 5 Rows]');
        const dataRes = await pool.query('SELECT * FROM customers LIMIT 5');
        if (dataRes.rows.length === 0) {
            console.log('No data found.');
        } else {
            console.log(JSON.stringify(dataRes.rows, null, 2));
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

listTableInfo();
