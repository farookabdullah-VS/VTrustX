const db = require('../src/infrastructure/database/db');
async function run() {
    try {
        const res = await db.query("SELECT id, username, role, tenant_id FROM users");
        console.log("Users List:");
        res.rows.forEach(u => console.log(`ID: ${u.id}, User: ${u.username}, Role: ${u.role}, Tenant: ${u.tenant_id}`));
    } catch (e) { console.error(e); }
}
run();
