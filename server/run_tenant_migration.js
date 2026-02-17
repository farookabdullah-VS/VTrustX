const db = require('./src/infrastructure/database/db');

async function runMigration() {
    try {
        console.log('🚀 Starting Tenant Management System migration...\n');

        // Check if columns already exist
        const check = await db.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'tenants' AND column_name = 'domain'
        `);

        if (check.rows.length > 0) {
            console.log('⚠️  Migration already applied (domain column exists)');
            process.exit(0);
        }

        console.log('1️⃣  Enhancing tenants table...');
        await db.query(`
            ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS domain VARCHAR(255) UNIQUE,
            ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE,
            ADD COLUMN IF NOT EXISTS logo_url TEXT,
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive', 'trial')),
            ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10,
            ADD COLUMN IF NOT EXISTS max_surveys INTEGER DEFAULT 100,
            ADD COLUMN IF NOT EXISTS max_responses INTEGER DEFAULT 1000,
            ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER DEFAULT 1000,
            ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS billing_address TEXT,
            ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100),
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'
        `);
        console.log('✅ Tenants table enhanced\n');

        console.log('2️⃣  Creating subscription_modules table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS subscription_modules (
                id SERIAL PRIMARY KEY,
                module_key VARCHAR(100) UNIQUE NOT NULL,
                module_name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(50) NOT NULL DEFAULT 'core',
                icon VARCHAR(50),
                is_core BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Subscription modules table created\n');

        console.log('3️⃣  Inserting default modules...');
        await db.query(`
            INSERT INTO subscription_modules (module_key, module_name, description, category, icon, is_core, sort_order) VALUES
            ('surveys', 'Surveys & Forms', 'Create and manage surveys, forms, and questionnaires', 'core', 'ClipboardList', true, 1),
            ('dashboard', 'Dashboard', 'Main dashboard with key metrics and insights', 'core', 'LayoutDashboard', true, 2),
            ('reports', 'Basic Reports', 'Standard reporting and analytics', 'core', 'PieChart', true, 3),
            ('analytics-studio', 'Analytics Studio', 'Advanced analytics workspace with custom reports', 'analytics', 'Database', false, 10),
            ('survey-analytics', 'Survey Analytics', 'Detailed survey performance analytics', 'analytics', 'BarChart3', false, 11),
            ('sentiment-analysis', 'Sentiment Analysis', 'AI-powered sentiment and text analytics', 'analytics', 'Bot', false, 12),
            ('tickets', 'Ticketing System', 'Customer support ticket management', 'engagement', 'Ticket', false, 20),
            ('smartreach', 'SmartReach', 'Multi-channel survey distribution', 'distribution', 'Megaphone', false, 30),
            ('ab-testing', 'A/B Testing', 'Survey A/B testing and optimization', 'distribution', 'FlaskConical', false, 31),
            ('social-media', 'Social Media Marketing', 'Social media campaign management', 'marketing', 'Share2', false, 40),
            ('social-listening', 'Social Listening', 'Monitor social media conversations', 'marketing', 'Radio', false, 41),
            ('cjm', 'Customer Journey Maps', 'Visual customer journey mapping', 'cx', 'Map', false, 50),
            ('personas', 'CX Personas', 'Customer persona management', 'cx', 'UserCog', false, 53),
            ('ai-voice-agent', 'AI Voice Agent', 'AI-powered voice survey agent', 'ai', 'PhoneCall', false, 60),
            ('workflow-automation', 'Workflow Automation', 'Automated workflows and triggers', 'ai', 'Zap', false, 62),
            ('sso', 'Single Sign-On', 'SSO integration and management', 'enterprise', 'Shield', false, 70),
            ('audit-logs', 'Audit Logs', 'Comprehensive audit logging', 'enterprise', 'ClipboardList', false, 71),
            ('api-access', 'API Access', 'REST API access and webhooks', 'enterprise', 'Key', false, 72),
            ('white-label', 'White Label', 'Custom branding and white-labeling', 'enterprise', 'Palette', false, 73)
            ON CONFLICT (module_key) DO NOTHING
        `);
        console.log('✅ Default modules inserted\n');

        console.log('4️⃣  Creating tenant_subscription_modules table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS tenant_subscription_modules (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                module_id INTEGER NOT NULL REFERENCES subscription_modules(id) ON DELETE CASCADE,
                enabled BOOLEAN DEFAULT TRUE NOT NULL,
                enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                usage_limit JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, module_id)
            )
        `);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_tenant_subscription_modules_tenant ON tenant_subscription_modules(tenant_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_tenant_subscription_modules_module ON tenant_subscription_modules(module_id)`);
        console.log('✅ Tenant subscription modules table created\n');

        console.log('5️⃣  Granting core modules to existing tenants...');
        await db.query(`
            INSERT INTO tenant_subscription_modules (tenant_id, module_id, enabled)
            SELECT t.id, sm.id, true
            FROM tenants t
            CROSS JOIN subscription_modules sm
            WHERE sm.is_core = true
            ON CONFLICT (tenant_id, module_id) DO NOTHING
        `);
        console.log('✅ Core modules granted\n');

        console.log('✅ Tenant Management System migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        throw error;
    } finally {
        process.exit();
    }
}

runMigration();
