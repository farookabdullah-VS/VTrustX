const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function addGenesys() {
    try {
        console.log('Connecting to DB...');
        // 1. Ensure Table Exists (idempotent)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS integrations (
                id SERIAL PRIMARY KEY,
                provider VARCHAR(100) NOT NULL UNIQUE,
                api_key VARCHAR(255),
                webhook_url VARCHAR(255),
                is_active BOOLEAN DEFAULT FALSE,
                config JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Insert Genesys if not exists
        const res = await pool.query(`
            INSERT INTO integrations (provider, is_active)
            VALUES ($1, $2)
            ON CONFLICT (provider) DO NOTHING
            RETURNING *;
        `, ['Genesys Cloud', false]);

        if (res.rowCount > 0) {
            console.log('✅ Genesys Cloud integration added successfully!');
        } else {
            console.log('ℹ️ Genesys Cloud integration already exists.');
        }

    } catch (err) {
        console.error('❌ Error adding Genesys:', err);
    } finally {
        await pool.end();
    }
}

addGenesys();
