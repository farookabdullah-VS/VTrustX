const { pool } = require('./src/infrastructure/database/db');

async function checkColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'submissions'
        `);
        console.log("Submissions Table Columns:");
        res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkColumns();
