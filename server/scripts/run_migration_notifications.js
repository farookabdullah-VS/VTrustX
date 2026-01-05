const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function runMigration() {
    try {
        console.log("Reading migration script...");
        const sql = fs.readFileSync(path.join(__dirname, 'migration_notifications.sql'), 'utf8');

        console.log("Executing migration...");
        await pool.query(sql);

        console.log("Migration executed successfully: Notifications table created.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

runMigration();
