const pool = require('../infrastructure/database/db');

async function migrate() {
    try {
        console.log("Creating contacts table...");
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
        console.log("Contacts table created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
