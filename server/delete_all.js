const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'vtrustx_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function deleteAll() {
    try {
        console.log("Deleting all submissions first...");
        await pool.query('DELETE FROM submissions');

        console.log("Deleting all forms...");
        await pool.query('DELETE FROM forms');

        console.log("All surveys deleted successfully.");
    } catch (err) {
        console.error("Error deleting:", err.message);
    } finally {
        pool.end();
    }
}

deleteAll();
