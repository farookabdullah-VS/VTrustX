const { query } = require('../src/infrastructure/database/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'add_email_templates.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: add_email_templates.sql');
        await query(sql);
        console.log('Email Templates table created and seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
