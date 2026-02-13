exports.up = (pgm) => {
    // ── Email Messages table - Track individual email sends ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS email_messages (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            distribution_id INTEGER REFERENCES distributions(id) ON DELETE CASCADE,
            recipient_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(255),
            message_id VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            error_code VARCHAR(50),
            error_message TEXT,
            sent_at TIMESTAMP,
            delivered_at TIMESTAMP,
            opened_at TIMESTAMP,
            clicked_at TIMESTAMP,
            bounced_at TIMESTAMP,
            failed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Indexes for Email Messages ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_email_messages_tenant ON email_messages(tenant_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_email_messages_distribution ON email_messages(distribution_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(tenant_id, status)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_email_messages_recipient ON email_messages(tenant_id, recipient_email)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_email_messages_created_at ON email_messages(created_at)`);

    // ── SMS Messages table - Track individual SMS sends ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS sms_messages (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            distribution_id INTEGER REFERENCES distributions(id) ON DELETE CASCADE,
            recipient_phone VARCHAR(20) NOT NULL,
            recipient_name VARCHAR(255),
            message_sid VARCHAR(100),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            error_code VARCHAR(50),
            error_message TEXT,
            sent_at TIMESTAMP,
            delivered_at TIMESTAMP,
            failed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Indexes for SMS Messages ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_sms_messages_tenant ON sms_messages(tenant_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_sms_messages_distribution ON sms_messages(distribution_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(tenant_id, status)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_sms_messages_phone ON sms_messages(tenant_id, recipient_phone)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_sms_messages_sid ON sms_messages(message_sid)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at)`);

    // ── Add delivery counters to distributions table ──
    pgm.sql(`
        ALTER TABLE distributions
        ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0
    `);
};

exports.down = (pgm) => {
    // Remove added columns from distributions
    pgm.sql(`
        ALTER TABLE distributions
        DROP COLUMN IF EXISTS total_recipients,
        DROP COLUMN IF EXISTS sent_count,
        DROP COLUMN IF EXISTS delivered_count,
        DROP COLUMN IF EXISTS failed_count
    `);

    // Drop tables
    pgm.sql('DROP TABLE IF EXISTS sms_messages CASCADE');
    pgm.sql('DROP TABLE IF EXISTS email_messages CASCADE');
};
