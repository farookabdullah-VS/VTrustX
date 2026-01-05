-- Auto-Assignment Rules Table
CREATE TABLE IF NOT EXISTS assignment_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    keyword VARCHAR(100) NOT NULL, -- e.g. "invoice"
    assigned_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, keyword)
);
