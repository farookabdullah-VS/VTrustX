const { query } = require('../src/infrastructure/database/db');

async function fixSequences() {
    try {
        console.log("Fixing sequences for tables...");

        const tables = ['tenants', 'users', 'forms', 'submissions']; // Add others if needed

        for (const table of tables) {
            try {
                // Determine sequence name dynamically or use pg_get_serial_sequence
                // Logic: Set sequence to MAX(id) + 1
                const res = await query(`SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE(MAX(id), 0) + 1, false) FROM ${table}`, [table]);
                console.log(`Fixed sequence for ${table}.`);
            } catch (e) {
                console.log(`Skipping ${table} (maybe no sequence or text ID):`, e.message);
            }
        }

        console.log("Sequence fix complete.");
        process.exit(0);
    } catch (err) {
        console.error("Critical Error:", err);
        process.exit(1);
    }
}

fixSequences();
