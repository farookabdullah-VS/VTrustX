require('./server/node_modules/dotenv').config({ path: '.env' });
const { query } = require('./server/src/infrastructure/database/db');

async function checkTables() {
    try {
        console.log("Checking tables in the database...");
        const res = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        if (res.rows.length === 0) {
            console.log("No tables found in public schema.");
        } else {
            console.log("Tables found in cloud database:");
            res.rows.forEach(r => console.log(`- ${r.table_name}`));
        }
        process.exit(0);
    } catch (e) {
        console.error("Error checking tables:", e);
        process.exit(1);
    }
}

checkTables();
