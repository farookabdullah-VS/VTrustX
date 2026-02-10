
const { query } = require('./server/src/infrastructure/database/db');

async function checkSchema() {
    try {
        console.log("Querying information_schema for table 'reports'...");
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'reports';
        `);

        if (res.rows.length === 0) {
            console.log("Table 'reports' NOT FOUND.");
        } else {
            console.log("Table 'reports' columns:");
            res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
        }
    } catch (err) {
        console.error("Error checking schema:", err);
    } finally {
        process.exit();
    }
}

checkSchema();
