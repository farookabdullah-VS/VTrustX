-- 1. Extend Customers Table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS title VARCHAR(20),
ADD COLUMN IF NOT EXISTS national_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Riyadh';

-- 2. Firmographics (Professional Context)
CREATE TABLE IF NOT EXISTS customer_firmographics (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    company_name VARCHAR(200),
    industry_sector VARCHAR(100),
    job_title VARCHAR(100),
    department VARCHAR(100),
    company_size VARCHAR(50),
    is_decision_maker BOOLEAN DEFAULT FALSE,
    seniority_level VARCHAR(50),
    vat_tax_id VARCHAR(50),
    UNIQUE(customer_id)
);

-- 3. Preferences & Reachability
CREATE TABLE IF NOT EXISTS customer_preferences (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    preferred_channel VARCHAR(50) DEFAULT 'email',
    preferred_contact_time VARCHAR(100),
    marketing_opt_in BOOLEAN DEFAULT FALSE,
    social_profiles JSONB DEFAULT '{}',
    addresses JSONB DEFAULT '[]',
    primary_device VARCHAR(100),
    UNIQUE(customer_id)
);

-- 4. Financial Profile (Subscription & Value)
CREATE TABLE IF NOT EXISTS customer_financial_profile (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    current_plan_tier VARCHAR(50),
    mrr DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'SAR',
    contract_start_date DATE,
    renewal_date DATE,
    payment_method VARCHAR(100),
    payment_health VARCHAR(50) DEFAULT 'Good',
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    total_lifetime_spend DECIMAL(12, 2) DEFAULT 0.00,
    license_count INTEGER DEFAULT 1,
    UNIQUE(customer_id)
);

-- 5. CX Intelligence (Behavior, AI, Predictions)
CREATE TABLE IF NOT EXISTS cx_intelligence_metrics (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Behavior
    last_active_at TIMESTAMP,
    average_session_minutes DECIMAL(5, 2),
    feature_adoption_rate VARCHAR(20), -- 'Low', 'Medium', 'High'
    platform_usage_score INTEGER DEFAULT 0, -- 0-100
    
    -- Service & Sentiment
    nps_last_rating INTEGER, 
    csat_score DECIMAL(3, 1),
    current_sentiment VARCHAR(50) DEFAULT 'Neutral',
    sentiment_trend VARCHAR(50), -- 'Improving', 'Declining'
    total_support_tickets INTEGER DEFAULT 0,
    open_tickets_count INTEGER DEFAULT 0,
    
    -- AI Predictions
    churn_probability_score DECIMAL(5, 4), -- 0.00 to 1.00
    risk_category VARCHAR(50), -- 'Low', 'At-Risk'
    next_best_action VARCHAR(255),
    retention_priority VARCHAR(20), -- 'High', 'Medium', 'Low'
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id)
);
