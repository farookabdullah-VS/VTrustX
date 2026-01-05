ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
    "surveys": true,
    "cx_ratings": true,
    "personas": true,
    "tickets": true,
    "contacts": true,
    "ai_intelligence": true,
    "workflows": true,
    "integrations": true,
    "branding": true
}'::jsonb;
