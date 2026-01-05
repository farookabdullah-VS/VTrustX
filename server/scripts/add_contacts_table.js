const pool = require('../src/infrastructure/database/db');
require('dotenv').config();

async function createContactsTable() {
    try {
        console.log("Adding 'contacts' table...");
        const query = `
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                mobile VARCHAR(50),
                address TEXT,
                designation VARCHAR(100),
                department VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(query);
        console.log("'contacts' table created successfully.");
    } catch (err) {
        console.error("Error creating 'contacts' table:", err);
    } finally {
        await pool.end();
    }
}

createContactsTable();
