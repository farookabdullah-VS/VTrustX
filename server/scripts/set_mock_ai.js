const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function setMock() {
    try {
        await query("UPDATE settings SET value = 'mock' WHERE key = 'ai_llm_provider'");
        console.log("Set ai_llm_provider to mock");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

setMock();
