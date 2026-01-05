-- Advanced Customer 360 Schema

-- 1. Firmographics (B2B Context)
CREATE TABLE IF NOT EXISTS customer_firmographics (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    job_title VARCHAR(100),
    company_name VARCHAR(255),
    industry_sector VARCHAR(100),
    department VARCHAR(100),
    company_size VARCHAR(50),
    vat_tax_id VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products / Assets
CREATE TABLE IF NOT EXISTS customer_products (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    product_name VARCHAR(255),
    product_type VARCHAR(100), -- 'checking_account', 'saas_subscription', 'credit_card'
    account_number VARCHAR(100),
    status VARCHAR(50), -- 'active', 'churned', 'delinquent'
    balance DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Financial Profile (Aggregate)
CREATE TABLE IF NOT EXISTS customer_financial_profile (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    current_plan_tier VARCHAR(100),
    mrr DECIMAL(12, 2), -- Monthly Recurring Revenue
    currency VARCHAR(10) DEFAULT 'USD',
    total_lifetime_spend DECIMAL(15, 2),
    contract_start_date TIMESTAMP,
    renewal_date TIMESTAMP,
    wallet_balance DECIMAL(15, 2) DEFAULT 0,
    payment_health VARCHAR(50), -- 'Good', 'At Risk', 'Delinquent'
    payment_method VARCHAR(50), -- 'CC', 'Invoice', 'PayPal'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Preferences & Reachability
CREATE TABLE IF NOT EXISTS customer_preferences (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    preferred_channel VARCHAR(50), -- 'email', 'sms', 'whatsapp'
    preferred_contact_time VARCHAR(50), -- 'morning', 'afternoon'
    social_profiles JSONB DEFAULT '{}', -- { linkedin: '...', twitter: '...' }
    addresses JSONB DEFAULT '[]', -- List of physical addresses
    primary_device VARCHAR(50), -- 'mobile_ios', 'desktop_chrome'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CX Intelligence & AI Metrics
CREATE TABLE IF NOT EXISTS cx_intelligence_metrics (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Behavioral
    last_active_at TIMESTAMP,
    platform_usage_score INTEGER DEFAULT 0, -- 0-100
    feature_adoption_rate DECIMAL(5, 2), -- Percentage
    
    -- Sentiment
    current_sentiment VARCHAR(50), -- 'Positive', 'Neutral', 'Negative'
    sentiment_trend VARCHAR(20), -- 'Improving', 'Declining', 'Stable'
    nps_last_rating INTEGER,
    csat_score INTEGER,
    
    -- Risk & Retention (AI)
    risk_category VARCHAR(50), -- 'High', 'Medium', 'Low'
    churn_probability_score INTEGER, -- 0-100
    retention_priority VARCHAR(50), -- 'Critical', 'Standard'
    next_best_action VARCHAR(255), -- 'Offer Discount', 'Schedule Review'
    
    -- Support
    total_support_tickets INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
