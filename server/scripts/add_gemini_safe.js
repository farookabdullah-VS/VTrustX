const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function addGemini() {
    try {
        const check = await query("SELECT id FROM ai_providers WHERE provider = 'gemini'");
        const geminiKey = "AIzaSyBXdkCOtjHTGyEBwlEGYrL8lw7ss1oqI_s";

        if (check.rows.length > 0) {
            await query("UPDATE ai_providers SET api_key = $1, is_active = true WHERE provider = 'gemini'", [geminiKey]);
            console.log("Updated Gemini");
        } else {
            await query("INSERT INTO ai_providers (name, provider, api_key, is_active) VALUES ('Google Gemini', 'gemini', $1, true)", [geminiKey]);
            console.log("Inserted Gemini");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

addGemini();
