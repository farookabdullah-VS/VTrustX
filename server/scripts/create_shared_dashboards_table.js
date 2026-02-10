/**
 * Database migration: Create shared_dashboards table
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

const pool = new Pool(config);

async function createSharedDashboardsTable() {
    const client = await pool.connect();

    try {
        console.log('Creating shared_dashboards table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS shared_dashboards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
                share_token VARCHAR(255) NOT NULL UNIQUE,
                is_public BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_shared_dashboards_token ON shared_dashboards(share_token);
            CREATE INDEX IF NOT EXISTS idx_shared_dashboards_form ON shared_dashboards(form_id);
        `);

        console.log('✅ shared_dashboards table created successfully!');

    } catch (error) {
        console.error('❌ Error creating shared_dashboards table:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createSharedDashboardsTable();
