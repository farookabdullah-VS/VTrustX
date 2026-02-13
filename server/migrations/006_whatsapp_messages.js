exports.up = (pgm) => {
    // ── WhatsApp Messages table - Track individual message sends ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS whatsapp_messages (
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
            read_at TIMESTAMP,
            failed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);

    // ── Indexes for WhatsApp Messages ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_distribution ON whatsapp_messages(distribution_id)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(tenant_id, status)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sid ON whatsapp_messages(message_sid)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(tenant_id, recipient_phone)`);

    // ── WhatsApp Sessions table - Track 24-hour session windows ──
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            phone VARCHAR(20) NOT NULL,
            last_inbound_at TIMESTAMP,
            last_outbound_at TIMESTAMP,
            session_expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, phone)
        )
    `);

    // ── Indexes for WhatsApp Sessions ──
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_tenant_phone ON whatsapp_sessions(tenant_id, phone)`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires ON whatsapp_sessions(session_expires_at)`);
};

exports.down = (pgm) => {
    pgm.sql('DROP TABLE IF EXISTS whatsapp_sessions CASCADE');
    pgm.sql('DROP TABLE IF EXISTS whatsapp_messages CASCADE');
};
