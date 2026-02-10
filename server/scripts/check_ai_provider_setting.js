const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function check() {
    try {
        const res = await query("SELECT key, value FROM settings WHERE key = 'ai_llm_provider'");
        console.log("Settings:", res.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

check();
