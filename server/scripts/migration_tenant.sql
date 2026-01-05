-- 1. Create Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    subscription_status VARCHAR(50) DEFAULT 'active', -- active, past_due, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insert Default Tenant
INSERT INTO tenants (name, plan) VALUES ('Default Organization', 'enterprise') ON CONFLICT DO NOTHING;

-- 3. Add tenant_id to Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
UPDATE users SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;

-- 4. Add tenant_id to Forms
ALTER TABLE forms ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
UPDATE forms SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;

-- 5. Add tenant_id to Tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
UPDATE tickets SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;

-- 6. Add tenant_id to CRM Accounts
ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
UPDATE crm_accounts SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;

-- 7. Add tenant_id to Submissions (Optional, usually linked via form, but good for direct query)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
UPDATE submissions SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;

-- 8. Subscription Table (Optional, for billing history)
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50),
    interval VARCHAR(20), -- month, year
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
