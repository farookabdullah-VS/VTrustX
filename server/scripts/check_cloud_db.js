const { query } = require('../src/infrastructure/database/db');

async function check() {
    try {
        console.log("Checking Cloud DB Connection...");
        console.log(`DB: ${process.env.DB_NAME} on Port: ${process.env.DB_PORT}`);

        const res = await query('SELECT count(*) FROM tenants');
        console.log("Tenants Count:", res.rows[0].count);

        const res2 = await query('SELECT count(*) FROM users');
        console.log("Users Count:", res2.rows[0].count);

        process.exit(0);
    } catch (e) {
        console.error("Check Failed:", e);
        process.exit(1);
    }
}
check();
