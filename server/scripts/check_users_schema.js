const { query } = require('../src/infrastructure/database/db');

(async () => {
    try {
        const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('Users columns:', res.rows.map(r => r.column_name));
    } catch (e) {
        console.error(e);
    }
})();
