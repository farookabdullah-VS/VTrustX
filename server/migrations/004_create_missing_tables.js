exports.up = (pgm) => {
    // ── CJM Maps ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS cjm_maps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL DEFAULT 'Untitled Journey',
            description TEXT,
            status VARCHAR(20) DEFAULT 'draft',
            thumbnail_data TEXT,
            persona_id UUID,
            created_by INTEGER,
            tags JSONB DEFAULT '[]',
            data JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── CJM Versions ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS cjm_versions (
            id SERIAL PRIMARY KEY,
            map_id UUID NOT NULL,
            version_number INTEGER DEFAULT 1,
            data JSONB NOT NULL,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── CJM Comments ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS cjm_comments (
            id SERIAL PRIMARY KEY,
            map_id UUID NOT NULL,
            user_id INTEGER,
            user_name VARCHAR(255),
            section_id VARCHAR(100),
            stage_id VARCHAR(100),
            content TEXT NOT NULL,
            resolved BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── CJM Shares ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS cjm_shares (
            id SERIAL PRIMARY KEY,
            map_id UUID NOT NULL,
            shared_with_user_id INTEGER,
            share_token VARCHAR(255),
            permission VARCHAR(20) DEFAULT 'view',
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── CJM Templates ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS cjm_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id INTEGER,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            data JSONB DEFAULT '{}',
            is_system BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Folders ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS folders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            tenant_id INTEGER NOT NULL,
            user_id INTEGER,
            type VARCHAR(20) DEFAULT 'private',
            is_smart BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // ── Integrations ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS integrations (
            id SERIAL PRIMARY KEY,
            provider VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(100),
            api_key TEXT,
            webhook_url VARCHAR(255),
            config JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ── Notifications ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER,
            user_id INTEGER,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            type VARCHAR(50),
            reference_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ── Shared Dashboards ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS shared_dashboards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            form_id INTEGER NOT NULL,
            share_token VARCHAR(255) NOT NULL UNIQUE,
            is_public BOOLEAN DEFAULT TRUE,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )
    `);

    // ── Distributions ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS distributions (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            form_id INTEGER,
            name VARCHAR(255),
            channel VARCHAR(50) DEFAULT 'email',
            config JSONB DEFAULT '{}',
            status VARCHAR(20) DEFAULT 'draft',
            scheduled_at TIMESTAMP,
            sent_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Reports ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL DEFAULT 'Untitled Report',
            description TEXT,
            form_id INTEGER,
            layout JSONB DEFAULT '[]',
            widgets JSONB DEFAULT '{}',
            theme JSONB DEFAULT '{}',
            fields JSONB DEFAULT '[]',
            config JSONB DEFAULT '{}',
            public_token VARCHAR(255),
            orientation VARCHAR(20) DEFAULT 'portrait',
            is_published BOOLEAN DEFAULT FALSE,
            slug VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Fix ai_providers.api_key to TEXT if it's VARCHAR(255) ──
    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'ai_providers'
                AND column_name = 'api_key'
                AND data_type = 'character varying'
                AND character_maximum_length = 255
            ) THEN
                ALTER TABLE ai_providers ALTER COLUMN api_key TYPE TEXT;
            END IF;
        END $$
    `);

    // ── Indexes for new tables ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_cjm_versions_map ON cjm_versions(map_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_cjm_comments_map ON cjm_comments(map_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_cjm_shares_map ON cjm_shares(map_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_cjm_shares_token ON cjm_shares(share_token)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_cjm_templates_tenant ON cjm_templates(tenant_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_folders_tenant ON folders(tenant_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_shared_dashboards_token ON shared_dashboards(share_token)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_shared_dashboards_form ON shared_dashboards(form_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_distributions_tenant ON distributions(tenant_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id)`);
};

exports.down = (pgm) => {
    // Drop tables in reverse dependency order
    pgm.sql('DROP TABLE IF EXISTS reports CASCADE');
    pgm.sql('DROP TABLE IF EXISTS distributions CASCADE');
    pgm.sql('DROP TABLE IF EXISTS shared_dashboards CASCADE');
    pgm.sql('DROP TABLE IF EXISTS notifications CASCADE');
    pgm.sql('DROP TABLE IF EXISTS integrations CASCADE');
    pgm.sql('DROP TABLE IF EXISTS folders CASCADE');
    pgm.sql('DROP TABLE IF EXISTS cjm_templates CASCADE');
    pgm.sql('DROP TABLE IF EXISTS cjm_shares CASCADE');
    pgm.sql('DROP TABLE IF EXISTS cjm_comments CASCADE');
    pgm.sql('DROP TABLE IF EXISTS cjm_versions CASCADE');
    pgm.sql('DROP TABLE IF EXISTS cjm_maps CASCADE');
};
