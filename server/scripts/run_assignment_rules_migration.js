const { query } = require('../src/infrastructure/database/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'add_assignment_rules.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: add_assignment_rules.sql');
        await query(sql);
        console.log('Assignment Rules table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
