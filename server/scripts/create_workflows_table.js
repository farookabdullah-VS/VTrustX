const db = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log("Creating workflows table...");

        await db.query(`
            CREATE TABLE IF NOT EXISTS workflows (
                id SERIAL PRIMARY KEY,
                form_id INTEGER REFERENCES forms(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                trigger_event VARCHAR(50) NOT NULL DEFAULT 'submission_completed',
                conditions JSONB DEFAULT '[]',
                actions JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Migration complete.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
