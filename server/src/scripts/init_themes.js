const { query } = require('../infrastructure/database/db');

async function init() {
    try {
        console.log("Initializing Themes table...");
        await query(`
            CREATE TABLE IF NOT EXISTS themes (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                config JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Themes table created or already exists.");

        // Add index on tenant_id
        await query("CREATE INDEX IF NOT EXISTS idx_themes_tenant ON themes(tenant_id);");

        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

init();
