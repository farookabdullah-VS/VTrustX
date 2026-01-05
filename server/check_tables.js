const { query } = require('./src/infrastructure/database/db');

async function check() {
    try {
        const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tables:", res.rows.map(r => r.table_name));
    } catch (e) {
        console.log("Error:", e);
    }
    process.exit(0);
}
check();
