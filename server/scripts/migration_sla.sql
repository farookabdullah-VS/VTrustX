CREATE TABLE IF NOT EXISTS sla_policies (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id), -- Assuming tenants.id is INTEGER (confirmed in Step 1800s)
    priority VARCHAR(50) NOT NULL, -- low, medium, high, urgent
    response_time_minutes INTEGER DEFAULT 60,
    resolution_time_minutes INTEGER DEFAULT 1440,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, priority)
);

-- Insert Defaults for Tenant 1 (Assuming ID 1 exists and is the main tenant)
-- If tenant doesn't exist, this might fail, but INSERT IGNORE concept in PG is ON CONFLICT DO NOTHING
INSERT INTO sla_policies (tenant_id, priority, response_time_minutes, resolution_time_minutes)
VALUES 
(1, 'urgent', 30, 240), -- 4 hours
(1, 'high', 60, 480), -- 8 hours
(1, 'medium', 120, 1440), -- 24 hours
(1, 'low', 240, 2880) -- 48 hours
ON CONFLICT (tenant_id, priority) DO NOTHING;
