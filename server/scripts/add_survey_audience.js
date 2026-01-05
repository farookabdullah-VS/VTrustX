const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function run() {
    try {
        const sql = `
        CREATE TABLE IF NOT EXISTS form_contacts (
            id SERIAL PRIMARY KEY,
            form_id INTEGER REFERENCES forms(id),
            contact_id INTEGER, 
            status VARCHAR(50) DEFAULT 'white_listed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(form_id, contact_id)
        );
        `;
        // Note: I'm not referencing crm_contacts(id) strictly because of the potential table name mismatch (contacts vs crm_contacts).
        // I'll leave it as loose integer for now or try to reference 'contacts' if I could verify.
        // Given contacts.js uses 'contacts', I'll assume that table exists. But to be safe against FK errors if table doesn't exist, I'll skip explicit FK for contact_id for this step, or try to infer.
        // Actually, if contacts table is 'contacts', I should reference it.
        // Let's assume 'contacts' exists.

        console.log('Creating form_contacts table...');
        await pool.query(sql);
        console.log('Done.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
