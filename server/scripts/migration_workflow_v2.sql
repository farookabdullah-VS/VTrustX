-- Add tenant_id to workflows for CRM usage
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
-- Ensure form_id is nullable (it is by default, but good to be sure if I used constraints)
-- ALTER TABLE workflows ALTER COLUMN form_id DROP NOT NULL;

-- Update existing workflows to have a tenant_id (if any, link via form)
UPDATE workflows w
SET tenant_id = f.tenant_id
FROM forms f
WHERE w.form_id = f.id AND w.tenant_id IS NULL;

-- Default fallback
UPDATE workflows SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
