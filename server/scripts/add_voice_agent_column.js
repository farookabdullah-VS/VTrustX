const { query } = require('../src/infrastructure/database/db');

async function migrate() {
    console.log("Adding enable_voice_agent to forms...");
    try {
        await query("ALTER TABLE forms ADD COLUMN IF NOT EXISTS enable_voice_agent BOOLEAN DEFAULT FALSE;");
        console.log("Column added successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
    process.exit(0);
}

migrate();
