
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: '127.0.0.1',
    port: 15432,
    database: 'vtrustx-db',
});

async function check() {
    try {
        console.log("Checking plans table...");
        const res = await pool.query("SELECT * FROM information_schema.tables WHERE table_name = 'plans'");
        if (res.rows.length === 0) {
            console.log("Table 'plans' DOES NOT exist.");
        } else {
            console.log("Table 'plans' exists.");
            const count = await pool.query("SELECT count(*) FROM plans");
            console.log("Row count:", count.rows[0].count);
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

check();
