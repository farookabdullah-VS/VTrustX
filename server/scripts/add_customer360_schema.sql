-- Customer 360 Mandatory Schema

-- 1. Core Customer Token (Golden Record)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER REFERENCES tenants(id),
    
    -- Core Mandatory Attributes
    full_name VARCHAR(255),
    date_of_birth DATE,
    nationality VARCHAR(100),
    primary_language VARCHAR(50) DEFAULT 'en',
    kyc_status VARCHAR(50) DEFAULT 'pending', -- verified, pending, rejected
    
    -- Value & Risk
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Identity Store (For Resolution)
CREATE TABLE IF NOT EXISTS customer_identities (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    identity_type VARCHAR(50) NOT NULL, -- e.g. 'national_id', 'email', 'mobile', 'crm_id', 'account_number'
    identity_value VARCHAR(255) NOT NULL,
    source_system VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identity_type, identity_value) -- Enforce uniqueness to find duplicates
);

-- 3. Contact Methods
CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'email', 'mobile', 'whatsapp'
    value VARCHAR(255) NOT NULL,
    is_preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Consents (Regulatory - NCA/GDPR)
CREATE TABLE IF NOT EXISTS customer_consents (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL, -- 'marketing_email', 'data_processing', 'third_party_sharing'
    status VARCHAR(50) NOT NULL, -- 'granted', 'denied', 'revoked'
    source VARCHAR(100),
    consent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP
);

-- 5. Unified Events / Touchpoints
CREATE TABLE IF NOT EXISTS customer_events (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'LOGIN', 'PURCHASE', 'TICKET_OPENED'
    channel VARCHAR(50), -- 'WEB', 'APP', 'CALL_CENTER'
    source_system VARCHAR(100),
    payload JSONB DEFAULT '{}',
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast 360 lookups
CREATE INDEX IF NOT EXISTS idx_customer_identities_value ON customer_identities(identity_value);
CREATE INDEX IF NOT EXISTS idx_customer_events_customer ON customer_events(customer_id);
