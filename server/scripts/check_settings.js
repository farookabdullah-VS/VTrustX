const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', password: 'postgres', host: 'localhost', port: 5432, database: 'vtrustx_db'
});

async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs'");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
