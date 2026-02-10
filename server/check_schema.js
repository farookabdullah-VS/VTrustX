const { query } = require('./src/infrastructure/database/db');

async function checkSchema() {
    try {
        console.log("--- Tables ---");
        const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(tables.rows.map(r => r.table_name));

        for (const table of tables.rows) {
            console.log(`\n--- Columns in ${table.table_name} ---`);
            const columns = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table.table_name}'`);
            console.log(columns.rows);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
