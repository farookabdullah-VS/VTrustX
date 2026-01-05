const { query } = require('../src/infrastructure/database/db');

async function fix() {
    console.log("Fixing Tenants Schema...");
    try {
        await query("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active'");
        await query("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP");

        // Ensure Admin Tenant exists
        const res = await query("SELECT id FROM tenants WHERE id = '1'");
        if (res.rows.length === 0) {
            console.log("Creating Admin Tenant (id=1)...");
            await query(`INSERT INTO tenants (id, name, plan_id, status, subscription_status) 
                         VALUES ('1', 'System Admin', NULL, 'active', 'active')`);
        }

    } catch (e) {
        console.error(e);
    }
    console.log("Done.");
    process.exit(0);
}
fix();
