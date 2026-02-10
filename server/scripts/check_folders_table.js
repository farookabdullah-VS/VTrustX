const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Yaalla@123',
    database: process.env.DB_NAME || 'rayix_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
});

async function check() {
    try {
        const res = await pool.query("SELECT * FROM information_schema.tables WHERE table_name = 'folders'");
        if (res.rows.length > 0) {
            console.log("Table 'folders' EXISTS.");
            // Check columns
            const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'folders'");
            console.log("Columns:", cols.rows.map(r => r.column_name).join(', '));
        } else {
            console.log("Table 'folders' DOES NOT EXIST.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

check();
