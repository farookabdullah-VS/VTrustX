-- Add Products/Accounts Table
CREATE TABLE IF NOT EXISTS customer_products (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(100), -- e.g., 'savings_account', 'credit_card', 'loan'
    account_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, closed, suspended
    role VARCHAR(50) DEFAULT 'primary', -- primary, joint, authorized
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    currency VARCHAR(10) DEFAULT 'SAR',
    balance DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by customer
CREATE INDEX IF NOT EXISTS idx_customer_products_cust ON customer_products(customer_id);
-- Index for looking up product by account number
CREATE INDEX IF NOT EXISTS idx_customer_products_acc ON customer_products(account_number);
