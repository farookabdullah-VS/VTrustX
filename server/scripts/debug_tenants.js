const { query } = require('../src/infrastructure/database/db');

async function debug() {
    try {
        console.log("--- Debugging Tenants Table ---");
        const rows = await query('SELECT id, name FROM tenants ORDER BY id ASC');
        console.log("Existing Tenants:", JSON.stringify(rows.rows, null, 2));

        const seqNameRes = await query(`SELECT pg_get_serial_sequence('tenants', 'id')`);
        const seqName = seqNameRes.rows[0].pg_get_serial_sequence;
        console.log("Sequence Name:", seqName);

        if (seqName) {
            const seqVal = await query(`SELECT last_value, is_called FROM ${seqName}`);
            console.log("Sequence State:", seqVal.rows[0]);
        } else {
            console.log("No sequence found for tenants.id");
        }

        process.exit(0);
    } catch (e) {
        console.error("Debug Error:", e);
        process.exit(1);
    }
}
debug();
