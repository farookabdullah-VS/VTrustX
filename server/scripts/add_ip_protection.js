const { query } = require('../src/infrastructure/database/db');

async function migrate() {
    console.log("Adding allowed_ips to forms...");
    try {
        await query("ALTER TABLE forms ADD COLUMN IF NOT EXISTS allowed_ips TEXT;");
        console.log("Column 'allowed_ips' verified/added.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
    process.exit(0);
}

migrate();
