
const { query } = require('./src/infrastructure/database/db');
const PostgresRepository = require('./src/infrastructure/database/PostgresRepository');
const userRepo = new PostgresRepository('users');

async function test() {
    try {
        console.log('Testing DB connection...');
        const res = await query('SELECT NOW()');
        console.log('DB Connection successful:', res.rows[0]);

        console.log('Testing User Repo...');
        // Try to find a user that likely exists or doesn't, just to test the query
        const user = await userRepo.findBy('username', 'admin');
        console.log('User lookup result:', user ? 'Found' : 'Not Found');

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit();
    }
}

test();
