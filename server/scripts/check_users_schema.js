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
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('id', 'tenant_id')");
        console.log("Users Schema:", res.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

check();
