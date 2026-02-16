const { query } = require('./src/infrastructure/database/db');

async function testUpdate() {
    try {
        const res = await query(`UPDATE users SET last_login_at = NOW() WHERE username = 'admin'`);
        console.log('Update successful:', res.rowCount, 'rows updated');
    } catch (e) {
        console.error('Update failed:', e.message);
    } finally {
        process.exit();
    }
}

testUpdate();
