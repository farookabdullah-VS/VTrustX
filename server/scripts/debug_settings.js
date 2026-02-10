const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function checkSettings() {
    try {
        const res = await query("SELECT * FROM settings");
        console.log("Settings:", res.rows);

        const providers = await query("SELECT * FROM ai_providers");
        console.log("AI Providers:", providers.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkSettings();
