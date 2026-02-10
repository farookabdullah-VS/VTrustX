const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function migrate() {
    try {
        console.log("Starting database migration...");

        // 1. Add missing columns to existing tables
        const alters = [
            "ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS title VARCHAR(100);",
            "ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);",
            "ALTER TABLE forms ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);",
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);",
            "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);"
        ];

        for (const sql of alters) {
            try {
                await pool.query(sql);
                console.log("Executed:", sql);
            } catch (err) {
                console.log("Already exists or error for:", sql, err.message);
            }
        }

        // 2. Create missing tables from init.sql
        // I'll just run the whole init.sql and ignore errors for existing tables
        const fs = require('fs');
        const path = require('path');
        const sqlPath = path.join(__dirname, '..', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon and run individually to handle errors gracefully
        const commands = sql.split(';').filter(cmd => cmd.trim());
        for (let cmd of commands) {
            try {
                await pool.query(cmd);
            } catch (err) {
                // Ignore "already exists" errors
                if (!err.message.includes("already exists") && !err.message.includes("multiple primary keys")) {
                    console.error("Error executing command:", cmd.substring(0, 50), "...", err.message);
                }
            }
        }

        console.log("Migration finished!");

    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        await pool.end();
    }
}

migrate();
