const { pool } = require('./src/infrastructure/database/db');

async function checkSchema() {
    try {
        const tables = ['tenants', 'users', 'forms'];
        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}' AND column_name = 'id'
            `);
            console.log(`Table ${table} 'id' type:`, res.rows[0]);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
