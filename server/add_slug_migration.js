const { pd } = require('process');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        console.log('Adding slug column to reports table...');
        await pool.query('ALTER TABLE reports ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;');
        console.log('Column added successfully.');
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        await pool.end();
    }
}

run();
