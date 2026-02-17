const { query } = require('./src/infrastructure/database/db');

async function applyMenuMigration() {
    try {
        console.log('🔄 Applying menu-item permissions migration...\n');

        // Check if tables already exist
        const checkTables = await query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name IN ('menu_items', 'role_menu_permissions')
        `);

        if (checkTables.rows.length > 0) {
            console.log('✅ Menu tables already exist. Migration not needed.');
            console.log('   Existing tables:', checkTables.rows.map(r => r.table_name).join(', '));
            process.exit(0);
        }

        // 1. Create menu_items table
        console.log('1️⃣  Creating menu_items table...');
        await query(`
            CREATE TABLE menu_items (
                id VARCHAR(100) PRIMARY KEY,
                label VARCHAR(255) NOT NULL,
                group_id VARCHAR(100) NOT NULL,
                group_title VARCHAR(255),
                route VARCHAR(255),
                requires_admin BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ menu_items table created\n');

        // 2. Insert menu items
        console.log('2️⃣  Inserting menu items...');
        await query(`
            INSERT INTO menu_items (id, label, group_id, group_title, route, requires_admin, sort_order) VALUES
            ('dashboard', 'Dashboard', 'home', NULL, '/dashboard', FALSE, 1),
            ('surveys', 'Surveys', 'surveys', 'Surveys', '/surveys', FALSE, 10),
            ('tickets', 'Tickets', 'engagement', 'Engagement', '/tickets', FALSE, 30),
            ('user-management', 'User Management', 'admin', 'Administration', '/user-management', FALSE, 130)
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Menu items inserted\n');

        // 3. Create role_menu_permissions table
        console.log('3️⃣  Creating role_menu_permissions table...');
        await query(`
            CREATE TABLE role_menu_permissions (
                id SERIAL PRIMARY KEY,
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                menu_item_id VARCHAR(100) NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
                can_access BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT role_menu_permissions_unique UNIQUE (role_id, menu_item_id)
            )
        `);
        console.log('   ✅ role_menu_permissions table created\n');

        // 4. Create index
        console.log('4️⃣  Creating index...');
        await query(`CREATE INDEX idx_role_menu_permissions_role_id ON role_menu_permissions(role_id)`);
        console.log('   ✅ Index created\n');

        console.log('✅ Menu-item permissions migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

applyMenuMigration();
