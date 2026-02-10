-- VTrustX Unified Schema Initialization
-- Version: 1.1 (Jan 13, 2026)

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Infrastructure: Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    plan_id UUID,
    subscription_status VARCHAR(50) DEFAULT 'active',
    subscription_expires_at TIMESTAMP,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    theme JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Tenant
INSERT INTO tenants (name, plan) VALUES ('Default Organization', 'enterprise') ON CONFLICT DO NOTHING;

-- 2. Infrastructure: Teams
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Core: Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    name VARCHAR(255),
    name_ar VARCHAR(255),
    photo_url VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    role_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    tenant_id INTEGER REFERENCES tenants(id),
    team_id INTEGER REFERENCES teams(id),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3b. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CRM: Accounts & Contacts
CREATE TABLE IF NOT EXISTS crm_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    domain VARCHAR(255),
    owner_id INTEGER REFERENCES users(id),
    tenant_id INTEGER REFERENCES tenants(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_contacts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES crm_accounts(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    title VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Customer 360: Core Profile
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER REFERENCES tenants(id),
    
    -- Mandatory Attributes
    full_name VARCHAR(255),
    date_of_birth DATE,
    nationality VARCHAR(100),
    gender VARCHAR(20),
    occupation VARCHAR(100),
    city VARCHAR(100),
    primary_language VARCHAR(50) DEFAULT 'en',
    kyc_status VARCHAR(50) DEFAULT 'pending',
    
    -- GCC Specific / Persona Engine
    is_citizen BOOLEAN DEFAULT TRUE,
    city_tier VARCHAR(20) DEFAULT 'Tier1',
    monthly_income_local NUMERIC DEFAULT 0,
    family_status VARCHAR(50),
    employment_sector VARCHAR(100),
    assigned_persona_id VARCHAR(50),
    persona_assignment_details JSONB,
    
    -- Value & Risk
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Customer 360: Identity & Contacts
CREATE TABLE IF NOT EXISTS customer_identities (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    identity_type VARCHAR(50) NOT NULL,
    identity_value VARCHAR(255) NOT NULL,
    source_system VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identity_type, identity_value)
);

CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    value VARCHAR(255) NOT NULL,
    is_preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Customer 360: Consents & Events
CREATE TABLE IF NOT EXISTS customer_consents (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    source VARCHAR(100),
    consent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_events (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    channel VARCHAR(50),
    source_system VARCHAR(100),
    payload JSONB DEFAULT '{}',
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Customer Care: Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_code VARCHAR(20) UNIQUE,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'new',
    channel VARCHAR(50) DEFAULT 'web',
    
    account_id INTEGER REFERENCES crm_accounts(id),
    contact_id INTEGER REFERENCES crm_contacts(id),
    assigned_user_id INTEGER REFERENCES users(id),
    assigned_team_id INTEGER REFERENCES teams(id),
    tenant_id INTEGER REFERENCES tenants(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    first_response_due_at TIMESTAMP,
    resolution_due_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id),
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) DEFAULT 'public',
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Surveys & Forms
CREATE TABLE IF NOT EXISTS forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    definition JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    tenant_id INTEGER REFERENCES tenants(id),
    slug VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(id),
    form_version INTEGER,
    user_id INTEGER, -- Optional link to users table
    data JSONB NOT NULL,
    analysis JSONB,
    metadata JSONB,
    tenant_id INTEGER REFERENCES tenants(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- 10. Subscription Engine (New Version)
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('MONTHLY', 'ANNUAL')),
    base_price DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    features JSONB DEFAULT '{"max_users": 2, "max_forms": 5, "max_submissions": 500, "max_ai_calls": 100, "voice_agent": false, "custom_branding": false, "api_access": false, "priority_support": false}',
    pricing_by_region JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50),
    type VARCHAR(20) NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    value DECIMAL(5,2) NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    applies_to_plan_id UUID[],
    max_redemptions INTEGER,
    partner_id UUID,
    recurrence_rule VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id INTEGER REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),
    plan_id UUID REFERENCES plans(id),
    discount_id UUID REFERENCES discounts(id),
    status VARCHAR(20) CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    next_billing_at TIMESTAMP,
    amount_paid DECIMAL(10,2),
    stripe_subscription_id VARCHAR(255),
    pause_expires_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10b. Billing History / Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id INTEGER REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    invoice_number VARCHAR(50) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('draft', 'paid', 'unpaid', 'overdue', 'refunded', 'void')),
    description TEXT,
    billing_period_start TIMESTAMP,
    billing_period_end TIMESTAMP,
    paid_at TIMESTAMP,
    payment_method VARCHAR(50),
    stripe_invoice_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);

