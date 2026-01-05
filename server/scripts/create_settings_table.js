const db = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log("Creating settings table...");

        await db.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert default SMTP placeholder logic
        // We'll insert nothing for now, let UI handle creation/upsert.

        console.log("Migration complete.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
