const { query } = require('../src/infrastructure/database/db');

async function listTables() {
    try {
        const res = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

listTables();
