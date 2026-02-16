exports.up = (pgm) => {
    // ── Add organization fields to media_assets table ──
    pgm.sql(`
        ALTER TABLE media_assets
        ADD COLUMN IF NOT EXISTS folder VARCHAR(255),
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS description TEXT
    `);

    // ── Indexes for filtering and search ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_media_folder ON media_assets(tenant_id, folder)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_media_tags ON media_assets USING GIN(tags)`);
};

exports.down = (pgm) => {
    // Drop indexes
    pgm.sql(`DROP INDEX IF EXISTS idx_media_folder`);
    pgm.sql(`DROP INDEX IF EXISTS idx_media_tags`);

    // Remove columns
    pgm.sql(`
        ALTER TABLE media_assets
        DROP COLUMN IF EXISTS folder,
        DROP COLUMN IF EXISTS tags,
        DROP COLUMN IF EXISTS description
    `);
};
