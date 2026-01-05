const { pool } = require('../src/infrastructure/database/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migration_workflow_v2.sql'), 'utf8');
        await pool.query(sql);
        console.log('Workflow V2 Migration applied.');
    } catch (e) { console.error(e); }
    process.exit();
}
run();
