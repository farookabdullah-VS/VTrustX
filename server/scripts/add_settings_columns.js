const db = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log("Adding settings columns to forms table...");

        const queries = [
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;",
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;",
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS response_limit INTEGER;",
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS redirect_url TEXT;",
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS password VARCHAR(255);"
        ];

        for (const q of queries) {
            await db.query(q);
        }

        console.log("Migration complete.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
