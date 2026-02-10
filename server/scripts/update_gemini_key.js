const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function updateGeminiKey() {
    try {
        const newKey = "AIzaSyAXydR4t_mzpEP6HTt6jWK1wXNsBpnyRTQ";
        await query(`
            INSERT INTO ai_providers (name, provider, api_key, is_active)
            VALUES ('Google Gemini', 'gemini', $1, true)
            ON CONFLICT (provider) DO UPDATE SET api_key = $1, is_active = true
        `, [newKey]);
        console.log("Updated Gemini key in database.");

        await query(`
            INSERT INTO settings (key, value) 
            VALUES ('ai_llm_provider', 'gemini')
            ON CONFLICT (key) DO UPDATE SET value = 'gemini'
        `);
        console.log("Set default provider to gemini.");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

updateGeminiKey();
