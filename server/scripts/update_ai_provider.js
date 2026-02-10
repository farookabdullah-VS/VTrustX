const { query } = require('../src/infrastructure/database/db');

async function updateProvider() {
    try {
        console.log("Updating AI Provider to Gemini...");

        // Upsert setting
        const key = 'ai_llm_provider';
        const value = 'gemini';

        const check = await query('SELECT * FROM settings WHERE key = $1', [key]);
        if (check.rows.length === 0) {
            await query('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, value]);
            console.log("Inserted ai_llm_provider = gemini");
        } else {
            await query('UPDATE settings SET value = $2 WHERE key = $1', [key, value]);
            console.log("Updated ai_llm_provider = gemini");
        }

        process.exit(0);
    } catch (e) {
        console.error("Error updating provider:", e);
        process.exit(1);
    }
}

updateProvider();
