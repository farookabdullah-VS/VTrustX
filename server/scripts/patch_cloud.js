
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
        console.log('Patching Cloud DB...');

        // 1. Subscription Expiry
        await cloudPool.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;`);
        console.log('Added subscription_expires_at to tenants.');

        // 2. Tenant ID on Users
        await cloudPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);`);
        console.log('Added tenant_id to users.');

        // 3. Genesys Columns (from add_genesys.js)
        await cloudPool.query(`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS provider VARCHAR(50);`);
        // Note: integrations table in local likely has 'config' JSON which holds genesys details, or specific columns due to add_genesys.js?
        // Let's rely on JSON columns mostly, but if columns differ...

        console.log('Patch complete.');

    } catch (err) {
        console.error('Patch failed:', err);
    } finally {
        await cloudPool.end();
    }
}

patch();
