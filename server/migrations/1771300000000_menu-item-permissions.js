/**
 * Migration: Menu-Item Level Permissions
 * Replace module-level permissions with menu-item-level permissions
 */

exports.up = (pgm) => {
    // 1. Create menu_items table (reference data)
    pgm.createTable('menu_items', {
        id: { type: 'varchar(100)', primaryKey: true },
        label: { type: 'varchar(255)', notNull: true },
        group_id: { type: 'varchar(100)', notNull: true },
        group_title: { type: 'varchar(255)' },
        route: { type: 'varchar(255)' },
        requires_admin: { type: 'boolean', default: false },
        is_active: { type: 'boolean', default: true },
        sort_order: { type: 'integer', default: 0 },
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Insert menu items
    pgm.sql(`INSERT INTO menu_items (id, label, group_id, group_title, route, requires_admin, sort_order) VALUES
('dashboard', 'Dashboard', 'home', NULL, '/dashboard', FALSE, 1),
('surveys', 'Surveys', 'surveys', 'Surveys', '/surveys', FALSE, 10),
('tickets', 'Tickets', 'engagement', 'Engagement', '/tickets', FALSE, 30),
('user-management', 'User Management', 'admin', 'Administration', '/user-management', FALSE, 130)
ON CONFLICT (id) DO NOTHING`);

    // 2. Create role_menu_permissions table
    pgm.createTable('role_menu_permissions', {
        id: 'id',
        role_id: { type: 'integer', notNull: true, references: 'roles', onDelete: 'CASCADE' },
        menu_item_id: { type: 'varchar(100)', notNull: true, references: 'menu_items', onDelete: 'CASCADE' },
        can_access: { type: 'boolean', default: true },
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    pgm.addConstraint('role_menu_permissions', 'role_menu_permissions_unique', { unique: ['role_id', 'menu_item_id'] });
    pgm.createIndex('role_menu_permissions', 'role_id');
};

exports.down = (pgm) => {
    pgm.dropTable('role_menu_permissions', { ifExists: true, cascade: true });
    pgm.dropTable('menu_items', { ifExists: true, cascade: true });
};
