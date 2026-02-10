const { query } = require('../src/infrastructure/database/db');

async function seedUser() {
    try {
        console.log("Seeding default user...");

        // 1. Create Tenant
        const tenantRes = await query(`
            INSERT INTO tenants (name, plan, subscription_status, created_at)
            VALUES ('Default Organization', 'free', 'active', NOW())
            RETURNING id
        `);
        const tenantId = tenantRes.rows[0].id;
        console.log("Created Tenant:", tenantId);

        // 2. Create User
        // Using explicit ID 1 to match potential stale tokens
        // Password 'admin'
        await query(`
            INSERT INTO users (id, username, password, role, tenant_id, created_at, status)
            VALUES (1, 'admin', 'admin', 'admin', $1, NOW(), 'active')
            ON CONFLICT (id) DO NOTHING
        `, [tenantId]);

        console.log("Created/Ensured User ID 1 (admin/admin)");

    } catch (err) {
        console.error("Seeding Error:", err);
    }
    process.exit(0);
}

seedUser();
