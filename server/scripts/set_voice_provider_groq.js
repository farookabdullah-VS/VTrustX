const { query } = require('../src/infrastructure/database/db');

async function setGroq() {
    try {
        console.log("Ensuring settings table exists...");
        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Setting voice_agent_provider to 'groq'...");
        await query(`
            INSERT INTO settings (key, value, updated_at)
            VALUES ('voice_agent_provider', 'groq', NOW())
            ON CONFLICT (key) DO UPDATE SET value = 'groq', updated_at = NOW();
        `);
        console.log("Success: Updated voice_agent_provider to 'groq'");
        process.exit(0);
    } catch (e) {
        console.error("Error updating settings:", e);
        process.exit(1);
    }
}

setGroq();
