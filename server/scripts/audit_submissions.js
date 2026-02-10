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
        // 1. Count Forms
        const formRes = await pool.query('SELECT id, title, slug FROM forms');
        report.forms = formRes.rows;

        // 2. Count Submissions per Form
        const subRes = await pool.query('SELECT form_id, COUNT(*) as count FROM submissions GROUP BY form_id');
        report.counts = subRes.rows;

        // 3. Sample Submissions
        const rawRes = await pool.query('SELECT id, form_id, created_at, data FROM submissions LIMIT 5');
        report.samples = rawRes.rows;

        fs.writeFileSync('audit_report.json', JSON.stringify(report, null, 2));

    } catch (err) {
        fs.writeFileSync('audit_error.txt', err.toString());
    } finally {
        await pool.end();
    }
}

audit();
