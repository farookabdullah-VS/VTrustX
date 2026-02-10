const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function checkKeys() {
    try {
        const res = await query("SELECT id, name, provider, api_key, is_active FROM ai_providers");
        console.log("AI Providers with Keys:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkKeys();
