-- Journey Orchestration Schema

-- 1. Journeys Table (Container)
CREATE TABLE IF NOT EXISTS journeys (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, archived
    trigger_type VARCHAR(50), -- segment_entry, event, manual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Journey Versions (Versioning needed for running journeys while editing)
CREATE TABLE IF NOT EXISTS journey_versions (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER REFERENCES journeys(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    definition JSONB NOT NULL, -- Stores { nodes: [], edges: [] }
    is_active BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Journey Instances (State Machine Persistence)
CREATE TABLE IF NOT EXISTS journey_instances (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    journey_id INTEGER REFERENCES journeys(id),
    journey_version_id INTEGER REFERENCES journey_versions(id),
    subject_id VARCHAR(100), -- User ID or Persona ID
    subject_type VARCHAR(50) DEFAULT 'user',
    current_step_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, completed, failed, cancelled
    context JSONB DEFAULT '{}', -- Stores variables accumulated during journey
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Event Stream / Log (For Compliance & Triggering)
CREATE TABLE IF NOT EXISTS event_stream (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    event_type VARCHAR(100) NOT NULL, -- e.g. 'app_opened', 'purchase_made'
    actor_id VARCHAR(100),
    actor_type VARCHAR(50) DEFAULT 'user',
    payload JSONB,
    source VARCHAR(100), -- e.g. 'mobile_sdk', 'web', 'crm'
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add feature flag for Journey Builder if not present in tenants (handled dynamically usually, but good to audit)
-- (Already handled in previous update via features JSONB)
