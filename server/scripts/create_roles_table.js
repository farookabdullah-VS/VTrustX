const { pool } = require('../src/infrastructure/database/db');

async function createRolesTable() {
    const client = await pool.connect();
    try {
        console.log('Creating roles table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(50) NOT NULL,
                description TEXT,
                permissions JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add role_id to users if not exists
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='role_id') THEN
                    ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);
                END IF;
            END $$;
        `);

        console.log('Roles table and column added successfully.');

    } catch (err) {
        console.error('Error creating roles table:', err);
    } finally {
        client.release();
    }
}

createRolesTable().then(() => process.exit());
