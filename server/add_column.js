const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function addColumn() {
    try {
        console.log("Adding ai_enabled column to forms table...");
        await pool.query(`
            ALTER TABLE forms 
            ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE;
        `);
        console.log("Column added successfully or already exists.");
    } catch (err) {
        console.error("Error adding column:", err);
    } finally {
        pool.end();
    }
}

addColumn();
