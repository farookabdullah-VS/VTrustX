const { query } = require('../src/infrastructure/database/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'add_customer_advanced_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: add_customer_advanced_schema.sql');
        await query(sql);
        console.log('Advanced Customer 360 tables created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
