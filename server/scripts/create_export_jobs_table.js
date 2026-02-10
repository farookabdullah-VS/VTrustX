/**
 * Database migration: Create export_jobs table
 * Run this script to add export functionality to the database
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function createExportJobsTable() {
    const client = await pool.connect();

    try {
        console.log('Creating export_jobs table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS export_jobs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                export_type VARCHAR(50) NOT NULL,
                format VARCHAR(20) NOT NULL,
                options JSONB NOT NULL DEFAULT '{}',
                filters JSONB NOT NULL DEFAULT '{}',
                status VARCHAR(20) DEFAULT 'pending',
                file_url TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
        `);

        console.log('Creating indexes...');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_export_jobs_tenant ON export_jobs(tenant_id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_export_jobs_form ON export_jobs(form_id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_export_jobs_created ON export_jobs(created_at DESC);
        `);

        console.log('✅ Export jobs table created successfully!');
        console.log('✅ Indexes created successfully!');

    } catch (error) {
        console.error('❌ Error creating export_jobs table:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
createExportJobsTable()
    .then(() => {
        console.log('Migration completed!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
