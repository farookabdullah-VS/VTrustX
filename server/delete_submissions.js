const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'vtrustx_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function deleteSubmissions() {
    try {
        console.log("Deleting all submissions...");
        await pool.query('DELETE FROM submissions');
        console.log("All submissions deleted successfully.");
    } catch (err) {
        console.error("Error deleting submissions:", err.message);
    } finally {
        pool.end();
    }
}

deleteSubmissions();
