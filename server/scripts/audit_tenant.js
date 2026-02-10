const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Suppress console.log from dotenv
const originalLog = console.log;
console.log = function () { };
require('dotenv').config({ path: path.join(__dirname, '../.env') });
console.log = originalLog;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function audit() {
    const report = {};
    try {
        // 1. Audit Form Owner & Definition
        const formRes = await pool.query('SELECT id, title, tenant_id, definition FROM forms WHERE id = 1');
        report.form = formRes.rows[0];

        // 2. Audit Admin User Tenant
        const userRes = await pool.query("SELECT id, username, tenant_id FROM users WHERE username = 'admin'");
        report.user = userRes.rows[0];

        // 3. Audit Tenant
        if (report.user) {
            const tenantRes = await pool.query('SELECT * FROM tenants WHERE id = $1', [report.user.tenant_id]);
            report.tenant = tenantRes.rows[0];
        }

        fs.writeFileSync('audit_tenant_report.json', JSON.stringify(report, null, 2));

    } catch (err) {
        fs.writeFileSync('audit_error.txt', err.toString());
    } finally {
        await pool.end();
    }
}

audit();
