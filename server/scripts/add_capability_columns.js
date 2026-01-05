const db = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log("Adding capability settings columns to forms table...");

        const queries = [
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS allow_audio BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS allow_camera BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS allow_location BOOLEAN DEFAULT FALSE;"
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
