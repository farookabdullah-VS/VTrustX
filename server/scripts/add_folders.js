const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vtrustx_db',
    port: process.env.DB_PORT || 5432,
    host: process.env.DB_HOST || 'localhost'
};

if (process.env.INSTANCE_CONNECTION_NAME) {
    dbConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    delete dbConfig.port;
}

const pool = new Pool(dbConfig);

async function up() {
    let client;
    try {
        console.log('Connecting to database...');
        client = await pool.connect();

        console.log('Beginning migration...');
        await client.query('BEGIN');

        // Ensure uuid-ossp extension exists
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        // DROP Existing table to fix schema mismatch (UUID vs INTEGER)
        await client.query('DROP TABLE IF EXISTS folders CASCADE;');

        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'folders'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('Creating folders table...');
            await client.query(`
                CREATE TABLE folders (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR(255) NOT NULL,
                    tenant_id INTEGER NOT NULL,
                    user_id INTEGER,
                    type VARCHAR(20) DEFAULT 'private', 
                    is_smart BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);

            await client.query('CREATE INDEX idx_folders_tenant ON folders(tenant_id);');
            await client.query('CREATE INDEX idx_folders_user ON folders(user_id);');
            console.log('Folders table created.');
        } else {
            console.log('Folders table already exists.');
        }

        // Check columns on forms table
        const colCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='forms' AND column_name='folder_id';
        `);

        if (colCheck.rowCount === 0) {
            console.log('Adding folder_id to forms table...');
            await client.query(`ALTER TABLE forms ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;`);
            await client.query('CREATE INDEX idx_forms_folder ON forms(folder_id);');
            console.log('Added folder_id column to forms table.');
        } else {
            console.log('folder_id column already exists on forms table.');
        }

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully!');

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

up();
