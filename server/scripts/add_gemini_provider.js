const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function fixProviders() {
    try {
        // Use the key found in the files if possible, or use a known one.
        // I'll take the key from root .env which is 39 chars.
        const geminiKey = "AIzaSyBXdkCOtjHTGyEBwlEGYrL8lw7ss1oqI_s";

        await query(`
            INSERT INTO ai_providers (name, provider, api_key, is_active)
            VALUES ('Google Gemini', 'gemini', $1, true)
            ON CONFLICT (provider) DO UPDATE SET api_key = $1, is_active = true
        `, [geminiKey]);

        console.log("Upserted Gemini into ai_providers");

        const res = await query("SELECT provider, is_active FROM ai_providers");
        console.log("Providers:", res.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

fixProviders();
