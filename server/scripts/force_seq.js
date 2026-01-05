const { query } = require('../src/infrastructure/database/db');

async function force() {
    try {
        console.log("Forcing sequence jump...");
        await query("SELECT setval(pg_get_serial_sequence('tenants', 'id'), 10000, false)");
        await query("SELECT setval(pg_get_serial_sequence('users', 'id'), 10000, false)");
        console.log("Jumped sequences to 10000.");
        process.exit(0);
    } catch (err) {
        console.error("Force Error:", err);
        process.exit(1);
    }
}
force();
