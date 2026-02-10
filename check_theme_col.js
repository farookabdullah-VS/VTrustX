require('./server/node_modules/dotenv').config({ path: '.env' });
const { query } = require('./server/src/infrastructure/database/db');

async function checkThemeColumn() {
    try {
        console.log("Checking 'theme' column type in 'tenants' table...");
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tenants' AND column_name = 'theme';
        `);

        if (res.rows.length > 0) {
            console.log("THEME COLUMN TYPE:", res.rows[0].data_type);
        } else {
            console.log("Tenants table or theme column not found.");
            // We probably need to create it!
        }
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkThemeColumn();
