const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function updateGeminiKey() {
    try {
        const newKey = "AIzaSyAXydR4t_mzpEP6HTt6jWK1wXNsBpnyRTQ";
        const res = await query(`UPDATE ai_providers SET api_key = $1, is_active = true WHERE provider = 'gemini'`, [newKey]);
        console.log("Update result:", res.rowCount);

        if (res.rowCount === 0) {
            await query(`INSERT INTO ai_providers (name, provider, api_key, is_active) VALUES ('Google Gemini', 'gemini', $1, true)`, [newKey]);
            console.log("Inserted instead.");
        }
    } catch (err) {
        console.error("Error Detail:", err.message);
        if (err.detail) console.error("Detail:", err.detail);
    } finally {
        process.exit();
    }
}

updateGeminiKey();
