-- =========================================================
-- 006_ai_layer.sql
-- AI providers/models, prompt templates, inference logs, feedback, risk events
-- Schema: smm (PostgreSQL)
-- =========================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS smm;

CREATE TABLE IF NOT EXISTS smm.ai_provider (
  provider_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code         text NOT NULL UNIQUE,
  provider_name         text NOT NULL,
  config_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smm.ai_model (
  model_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           uuid NOT NULL REFERENCES smm.ai_provider(provider_id) ON DELETE CASCADE,
  model_code            text NOT NULL,
  model_name            text NOT NULL,
  capabilities_json     jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_params_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_model UNIQUE (provider_id, model_code)
);
CREATE INDEX IF NOT EXISTS idx_ai_model_provider ON smm.ai_model(provider_id);

CREATE TABLE IF NOT EXISTS smm.ai_prompt_master (
  prompt_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id              uuid NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  prompt_code           text NOT NULL,
  prompt_name           text NOT NULL,
  prompt_type_lookup_id uuid NULL,
  status_lookup_id      uuid NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  updated_by            uuid NULL,
  CONSTRAINT uq_prompt_code UNIQUE (org_id, brand_id, prompt_code)
);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_brand ON smm.ai_prompt_master(brand_id);

CREATE TABLE IF NOT EXISTS smm.ai_prompt_version (
  prompt_version_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id             uuid NOT NULL REFERENCES smm.ai_prompt_master(prompt_id) ON DELETE CASCADE,
  version_no            integer NOT NULL,
  system_text           text NULL,
  user_text             text NOT NULL,
  variables_json        jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_summary        text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  CONSTRAINT uq_prompt_version UNIQUE (prompt_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_version_prompt ON smm.ai_prompt_version(prompt_id);

CREATE TABLE IF NOT EXISTS smm.ai_inference_log (
  inference_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id              uuid NULL REFERENCES smm.brand(brand_id) ON DELETE SET NULL,
  provider_id           uuid NULL REFERENCES smm.ai_provider(provider_id) ON DELETE SET NULL,
  model_id              uuid NULL REFERENCES smm.ai_model(model_id) ON DELETE SET NULL,
  prompt_id             uuid NULL REFERENCES smm.ai_prompt_master(prompt_id) ON DELETE SET NULL,
  prompt_version_id     uuid NULL REFERENCES smm.ai_prompt_version(prompt_version_id) ON DELETE SET NULL,
  entity_type           text NULL,
  entity_id             uuid NULL,
  request_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_json         jsonb NULL,
  output_text           text NULL,
  tokens_in             integer NULL,
  tokens_out            integer NULL,
  latency_ms            integer NULL,
  success_flag          boolean NOT NULL DEFAULT true,
  error_text            text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_inference_entity ON smm.ai_inference_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_inference_brand_time ON smm.ai_inference_log(brand_id, created_at DESC);

CREATE TABLE IF NOT EXISTS smm.ai_feedback (
  feedback_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inference_id          uuid NOT NULL REFERENCES smm.ai_inference_log(inference_id) ON DELETE CASCADE,
  rating_lookup_id      uuid NULL,
  feedback_text         text NULL,
  corrected_output_text text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_inference ON smm.ai_feedback(inference_id);

CREATE TABLE IF NOT EXISTS smm.ai_risk_event (
  risk_event_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inference_id          uuid NULL REFERENCES smm.ai_inference_log(inference_id) ON DELETE SET NULL,
  brand_id              uuid NULL REFERENCES smm.brand(brand_id) ON DELETE SET NULL,
  risk_type_lookup_id   uuid NULL,
  severity_lookup_id    uuid NULL,
  details_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_risk_brand_time ON smm.ai_risk_event(brand_id, created_at DESC);

COMMIT;
