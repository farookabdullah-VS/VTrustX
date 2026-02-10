const ensureReportsTable = require('./src/scripts/ensure_reports_table');
const { query } = require('./src/infrastructure/database/db');
require('dotenv').config();

async function run() {
    console.log("Running manual schema update...");
    try {
        await ensureReportsTable();
        console.log("Schema update completed.");

        // Verifying
        const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'config'");
        if (res.rows.length > 0) {
            console.log("SUCCESS: 'config' column exists.");
        } else {
            console.log("FAILURE: 'config' column MISSING.");
        }
    } catch (e) {
        console.error("Manual script error:", e);
    }
    process.exit(0);
}

run();
