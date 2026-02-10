const { query } = require('../src/infrastructure/database/db');

async function checkUserSimple() {
    try {
        const res = await query('SELECT * FROM users');
        console.log("User Count:", res.rows.length);
        console.log("Users:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

checkUserSimple();
