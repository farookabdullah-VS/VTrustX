const { query } = require('./src/infrastructure/database/db');

async function check() {
    try {
        console.log("Checking columns for cx_personas...");
        const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'cx_personas'");
        console.log("Columns:", res.rows.map(r => r.column_name));
    } catch (e) {
        console.log("Error:", e);
    }
    process.exit(0);
}
check();
