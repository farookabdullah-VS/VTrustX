const { pool } = require('./src/infrastructure/database/db');

async function checkDb() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables in database:', res.rows.map(r => r.table_name));

        const rolesRes = await pool.query("SELECT * FROM roles LIMIT 1");
        console.log('Roles table exists and is accessible.');
    } catch (err) {
        console.error('Database check failed:', err.message);
    } finally {
        await pool.end();
    }
}

checkDb();
