const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function checkKeys() {
    try {
        const res = await query("SELECT id, name, provider, api_key, is_active FROM ai_providers");
        res.rows.forEach(row => {
            console.log(`Provider: ${row.provider}, Active: ${row.is_active}, Key Length: ${row.api_key ? row.api_key.length : 0}`);
            if (row.api_key) console.log(`Key Prefix: ${row.api_key.substring(0, 7)}...`);
        });
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkKeys();
