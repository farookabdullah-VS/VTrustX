-- Email Channels table for IMAP integration
CREATE TABLE IF NOT EXISTS email_channels (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL, -- e.g. "Support Team"
    email VARCHAR(255) NOT NULL, -- e.g. "support@example.com"
    host VARCHAR(255) NOT NULL, -- e.g. "imap.gmail.com"
    port INTEGER NOT NULL DEFAULT 993,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_secure BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
