const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function seed() {
    try {
        console.log("Seeding CRM Data...");

        // Teams
        await pool.query(`INSERT INTO teams (name, description) VALUES 
            ('General Support', 'First line'), 
            ('Billing', 'Finance'), 
            ('Technical', 'L2') 
            ON CONFLICT DO NOTHING`);

        // Make sure we have 1 user
        const userRes = await pool.query(`SELECT id FROM users LIMIT 1`);
        if (userRes.rows.length === 0) {
            await pool.query(`INSERT INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')`);
        }

        console.log("Done.");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

seed();
