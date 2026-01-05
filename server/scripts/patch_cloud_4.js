
const { Pool } = require('pg');

const cloudPool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: '127.0.0.1',
    port: 15432,
    database: 'vtrustx-db',
});

async function patch() {
    try {
        console.log('Patching Cloud DB (Round 4)...');
        await cloudPool.query(`ALTER TABLE forms ADD COLUMN IF NOT EXISTS request_by VARCHAR(255);`);
        console.log('Added request_by to forms.');
    } catch (err) {
        console.error('Patch failed:', err);
    } finally {
        await cloudPool.end();
    }
}

patch();
