require('./server/node_modules/dotenv').config({ path: '.env' });
const { query } = require('./server/src/infrastructure/database/db');
const bcrypt = require('./server/node_modules/bcryptjs');

async function createAdmin() {
    try {
        console.log("Checking/Creating Admin User...");

        // 1. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('Admin@123', salt);

        // 2. Check if admin exists (check by email or username if it exists)
        // I'll check by email 'admin@rayix.com' first.
        // Also check columns just in case, but let's try the query.

        console.log("Checking for existing admin user...");
        const existing = await query("SELECT * FROM users WHERE email = $1", ['admin@rayix.com']);

        if (existing.rows.length > 0) {
            console.log("Admin user (admin@rayix.com) already exists. Updating password...");
            await query("UPDATE users SET password = $1 WHERE email = $2", [hash, 'admin@rayix.com']);
            console.log("Password updated to 'Admin@123'.");
        } else {
            console.log("Admin user not found. Creating...");

            // 3. Ensure Default Tenant
            let tenantId;
            const tenantRes = await query("SELECT id FROM tenants LIMIT 1"); // Just grab first tenant or create one

            if (tenantRes.rows.length === 0) {
                console.log("No tenants found. Creating 'System Organization'...");
                const newTenant = await query(
                    "INSERT INTO tenants (name, plan, subscription_status) VALUES ($1, $2, $3) RETURNING id",
                    ['System Organization', 'enterprise', 'active']
                );
                tenantId = newTenant.rows[0].id;
            } else {
                tenantId = tenantRes.rows[0].id;
                console.log(`Using existing tenant ID: ${tenantId}`);
            }

            // 4. Insert User
            // Columns: id, tenant_id, team_id, created_at, photo_url, role, status, username, password, email
            await query(
                "INSERT INTO users (username, password, role, tenant_id, email, status) VALUES ($1, $2, $3, $4, $5, $6)",
                ['admin', hash, 'admin', tenantId, 'admin@rayix.com', 'active']
            );
            console.log("Admin user created successfully.");
            console.log("Email: admin@rayix.com");
            console.log("Password: Admin@123");
        }

        process.exit(0);
    } catch (e) {
        console.error("Error creating admin user:", e);
        process.exit(1);
    }
}

createAdmin();
