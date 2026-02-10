require('./server/node_modules/dotenv').config({ path: '.env' });
const { query } = require('./server/src/infrastructure/database/db');

async function checkUsersSchema() {
    try {
        const res = await query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);

        console.log("COLUMNS:");
        res.rows.forEach(r => console.log(r.column_name));
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkUsersSchema();
