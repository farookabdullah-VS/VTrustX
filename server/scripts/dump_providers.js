const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function dump() {
    try {
        const res = await query("SELECT * FROM ai_providers");
        res.rows.forEach(r => {
            console.log(`ID: ${r.id}, Name: ${r.name}, Provider: ${r.provider}, Active: ${r.is_active}`);
        });
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

dump();
