const { query } = require('../src/infrastructure/database/db');

async function fixSchema() {
    try {
        console.log("Creating settings table...");
        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Settings table created.");

        // Insert default provider
        await query(`
            INSERT INTO settings (key, value) 
            VALUES ('ai_llm_provider', 'gemini'), ('voice_agent_provider', 'google')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        `);
        console.log("Default settings inserted.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixSchema();
