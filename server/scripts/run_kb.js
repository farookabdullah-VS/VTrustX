const { pool } = require('../src/infrastructure/database/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migration_kb.sql'), 'utf8');
        await pool.query(sql);
        console.log('KB Migration Applied.');
    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        process.exit();
    }
}
run();
