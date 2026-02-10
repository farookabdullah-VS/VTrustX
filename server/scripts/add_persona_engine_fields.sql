-- Add Persona Engine specific fields to Customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS is_citizen BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS city_tier VARCHAR(20), -- Tier1, Tier2
ADD COLUMN IF NOT EXISTS monthly_income_local NUMERIC,
ADD COLUMN IF NOT EXISTS family_status VARCHAR(50), -- Single, Married, Head of Household
ADD COLUMN IF NOT EXISTS employment_sector VARCHAR(100), -- Government, Private, SME, Labor
ADD COLUMN IF NOT EXISTS assigned_persona_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS persona_assignment_details JSONB;

-- Update existing records with some dummy data if needed (optional)
UPDATE customers SET city_tier = 'Tier1' WHERE city_tier IS NULL;

-- Seed some Personas into cx_personas
INSERT INTO cx_personas (name, title, description, attributes, tenant_id)
VALUES 
('GCC National Millennial', 'Urban & Digital', 'Citizen, 25–39, Tier-1 city, mid-high income', '{"id": "GCC_NAT_MILL_01"}', 'system'),
('Affluent GCC Family Decision-Maker', 'Family Segment', 'Citizen, 35–55, Head of Household, high income', '{"id": "GCC_FAM_HH_03"}', 'system'),
('High-Income Expat Professional', 'Expat Segment', 'Non-citizen, 30–50, corporate job, mid-high income', '{"id": "GCC_EXP_PRO_02"}', 'system')
ON CONFLICT DO NOTHING;
