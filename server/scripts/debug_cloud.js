
const { Pool } = require('pg');

const cloudPool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: '127.0.0.1',
    port: 15432,
    database: 'vtrustx-db',
});

async function debug() {
    try {
        console.log('Testing Cloud DB Access...');

        // 1. Check Table Exists
        const res = await cloudPool.query(`
            SELECT to_regclass('public.tenants');
        `);
        console.log('Table exists check:', res.rows[0]);

        // 2. Select Count
        const count = await cloudPool.query('SELECT count(*) FROM "tenants"');
        console.log('Row count:', count.rows[0].count);

        // 3. Insert specific row
        await cloudPool.query(`
            INSERT INTO tenants (name, plan) VALUES ('Debug Tenant', 'free') RETURNING id
        `);
        console.log('Insert success.');

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        await cloudPool.end();
    }
}

debug();
