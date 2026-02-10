const { query } = require('../server/src/infrastructure/database/db');

async function checkColumns() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cx_personas';
        `);
        console.log("Columns in cx_personas:");
        res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkColumns();
