const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'rayix-db',
    password: 'Yaalla@123',
    port: 5432,
});

async function test() {
    try {
        const res = await pool.query('SELECT * FROM submissions');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e.message);
    } finally {
        await pool.end();
    }
}
test();
