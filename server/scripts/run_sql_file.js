const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runScript() {
    const filename = process.argv[2];
    if (!filename) {
        console.error("Please provide a SQL filename.");
        process.exit(1);
    }

    try {
        const sql = fs.readFileSync(filename, 'utf8');
        console.log(`Executing ${filename}...`);
        await pool.query(sql);
        console.log("Success.");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

runScript();
