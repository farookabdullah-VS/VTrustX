
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path to .env if needed

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkConfig() {
    try {
        const aiProviders = await pool.query('SELECT * FROM ai_providers');
        console.log('AI Providers:', aiProviders.rows);

        const settings = await pool.query("SELECT * FROM settings WHERE key IN ('voice_agent_provider', 'ai_llm_provider')");
        console.log('Settings:', settings.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkConfig();
