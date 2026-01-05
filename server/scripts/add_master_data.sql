-- Master Data Tables

-- 1. Countries / Nationalities
CREATE TABLE IF NOT EXISTS lov_countries (
    id SERIAL PRIMARY KEY,
    iso_code VARCHAR(3) UNIQUE NOT NULL, -- SA, USA, AE
    name VARCHAR(100) NOT NULL, -- Saudi Arabia
    nationality VARCHAR(100) NOT NULL, -- Saudi
    phone_code VARCHAR(10), -- +966
    flag_emoji VARCHAR(10), -- 🇸🇦
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cities
CREATE TABLE IF NOT EXISTS lov_cities (
    id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES lov_countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Riyadh
    region VARCHAR(100), -- Central Region
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data: Countries
INSERT INTO lov_countries (iso_code, name, nationality, phone_code, flag_emoji) VALUES
('SA', 'Saudi Arabia', 'Saudi', '+966', '🇸🇦'),
('AE', 'United Arab Emirates', 'Emirati', '+971', '🇦🇪'),
('KW', 'Kuwait', 'Kuwaiti', '+965', '🇰🇼'),
('BH', 'Bahrain', 'Bahraini', '+973', '🇧🇭'),
('QA', 'Qatar', 'Qatari', '+974', '🇶🇦'),
('OM', 'Oman', 'Omani', '+968', '🇴🇲'),
('EG', 'Egypt', 'Egyptian', '+20', '🇪🇬'),
('US', 'United States', 'American', '+1', '🇺🇸'),
('GB', 'United Kingdom', 'British', '+44', '🇬🇧'),
('IN', 'India', 'Indian', '+91', '🇮🇳')
ON CONFLICT (iso_code) DO NOTHING;

-- Seed Data: Cities (SA)
INSERT INTO lov_cities (country_id, name, region) 
SELECT id, 'Riyadh', 'Central' FROM lov_countries WHERE iso_code = 'SA'
UNION ALL
SELECT id, 'Jeddah', 'Western' FROM lov_countries WHERE iso_code = 'SA'
UNION ALL
SELECT id, 'Dammam', 'Eastern' FROM lov_countries WHERE iso_code = 'SA'
UNION ALL
SELECT id, 'Mecca', 'Western' FROM lov_countries WHERE iso_code = 'SA'
UNION ALL
SELECT id, 'Medina', 'Western' FROM lov_countries WHERE iso_code = 'SA'
UNION ALL
SELECT id, 'Khobar', 'Eastern' FROM lov_countries WHERE iso_code = 'SA';

-- Seed Data: Cities (AE)
INSERT INTO lov_cities (country_id, name, region) 
SELECT id, 'Dubai', 'Dubai' FROM lov_countries WHERE iso_code = 'AE'
UNION ALL
SELECT id, 'Abu Dhabi', 'Abu Dhabi' FROM lov_countries WHERE iso_code = 'AE'
UNION ALL
SELECT id, 'Sharjah', 'Sharjah' FROM lov_countries WHERE iso_code = 'AE';

-- Seed Data: Cities (EG)
INSERT INTO lov_cities (country_id, name, region) 
SELECT id, 'Cairo', 'Cairo' FROM lov_countries WHERE iso_code = 'EG'
UNION ALL
SELECT id, 'Alexandria', 'Alexandria' FROM lov_countries WHERE iso_code = 'EG';
