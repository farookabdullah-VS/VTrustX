const { query } = require('../src/infrastructure/database/db');
require('dotenv').config();

async function checkSchema() {
    try {
        const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_providers'");
        console.log("Columns in ai_providers:", res.rows.map(r => r.column_name));

        const constraints = await query("SELECT * FROM information_schema.table_constraints WHERE table_name = 'ai_providers'");
        console.log("Constraints:", constraints.rows.map(r => r.constraint_name));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkSchema();
