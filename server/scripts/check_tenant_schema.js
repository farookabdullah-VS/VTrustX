const { query } = require('../src/infrastructure/database/db');

(async () => {
    try {
        const res = await query("SELECT * FROM tenants LIMIT 1");
        if (res.rows.length > 0) {
            console.log("Tenant Columns:", Object.keys(res.rows[0]));
            console.log("Sample Data:", res.rows[0]);
        } else {
            console.log("Tenants table exists but is empty.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
})();
