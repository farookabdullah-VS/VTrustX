const { query } = require('./src/infrastructure/database/db');

async function check() {
    try {
        console.log("Checking cx_personas table...");
        const res = await query('SELECT * FROM cx_personas');
        console.log(`Found ${res.rows.length} rows.`);
        res.rows.forEach(r => {
            console.log(`- ${r.name} (${r.title}) [Tenant: ${r.tenant_id}]`);
        });
    } catch (e) {
        console.log("Error:", e);
    }
    process.exit(0);
}
check();
