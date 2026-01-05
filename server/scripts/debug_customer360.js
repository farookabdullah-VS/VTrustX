const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

// 1. Check DB Direct
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function check() {
    console.log('--- Checking DB ---');
    try {
        const res = await pool.query('SELECT COUNT(*) FROM customers');
        console.log('Customer Count:', res.rows[0].count);

        if (parseInt(res.rows[0].count) === 0) {
            console.log('⚠️ No customers found. Seeding one...');
            await seedCustomer();
        }
    } catch (e) {
        console.error('DB Error:', e.message);
    } finally {
        await pool.end();
    }
}

async function seedCustomer() {
    try {
        // Needs a tenant first? assuming tenant_id 1 exists or fetching one
        const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        const tenantId = tenantRes.rows[0]?.id || 1;

        const insert = `
            INSERT INTO customers (tenant_id, full_name, date_of_birth, nationality, primary_language, kyc_status)
            VALUES ($1, 'Test Customer', '1990-01-01', 'Saudi Arabia', 'ar', 'verified')
            RETURNING id;
        `;
        const res = await pool.query(insert, [tenantId]);
        console.log('✅ Seeded Customer ID:', res.rows[0].id);

        await pool.query("INSERT INTO customer_identities (customer_id, identity_type, identity_value) VALUES ($1, 'email', 'test@example.com')", [res.rows[0].id]);
        console.log('✅ Added Identity');
    } catch (e) {
        console.error('Seed Error:', e.message);
    }
}

check();
