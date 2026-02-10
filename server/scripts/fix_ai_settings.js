const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function fixAiSettings() {
    try {
        // Upsert ai_llm_provider
        await query(`
            INSERT INTO settings (key, value) 
            VALUES ('ai_llm_provider', 'groq')
            ON CONFLICT (key) DO UPDATE SET value = 'groq'
        `);
        console.log("Set ai_llm_provider to groq");

        // Ensure groq is active in ai_providers
        await query(`
            UPDATE ai_providers SET is_active = true WHERE provider = 'groq'
        `);
        console.log("Activated groq in ai_providers");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

fixAiSettings();
