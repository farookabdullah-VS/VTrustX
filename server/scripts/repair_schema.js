const { query } = require('../src/infrastructure/database/db');

async function repairSchema() {
    console.log("Repairing Schema...");

    try {
        // 1. Create Tenants Table
        await query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                plan VARCHAR(50) DEFAULT 'free',
                subscription_status VARCHAR(50) DEFAULT 'active',
                subscription_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Verified 'tenants' table.");

        // 2. Add tenant_id to users if missing
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
        `);
        console.log("Verified 'tenant_id' column in users.");

        // 3. Seed Default Tenant
        const tenantRes = await query(`
            INSERT INTO tenants (id, name, plan, subscription_status)
            VALUES (1, 'Default Organization', 'free', 'active')
            ON CONFLICT (id) DO NOTHING
            RETURNING id;
        `);
        console.log("Verified Default Tenant.");

        // 4. Seed Default Admin
        // Use ON CONFLICT to avoid errors if exists
        await query(`
            INSERT INTO users (id, username, password, role, tenant_id, status)
            VALUES (1, 'admin', 'admin', 'admin', 1, 'active')
            ON CONFLICT (id) DO UPDATE 
            SET tenant_id = 1, status = 'active'
            WHERE users.username = 'admin';
        `);
        console.log("Verified Default Admin User (admin/admin).");

    } catch (err) {
        console.error("Repair Error:", err);
    }

    process.exit(0);
}

repairSchema();
