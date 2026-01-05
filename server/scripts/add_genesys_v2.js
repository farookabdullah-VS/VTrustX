const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

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

        // 1. Check if exists
        const check = await pool.query("SELECT * FROM integrations WHERE provider = 'Genesys Cloud'");

        if (check.rows.length === 0) {
            console.log('Genesys Cloud not found. Inserting...');
            await pool.query(`
                INSERT INTO integrations (provider, is_active, config)
                VALUES ($1, $2, $3)
            `, ['Genesys Cloud', false, '{}']);
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
