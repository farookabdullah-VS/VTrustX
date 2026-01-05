const { query } = require('../src/infrastructure/database/db');

(async () => {
    const targetEmail = 'farook.abdullah@gmail.com';
    const targetRole = 'admin';

    // 1. Check if user exists
    const userRes = await query("SELECT * FROM users WHERE email = $1", [targetEmail]);

    if (userRes.rows.length > 0) {
        // Update existing
        console.log(`User ${targetEmail} found. Promoting to admin...`);
        await query("UPDATE users SET role = $1 WHERE email = $2", [targetRole, targetEmail]);
        console.log("Updated successfully.");
    } else {
        // Create new
        console.log(`User ${targetEmail} not found. Creating as admin...`);

        // Ensure a tenant exists (or create one)
        const tenantName = "Farook's Organization";
        const tRes = await query("INSERT INTO tenants (name, plan, subscription_status) VALUES ($1, 'enterprise', 'active') RETURNING id", [tenantName]);
        const tenantId = tRes.rows[0].id;

        await query(`
            INSERT INTO users (username, email, password, role, tenant_id, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, ['farook', targetEmail, 'manual-creation', targetRole, tenantId]);

        console.log("Created successfully.");
    }
})();
