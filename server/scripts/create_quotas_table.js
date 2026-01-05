const { query } = require('../src/infrastructure/database/db');

async function createQuotasTable() {
    try {
        console.log("Creating quotas table...");

        await query(`
            CREATE TABLE IF NOT EXISTS quotas (
                id SERIAL PRIMARY KEY,
                form_id INTEGER REFERENCES forms(id) ON DELETE CASCADE,
                label TEXT NOT NULL,
                limit_count INTEGER NOT NULL,
                current_count INTEGER DEFAULT 0,
                criteria JSONB, 
                action_config JSONB,
                reset_config JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("quotas table created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating quotas table:", err);
        process.exit(1);
    }
}

createQuotasTable();
