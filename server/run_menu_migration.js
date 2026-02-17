const db = require('./src/infrastructure/database/db');

async function runMigration() {
    try {
        console.log('Creating menu_items table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id VARCHAR(100) PRIMARY KEY,
                label VARCHAR(255) NOT NULL,
                group_id VARCHAR(100) NOT NULL,
                group_title VARCHAR(255),
                route VARCHAR(255),
                requires_admin BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Inserting menu items...');
        await db.query(`
            INSERT INTO menu_items (id, label, group_id, group_title, route, requires_admin, sort_order) VALUES
            ('dashboard', 'Dashboard', 'home', NULL, '/dashboard', FALSE, 1),
            ('xm-center', 'XM Center', 'home', NULL, '/cx-ratings', FALSE, 2),
            ('textiq', 'CogniVue', 'home', NULL, '/textiq', FALSE, 3),
            ('surveys', 'Surveys', 'surveys', 'Surveys', '/surveys', FALSE, 10),
            ('survey-results', 'Survey Results', 'surveys', 'Surveys', '/survey-reports', FALSE, 11),
            ('smartreach', 'SmartReach', 'surveys', 'Surveys', '/smartreach', FALSE, 12),
            ('ab-tests', 'A/B Testing', 'surveys', 'Surveys', '/ab-tests', FALSE, 13),
            ('mobile-app', 'Frontline App', 'surveys', 'Surveys', '/mobile-app', FALSE, 14),
            ('templates', 'Templates', 'surveys', 'Surveys', '/templates', FALSE, 15),
            ('ai-surveyor', 'Rayi Voice Agent', 'ai-agents', 'AI Agents', '/ai-surveyor', FALSE, 20),
            ('ai-video-agent', 'Rayi Video Agent', 'ai-agents', 'AI Agents', '/ai-video-agent', FALSE, 21),
            ('tickets', 'Tickets', 'engagement', 'Engagement', '/tickets', FALSE, 30),
            ('xm-directory', 'XM Directory', 'engagement', 'Engagement', '/xm-directory', FALSE, 31),
            ('actions', 'Action Planning', 'engagement', 'Engagement', '/actions', FALSE, 32),
            ('ticket-settings', 'Ticket Configuration', 'engagement', 'Engagement', '/ticket-settings', FALSE, 33),
            ('social-media', 'Social Media Marketing', 'marketing', 'Marketing', '/social-media', FALSE, 40),
            ('social-listening', 'Social Listening', 'marketing', 'Marketing', '/social-listening', FALSE, 41),
            ('reputation', 'Reputation Manager', 'marketing', 'Marketing', '/reputation', FALSE, 42),
            ('cjm', 'Customer Journey Maps', 'journey', 'Journey', '/cjm', FALSE, 50),
            ('cjm-analytics', 'Journey Analytics', 'journey', 'Journey', '/cjm-analytics', FALSE, 51),
            ('journeys', 'Journey Orchestration', 'journey', 'Journey', '/journeys', FALSE, 52),
            ('personas', 'CX Personas', 'personas', 'Personas', '/personas', FALSE, 60),
            ('persona-templates', 'Persona Templates', 'personas', 'Personas', '/persona-templates', FALSE, 61),
            ('cx-ratings', 'CX Dashboards', 'analytics', 'Analytics', '/cx-ratings', FALSE, 70),
            ('survey-reports', 'Survey Reports', 'analytics', 'Analytics', '/survey-reports', FALSE, 71),
            ('analytics-builder', 'Analytics Builder', 'analytics', 'Analytics', '/analytics-builder', FALSE, 72),
            ('analytics-studio', 'Analytics Studio', 'analytics', 'Analytics', '/analytics-studio', FALSE, 73),
            ('analytics-dashboard', 'Dynamic Dashboard', 'analytics', 'Analytics', '/analytics-dashboard', FALSE, 74),
            ('survey-activity-dashboard', 'Survey Activity', 'analytics', 'Analytics', '/survey-activity-dashboard', FALSE, 75),
            ('customer360', 'Unified Customer Profile', 'c360', 'Customer 360', '/customer360', FALSE, 80),
            ('contact-master', 'Contacts', 'c360', 'Customer 360', '/contact-master', FALSE, 81),
            ('workflows', 'Rules Engine', 'ai-decisioning', 'AI & Decisioning', '/workflows', FALSE, 100),
            ('workflows-automation', 'Workflow Automations', 'ai-decisioning', 'AI & Decisioning', '/workflows-automation', FALSE, 101),
            ('ai-settings', 'AI Models', 'ai-decisioning', 'AI & Decisioning', '/ai-settings', FALSE, 102),
            ('integrations', 'Integrations', 'integrations', 'Integrations', '/integrations', FALSE, 110),
            ('api-keys', 'API Keys', 'integrations', 'Integrations', '/api-keys', FALSE, 111),
            ('webhooks', 'Webhooks', 'integrations', 'Integrations', '/webhooks', FALSE, 112),
            ('role-master', 'Access Control', 'governance', 'Governance', '/role-master', FALSE, 120),
            ('2fa-settings', 'Two-Factor Auth', 'governance', 'Governance', '/2fa-settings', FALSE, 121),
            ('sso-providers', 'SSO Providers', 'governance', 'Governance', '/sso-providers', FALSE, 122),
            ('audit-logs', 'Audit Logs', 'governance', 'Governance', '/audit-logs', FALSE, 123),
            ('retention-policy', 'Retention Policy', 'governance', 'Governance', '/retention-policy', FALSE, 124),
            ('ip-whitelist', 'IP Whitelisting', 'governance', 'Governance', '/ip-whitelist', FALSE, 125),
            ('user-management', 'User Management', 'admin', 'Administration', '/user-management', FALSE, 130),
            ('subscription', 'Subscription', 'admin', 'Administration', '/subscription', FALSE, 131),
            ('theme-settings', 'Theme & Branding', 'admin', 'Administration', '/theme-settings', FALSE, 132),
            ('system-settings', 'System Settings', 'admin', 'Administration', '/system-settings', FALSE, 133),
            ('global-admin', 'Global Admin', 'admin', 'Administration', '/global-admin', TRUE, 134),
            ('interactive-manual', 'User Manual', 'help', 'Help', '/interactive-manual', FALSE, 140),
            ('support', 'Support', 'help', 'Help', '/support', FALSE, 141)
            ON CONFLICT (id) DO NOTHING
        `);

        console.log('Creating role_menu_permissions table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS role_menu_permissions (
                id SERIAL PRIMARY KEY,
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                menu_item_id VARCHAR(100) NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
                can_access BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role_id, menu_item_id)
            )
        `);

        await db.query(`CREATE INDEX IF NOT EXISTS idx_role_menu_permissions_role ON role_menu_permissions(role_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_role_menu_permissions_menu ON role_menu_permissions(menu_item_id)`);

        console.log('Granting admin roles access to all menu items...');
        await db.query(`
            INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
            SELECT r.id, m.id, TRUE
            FROM roles r
            CROSS JOIN menu_items m
            WHERE LOWER(r.name) IN ('admin', 'global_admin', 'superadmin')
            ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_access = TRUE
        `);

        console.log('✅ Menu-item permissions migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        throw error;
    } finally {
        process.exit();
    }
}

runMigration();
