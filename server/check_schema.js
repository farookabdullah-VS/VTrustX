const { query } = require('./src/infrastructure/database/db');
async function check() {
    try {
        const res = await query("SELECT id, name FROM tenants");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
