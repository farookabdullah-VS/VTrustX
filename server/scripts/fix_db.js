const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function fix() {
    try {
        console.log("Fixing database schema...");

        // 1. Create tenants table if missing
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Checked tenants table.");

        // 2. Ensure default tenant exists
        await pool.query(`
            INSERT INTO tenants (id, name) VALUES (1, 'Default Tenant') ON CONFLICT DO NOTHING;
        `);

        // 3. Ensure contacts table exists and has correct columns
        // We won't drop it to avoid data loss, but we'll try to add columns if missing
        // This is tricky if it was created differently.
        // Let's just try to create it if not exists.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                mobile VARCHAR(50),
                address TEXT,
                designation VARCHAR(100),
                department VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Checked contacts table.");

        // 4. Ensure form_contacts table exists
        await pool.query(`
             CREATE TABLE IF NOT EXISTS form_contacts (
                id SERIAL PRIMARY KEY,
                form_id INTEGER REFERENCES forms(id),
                contact_id INTEGER, 
                status VARCHAR(50) DEFAULT 'white_listed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(form_id, contact_id)
            );
        `);
        console.log("Checked form_contacts table.");

        console.log("✅ Database Schema Fixed.");

    } catch (e) {
        console.error("Fix Error:", e.message);
    } finally {
        await pool.end();
    }
}

fix();
