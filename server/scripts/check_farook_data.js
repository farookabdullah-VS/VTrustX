const { query } = require('../src/infrastructure/database/db');

(async () => {
    try {
        const email = 'farook.abdullah@gmail.com';

        // 1. Get User
        const userRes = await query("SELECT id, username, email, tenant_id FROM users WHERE email = $1", [email]);
        if (userRes.rows.length === 0) {
            console.log(`User ${email} not found.`);
            return;
        }
        const user = userRes.rows[0];
        console.log('User:', user);

        // 2. Get Tenant
        const tenantRes = await query("SELECT id, name FROM tenants WHERE id = $1", [user.tenant_id]);
        if (tenantRes.rows.length === 0) {
            console.log(`Tenant ${user.tenant_id} not found.`);
        } else {
            console.log('Tenant:', tenantRes.rows[0]);
        }

        // 3. Get Forms for Tenant
        const formsRes = await query("SELECT id, title, is_published, tenant_id FROM forms WHERE tenant_id = $1", [user.tenant_id]);
        console.log(`Found ${formsRes.rows.length} forms for tenant ${user.tenant_id}:`);
        formsRes.rows.forEach(f => {
            console.log(`- [${f.id}] ${f.title} (Published: ${f.is_published})`);
        });

    } catch (e) {
        console.error(e);
    }
})();
