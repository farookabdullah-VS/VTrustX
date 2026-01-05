
const { Pool } = require('pg');

const cloudPool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: '127.0.0.1',
    port: 15432,
    database: 'vtrustx-db',
});

async function listCloudTables() {
    try {
        const res = await cloudPool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Cloud Tables:', res.rows.map(r => r.table_name));
    } catch (err) {
        console.error('Error connecting to cloud DB:', err);
    } finally {
        await cloudPool.end();
    }
}

listCloudTables();
