require('./server/node_modules/dotenv').config({ path: './server/.env' });
const { query } = require('./server/src/infrastructure/database/db');

async function checkCJM() {
    try {
        console.log("Checking CJM Table...");
        const res = await query("SELECT table_name FROM information_schema.tables WHERE table_name = 'cjm_maps'");
        if (res.rows.length > 0) {
            console.log("Table 'cjm_maps' EXISTS.");
            // Check columns
            const cols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cjm_maps'");
            console.table(cols.rows);
        } else {
            console.log("Table 'cjm_maps' DOES NOT EXIST.");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkCJM();
