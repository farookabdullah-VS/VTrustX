const { query } = require('../src/infrastructure/database/db');

async function fixReportsTable() {
    try {
        console.log("Starting Reports Table Fix...");

        // 1. Drop existing reports table
        console.log("Dropping existing reports table...");
        await query(`DROP TABLE IF EXISTS reports CASCADE`);

        // 2. Create reports table with correct schema (INTEGER FKs)
        console.log("Creating reports table...");
        const createSql = `
            CREATE TABLE reports (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                title VARCHAR(255) NOT NULL DEFAULT 'Untitled Report',
                description TEXT,
                form_id INTEGER REFERENCES forms(id), -- Changed to INTEGER to match forms.id
                layout JSONB DEFAULT '[]',
                widgets JSONB DEFAULT '{}',
                theme JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await query(createSql);

        console.log("Reports table recreated successfully.");
        process.exit(0);

    } catch (err) {
        console.error("Error fixing reports table:", err);
        process.exit(1);
    }
}

fixReportsTable();
