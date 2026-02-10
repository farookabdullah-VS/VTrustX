const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function setGemini() {
    try {
        await query(`
            INSERT INTO settings (key, value) 
            VALUES ('ai_llm_provider', 'gemini')
            ON CONFLICT (key) DO UPDATE SET value = 'gemini'
        `);
        console.log("Set ai_llm_provider to gemini");

        // Ensure gemini is active in ai_providers
        await query(`
            UPDATE ai_providers SET is_active = true WHERE provider = 'gemini'
        `);
        console.log("Activated gemini in ai_providers");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

setGemini();
