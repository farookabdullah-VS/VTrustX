const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function listAll() {
    try {
        const res = await query("SELECT provider FROM ai_providers");
        console.log("Registered Providers:", res.rows.map(r => r.provider));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

listAll();
