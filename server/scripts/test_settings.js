const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', password: 'postgres', host: 'localhost', port: 5432, database: 'vtrustx_db'
});

async function testInsert() {
    try {
        await pool.query(`
            INSERT INTO settings (key, value, updated_at) 
            VALUES ($1, $2, NOW())
            ON CONFLICT (key) 
            DO UPDATE SET value = $2, updated_at = NOW();
        `, ['test_key', 'test_value']);
        console.log("Insert Success");
    } catch (e) {
        console.error("Insert Failed:", e.message);
    } finally {
        await pool.end();
    }
}
testInsert();