-- 11. Other Modules
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    provider VARCHAR(50),
    api_key VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cx_personas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100),
    industry VARCHAR(100),
    description TEXT,
    attributes JSONB NOT NULL DEFAULT '{}',
    tenant_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Indexes & Performance
CREATE INDEX IF NOT EXISTS idx_customer_identities_value ON customer_identities(identity_value);
CREATE INDEX IF NOT EXISTS idx_customer_events_customer ON customer_events(customer_id);

-- New Security & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_tenant ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_form ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);

-- 13. Seed Basic Data
INSERT INTO cx_personas (name, title, description, attributes, tenant_id)
VALUES 
('GCC National Millennial', 'Urban & Digital', 'Citizen, 25–39, Tier-1 city, mid-high income', '{"id": "GCC_NAT_MILL_01"}', 'system'),
('Affluent GCC Family Decision-Maker', 'Family Segment', 'Citizen, 35–55, Head of Household, high income', '{"id": "GCC_FAM_HH_03"}', 'system'),
('High-Income Expat Professional', 'Expat Segment', 'Non-citizen, 30–50, corporate job, mid-high income', '{"id": "GCC_EXP_PRO_02"}', 'system')
ON CONFLICT DO NOTHING;

-- 14. Quota Management
CREATE TABLE IF NOT EXISTS quotas (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES forms(id) ON DELETE CASCADE,
    label VARCHAR(255),
    limit_count INTEGER NOT NULL DEFAULT 0,
    current_count INTEGER DEFAULT 0,
    criteria JSONB DEFAULT '{}',
    action VARCHAR(50) DEFAULT 'reject',
    action_data JSONB,
    reset_period VARCHAR(50) DEFAULT 'never',
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Theming
CREATE TABLE IF NOT EXISTS themes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(255),
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Settings & Email Channels
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_channels (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(255),
    email VARCHAR(255),
    host VARCHAR(255),
    port INTEGER,
    username VARCHAR(255),
    password TEXT, -- TODO: Encrypt at rest
    is_secure BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    slug VARCHAR(50),
    subject_template TEXT,
    body_html TEXT,
    body_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sla_policies (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    priority VARCHAR(20),
    response_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, priority)
);

CREATE TABLE IF NOT EXISTS assignment_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    keyword VARCHAR(255),
    assigned_user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    survey_id VARCHAR(50),
    session_id VARCHAR(50),
    file_path TEXT,
    transcript TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    form_id INTEGER REFERENCES forms(id),
    name VARCHAR(255),
    description TEXT,
    trigger_event VARCHAR(100),
    conditions JSONB,
    actions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Periodic Quotas Counters
CREATE TABLE IF NOT EXISTS quota_period_counters (
    quota_id INTEGER REFERENCES quotas(id) ON DELETE CASCADE,
    period_key VARCHAR(50) NOT NULL, -- e.g., 'daily:2026-02-05', 'weekly:2026-W05'
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (quota_id, period_key)
);

-- 19. AI Providers
CREATE TABLE IF NOT EXISTS ai_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    provider VARCHAR(50),
    api_key TEXT, -- Encrypted at rest
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
