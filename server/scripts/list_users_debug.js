const { query } = require('../src/infrastructure/database/db');

async function listUsers() {
    try {
        const res = await query('SELECT id, username, email FROM users');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

listUsers();
