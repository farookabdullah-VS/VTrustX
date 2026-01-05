const { query } = require('../src/infrastructure/database/db');

async function migrate() {
    console.log("Adding name and name_ar fields to users table...");
    try {
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);");
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);");
        console.log("Migration successful.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
    process.exit(0);
}

migrate();
