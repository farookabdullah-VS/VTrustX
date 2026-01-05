const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const createPersonasTable = async () => {
    try {
        console.log('Creating cx_personas table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS cx_personas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        description TEXT,
        attributes JSONB NOT NULL DEFAULT '{}',
        tenant_id VARCHAR(50), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Successfully created cx_personas table.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await pool.end();
    }
};

createPersonasTable();
