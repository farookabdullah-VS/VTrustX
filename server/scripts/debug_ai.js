const db = require('../src/infrastructure/database/db');

async function run() {
    try {
        console.log("Checking AI Providers...");
        const res = await db.query("SELECT * FROM ai_providers");
        console.log("AI Providers Found:", res.rows.length);
        res.rows.forEach(r => console.log(`- ${r.provider} (Active: ${r.is_active}) Key starts with: ${r.api_key ? r.api_key.substring(0, 5) : 'None'}`));
    } catch (e) {
        console.error("DB Error:", e);
    }
}
run();
