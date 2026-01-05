const { query } = require('./src/infrastructure/database/db');

async function test() {
    try {
        console.log("Testing select with integer on varchar column...");
        await query('SELECT * FROM tenants WHERE id = $1', [1]);
        console.log('Query Success');
    } catch (e) {
        console.log('Query Failed:', e.message);
    }
    process.exit(0);
}
test();
