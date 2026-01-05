const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path to root

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function runMigration() {
    try {
        console.log("Adding approval workflow columns to forms table...");

        await pool.query(`
            ALTER TABLE forms 
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
            ADD COLUMN IF NOT EXISTS request_by VARCHAR(255),
            ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
        `);

        // Update existing published forms to 'published' status
        await pool.query(`
            UPDATE forms SET status = 'published' WHERE is_published = TRUE AND status = 'draft';
        `);

        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

runMigration();
