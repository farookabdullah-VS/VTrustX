const { query } = require('../src/infrastructure/database/db');

async function migrate() {
    console.log("Adding phone and 2fa fields to users table...");
    try {
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);");
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;");
        console.log("Migration successful.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
    process.exit(0);
}

migrate();
