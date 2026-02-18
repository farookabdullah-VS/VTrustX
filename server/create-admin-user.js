const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
};

const pool = new Pool(dbConfig);

async function createAdmin() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        try {
            console.log('Checking for existing admin user...');
            const userCheck = await client.query("SELECT * FROM users WHERE username = $1", ['admin']);

            if (userCheck.rows.length > 0) {
                console.log('✅ Admin user "admin" already exists.');
                // Optional: Update password
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash('Admin@123', salt);
                await client.query("UPDATE users SET password = $1 WHERE username = 'admin'", [hash]);
                console.log('✅ Password reset to: Admin@123');
            } else {
                console.log('Creating new admin user...');

                // 1. Get or Create Tenant
                let tenantId;
                const tenantRes = await client.query("SELECT id FROM tenants WHERE name = 'System Organization' LIMIT 1");

                if (tenantRes.rows.length > 0) {
                    tenantId = tenantRes.rows[0].id;
                } else {
                    console.log('Creating System Tenant...');
                    const newTenant = await client.query(
                        "INSERT INTO tenants (name, plan, subscription_status) VALUES ($1, $2, $3) RETURNING id",
                        ['System Organization', 'enterprise', 'active']
                    );
                    tenantId = newTenant.rows[0].id;
                }

                // 2. Create User
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash('Admin@123', salt);

                await client.query(
                    "INSERT INTO users (username, password, role, tenant_id, email, status) VALUES ($1, $2, $3, $4, $5, $6)",
                    ['admin', hash, 'admin', tenantId, 'admin@rayix.com', 'active']
                );

                console.log('✅ Admin user created successfully.');
                console.log('Username: admin');
                console.log('Password: Admin@123');
            }
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Error creating admin user:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createAdmin();
