const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vtrustx_db',
    port: process.env.DB_PORT || 5432,
};

if (process.env.INSTANCE_CONNECTION_NAME) {
    dbConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    delete dbConfig.port;
} else {
    dbConfig.host = process.env.DB_HOST || '127.0.0.1';
}

const pool = new Pool(dbConfig);

async function createAdminUser() {
    try {
        console.log('Creating admin user...');

        // Check if admin user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            ['admin@example.com', 'admin']
        );

        if (existingUser.rows.length > 0) {
            console.log('⚠️  Admin user already exists. Updating password...');
            const hashedPassword = await bcrypt.hash('admin', 10);
            await pool.query(
                'UPDATE users SET password = $1 WHERE email = $2 OR username = $3',
                [hashedPassword, 'admin@example.com', 'admin']
            );
            console.log('✅ Admin password updated successfully!');
        } else {
            // Get or create default tenant
            let tenantResult = await pool.query('SELECT id FROM tenants LIMIT 1');
            let tenantId;

            if (tenantResult.rows.length === 0) {
                // Create default tenant if none exists
                tenantResult = await pool.query(
                    `INSERT INTO tenants (name, plan, created_at)
                     VALUES ($1, $2, NOW())
                     RETURNING id`,
                    ['Default Organization', 'enterprise']
                );
                tenantId = tenantResult.rows[0].id;
                console.log(`✅ Default tenant created with ID: ${tenantId}`);
            } else {
                tenantId = tenantResult.rows[0].id;
                console.log(`✅ Using existing tenant with ID: ${tenantId}`);
            }

            // Hash password
            const hashedPassword = await bcrypt.hash('admin', 10);

            // Create admin user
            const userResult = await pool.query(
                `INSERT INTO users (tenant_id, username, email, password, role, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING id, username, email, role`,
                [tenantId, 'admin', 'admin@example.com', hashedPassword, 'admin']
            );

            console.log('✅ Admin user created successfully!');
            console.log('User details:', userResult.rows[0]);
        }

        console.log('\n📝 Login credentials:');
        console.log('   Username: admin');
        console.log('   Email: admin@example.com');
        console.log('   Password: admin');
        console.log('\n🌐 Login at: http://localhost:5174/login');

    } catch (err) {
        console.error('❌ Error creating admin user:', err);
        console.error('Error details:', err.message);
    } finally {
        await pool.end();
    }
}

createAdminUser();
