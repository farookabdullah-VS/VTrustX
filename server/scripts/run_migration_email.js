const { pool } = require('../src/infrastructure/database/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migration_email.sql'), 'utf8');
        await pool.query(sql);
        console.log('Migration "email_channels" applied successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

runMigration();
