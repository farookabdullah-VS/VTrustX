const { query } = require('./src/infrastructure/database/db');

async function migrate() {
    console.log("Starting migration...");
    try {
        await query(`
            ALTER TABLE cx_personas 
            ADD COLUMN IF NOT EXISTS photo_url TEXT,
            ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{"left": [], "right": []}';
        `);
        console.log("Migration successful: Added photo_url and layout_config to cx_personas.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
