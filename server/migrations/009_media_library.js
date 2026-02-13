exports.up = (pgm) => {
    // ── Media Assets table - Store uploaded media files ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS media_assets (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            media_type VARCHAR(20) NOT NULL,
            mimetype VARCHAR(100) NOT NULL,
            size_bytes BIGINT NOT NULL,
            storage_path TEXT NOT NULL,
            cdn_url TEXT,
            thumbnail_path TEXT,
            metadata JSONB DEFAULT '{}',
            uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Indexes for Media Assets ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_media_assets_tenant ON media_assets(tenant_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(tenant_id, media_type)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON media_assets(uploaded_by)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at)`);

    // ── Add constraint for media types ──
    pgm.sql(`
        ALTER TABLE media_assets
        ADD CONSTRAINT check_media_type
        CHECK (media_type IN ('image', 'video', 'document', 'audio'))
    `);

    // ── Add media_attachments to distributions table ──
    pgm.sql(`
        ALTER TABLE distributions
        ADD COLUMN IF NOT EXISTS media_attachments JSONB DEFAULT '[]'
    `);

    // ── Add template_html to distributions for rich content ──
    pgm.sql(`
        ALTER TABLE distributions
        ADD COLUMN IF NOT EXISTS template_html TEXT,
        ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '{}'
    `);
};

exports.down = (pgm) => {
    // Remove added columns from distributions
    pgm.sql(`
        ALTER TABLE distributions
        DROP COLUMN IF EXISTS media_attachments,
        DROP COLUMN IF EXISTS template_html,
        DROP COLUMN IF EXISTS template_variables
    `);

    // Drop table
    pgm.sql('DROP TABLE IF EXISTS media_assets CASCADE');
};
