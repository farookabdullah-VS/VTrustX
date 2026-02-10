const { pool } = require('./src/infrastructure/database/db');

async function check() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'forms'");
        res.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
    } catch (e) { console.error(e); }
    finally { pool.end(); }
}
check();
