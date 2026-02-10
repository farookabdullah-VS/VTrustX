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
        console.log("Updating tenants and users schema...");

        const alters = [
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}';",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id UUID;",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);"
        ];

        for (const sql of alters) {
            try {
                await pool.query(sql);
                console.log("Executed:", sql);
            } catch (err) {
                console.error("Error:", err.message);
            }
        }

        console.log("Schema update finished!");

    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        await pool.end();
    }
}

migrate();
