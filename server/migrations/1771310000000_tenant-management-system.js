/**
 * Migration: Comprehensive Tenant Management System
 * Adds tenant management fields, subscription modules, and assignment tables
 */

exports.up = (pgm) => {
    // 1. Enhance tenants table
    pgm.addColumns('tenants', {
        domain: { type: 'varchar(255)', unique: true },
        subdomain: { type: 'varchar(100)', unique: true },
        logo_url: { type: 'text' },
        status: {
            type: 'varchar(50)',
            default: 'active',
            check: "status IN ('active', 'suspended', 'inactive', 'trial')"
        },
        max_users: { type: 'integer', default: 10 },
        max_surveys: { type: 'integer', default: 100 },
        max_responses: { type: 'integer', default: 1000 },
        storage_limit_mb: { type: 'integer', default: 1000 },
        trial_ends_at: { type: 'timestamp' },
        billing_email: { type: 'varchar(255)' },
        billing_address: { type: 'text' },
        tax_id: { type: 'varchar(100)' },
        notes: { type: 'text' },
        settings: { type: 'jsonb', default: '{}' }
    }, { ifNotExists: true });

    // 2. Create subscription_modules table (defines available modules)
    pgm.createTable('subscription_modules', {
        id: 'id',
        module_key: { type: 'varchar(100)', unique: true, notNull: true },
        module_name: { type: 'varchar(255)', notNull: true },
        description: { type: 'text' },
        category: {
            type: 'varchar(50)',
            notNull: true,
            default: 'core'
        },
        icon: { type: 'varchar(50)' },
        is_core: { type: 'boolean', default: false },
        is_active: { type: 'boolean', default: true },
        sort_order: { type: 'integer', default: 0 },
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    // Insert default subscription modules
    pgm.sql(`
        INSERT INTO subscription_modules (module_key, module_name, description, category, icon, is_core, sort_order) VALUES
        -- Core Modules (always included)
        ('surveys', 'Surveys & Forms', 'Create and manage surveys, forms, and questionnaires', 'core', 'ClipboardList', true, 1),
        ('dashboard', 'Dashboard', 'Main dashboard with key metrics and insights', 'core', 'LayoutDashboard', true, 2),
        ('reports', 'Basic Reports', 'Standard reporting and analytics', 'core', 'PieChart', true, 3),

        -- Analytics Modules
        ('analytics-studio', 'Analytics Studio', 'Advanced analytics workspace with custom reports', 'analytics', 'Database', false, 10),
        ('survey-analytics', 'Survey Analytics', 'Detailed survey performance analytics', 'analytics', 'BarChart3', false, 11),
        ('sentiment-analysis', 'Sentiment Analysis', 'AI-powered sentiment and text analytics', 'analytics', 'Bot', false, 12),
        ('persona-analytics', 'Persona Analytics', 'Customer persona insights and behavioral analytics', 'analytics', 'UserCog', false, 13),

        -- Engagement Modules
        ('tickets', 'Ticketing System', 'Customer support ticket management', 'engagement', 'Ticket', false, 20),
        ('xm-directory', 'XM Directory', 'Experience management directory', 'engagement', 'Contact', false, 21),
        ('action-planning', 'Action Planning', 'Create and track action plans', 'engagement', 'Target', false, 22),

        -- Distribution Modules
        ('smartreach', 'SmartReach', 'Multi-channel survey distribution', 'distribution', 'Megaphone', false, 30),
        ('ab-testing', 'A/B Testing', 'Survey A/B testing and optimization', 'distribution', 'FlaskConical', false, 31),
        ('mobile-app', 'Frontline App', 'Mobile experience for frontline workers', 'distribution', 'Smartphone', false, 32),

        -- Marketing Modules
        ('social-media', 'Social Media Marketing', 'Social media campaign management', 'marketing', 'Share2', false, 40),
        ('social-listening', 'Social Listening', 'Monitor social media conversations', 'marketing', 'Radio', false, 41),
        ('reputation', 'Reputation Manager', 'Manage online reputation', 'marketing', 'Star', false, 42),

        -- Journey & CX Modules
        ('cjm', 'Customer Journey Maps', 'Visual customer journey mapping', 'cx', 'Map', false, 50),
        ('journey-analytics', 'Journey Analytics', 'Journey performance analytics', 'cx', 'BarChart3', false, 51),
        ('journey-orchestration', 'Journey Orchestration', 'Automated journey workflows', 'cx', 'Share2', false, 52),
        ('personas', 'CX Personas', 'Customer persona management', 'cx', 'UserCog', false, 53),

        -- AI & Automation
        ('ai-voice-agent', 'AI Voice Agent', 'AI-powered voice survey agent', 'ai', 'PhoneCall', false, 60),
        ('ai-video-agent', 'AI Video Agent', 'AI-powered video survey agent', 'ai', 'Video', false, 61),
        ('workflow-automation', 'Workflow Automation', 'Automated workflows and triggers', 'ai', 'Zap', false, 62),
        ('ai-insights', 'AI Insights', 'AI-generated insights and recommendations', 'ai', 'Bot', false, 63),

        -- Enterprise Features
        ('sso', 'Single Sign-On', 'SSO integration and management', 'enterprise', 'Shield', false, 70),
        ('audit-logs', 'Audit Logs', 'Comprehensive audit logging', 'enterprise', 'ClipboardList', false, 71),
        ('api-access', 'API Access', 'REST API access and webhooks', 'enterprise', 'Key', false, 72),
        ('white-label', 'White Label', 'Custom branding and white-labeling', 'enterprise', 'Palette', false, 73),
        ('advanced-security', 'Advanced Security', '2FA, IP whitelisting, advanced security', 'enterprise', 'Fingerprint', false, 74)
        ON CONFLICT (module_key) DO NOTHING
    `);

    // 3. Create tenant_subscription_modules junction table
    pgm.createTable('tenant_subscription_modules', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE'
        },
        module_id: {
            type: 'integer',
            notNull: true,
            references: 'subscription_modules',
            onDelete: 'CASCADE'
        },
        enabled: { type: 'boolean', default: true, notNull: true },
        enabled_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        expires_at: { type: 'timestamp' },
        usage_limit: { type: 'jsonb' },
        created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
        updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
    });

    pgm.addConstraint('tenant_subscription_modules', 'tenant_subscription_modules_unique', {
        unique: ['tenant_id', 'module_id']
    });

    pgm.createIndex('tenant_subscription_modules', 'tenant_id');
    pgm.createIndex('tenant_subscription_modules', 'module_id');
    pgm.createIndex('tenants', 'status');
    pgm.createIndex('tenants', 'subscription_status');

    // 4. Grant all core modules to existing tenants
    pgm.sql(`
        INSERT INTO tenant_subscription_modules (tenant_id, module_id, enabled)
        SELECT t.id, sm.id, true
        FROM tenants t
        CROSS JOIN subscription_modules sm
        WHERE sm.is_core = true
        ON CONFLICT (tenant_id, module_id) DO NOTHING
    `);

    // Comments
    pgm.sql(`COMMENT ON TABLE subscription_modules IS 'Available subscription modules/features'`);
    pgm.sql(`COMMENT ON TABLE tenant_subscription_modules IS 'Modules assigned to each tenant'`);
};

exports.down = (pgm) => {
    pgm.dropTable('tenant_subscription_modules', { ifExists: true, cascade: true });
    pgm.dropTable('subscription_modules', { ifExists: true, cascade: true });

    pgm.dropColumns('tenants', [
        'domain',
        'subdomain',
        'logo_url',
        'status',
        'max_users',
        'max_surveys',
        'max_responses',
        'storage_limit_mb',
        'trial_ends_at',
        'billing_email',
        'billing_address',
        'tax_id',
        'notes',
        'settings'
    ], { ifExists: true });
};
