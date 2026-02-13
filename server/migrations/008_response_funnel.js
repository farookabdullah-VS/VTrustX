exports.up = (pgm) => {
    // ── Survey Events table - Track response funnel ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS survey_events (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
            distribution_id INTEGER REFERENCES distributions(id) ON DELETE SET NULL,
            unique_id VARCHAR(255) NOT NULL,
            event_type VARCHAR(20) NOT NULL,
            page_number INTEGER,
            session_id VARCHAR(255),
            user_agent TEXT,
            ip_address VARCHAR(45),
            referrer TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Indexes for Survey Events ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_survey_events_tenant ON survey_events(tenant_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_survey_events_form ON survey_events(form_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_survey_events_distribution ON survey_events(distribution_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_survey_events_unique_id ON survey_events(tenant_id, form_id, unique_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_survey_events_type_created ON survey_events(tenant_id, event_type, created_at)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_survey_events_session ON survey_events(session_id)`);

    // ── Add constraint for event types ──
    pgm.sql(`
        ALTER TABLE survey_events
        ADD CONSTRAINT check_event_type
        CHECK (event_type IN ('viewed', 'started', 'completed', 'abandoned'))
    `);

    // ── Add view_count to forms table for quick stats ──
    pgm.sql(`
        ALTER TABLE forms
        ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS start_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS abandon_count INTEGER DEFAULT 0
    `);
};

exports.down = (pgm) => {
    // Remove added columns from forms
    pgm.sql(`
        ALTER TABLE forms
        DROP COLUMN IF EXISTS view_count,
        DROP COLUMN IF EXISTS start_count,
        DROP COLUMN IF EXISTS completion_count,
        DROP COLUMN IF EXISTS abandon_count
    `);

    // Drop table
    pgm.sql('DROP TABLE IF EXISTS survey_events CASCADE');
};
