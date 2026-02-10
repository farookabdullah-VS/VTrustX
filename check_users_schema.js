require('./server/node_modules/dotenv').config({ path: '.env' });
const { query } = require('./server/src/infrastructure/database/db');

async function checkUsersSchema() {
    try {
        console.log("Checking columns in 'users' table...");
        const res = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);

        console.table(res.rows);
        process.exit(0);
    } catch (e) {
        console.error("Error checking users schema:", e);
        process.exit(1);
    }
}

checkUsersSchema();
