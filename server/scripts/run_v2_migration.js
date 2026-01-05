const { query } = require('../src/infrastructure/database/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'upgrade_customer360_schema_v2.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: upgrade_customer360_schema_v2.sql');
        await query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
