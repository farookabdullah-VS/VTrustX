exports.up = (pgm) => {
    // ── Add submission_id FK to tickets ──
    pgm.sql(`
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL
    `);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_tickets_submission_id ON tickets(submission_id)`);

    // ── CTL Alerts table ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS ctl_alerts (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            form_id INTEGER NOT NULL REFERENCES forms(id),
            submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
            alert_level VARCHAR(20) NOT NULL DEFAULT 'medium',
            score_value NUMERIC,
            score_type VARCHAR(50),
            sentiment VARCHAR(20),
            status VARCHAR(20) NOT NULL DEFAULT 'open',
            resolved_at TIMESTAMP,
            resolved_by INTEGER REFERENCES users(id),
            ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Indexes ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_ctl_alerts_tenant_form ON ctl_alerts(tenant_id, form_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_ctl_alerts_status ON ctl_alerts(tenant_id, status)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_ctl_alerts_submission ON ctl_alerts(submission_id)`);
};

exports.down = (pgm) => {
    pgm.sql('DROP TABLE IF EXISTS ctl_alerts CASCADE');
    pgm.sql('ALTER TABLE tickets DROP COLUMN IF EXISTS submission_id');
};
