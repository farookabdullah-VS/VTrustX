-- =========================================================
-- 003_templates.sql
-- Templates for captions, replies, reports with versioning
-- Schema: smm (PostgreSQL)
-- =========================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS smm;

CREATE TABLE IF NOT EXISTS smm.template_master (
  template_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id              uuid NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  template_code         text NOT NULL,
  template_name         text NOT NULL,
  template_type_lookup_id uuid NULL,
  status_lookup_id      uuid NULL,
  description           text NULL,
  tags_json             jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  updated_by            uuid NULL,
  CONSTRAINT uq_template_code UNIQUE (org_id, brand_id, template_code)
);
CREATE INDEX IF NOT EXISTS idx_template_master_org   ON smm.template_master(org_id);
CREATE INDEX IF NOT EXISTS idx_template_master_brand ON smm.template_master(brand_id);

CREATE TABLE IF NOT EXISTS smm.template_version (
  template_version_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           uuid NOT NULL REFERENCES smm.template_master(template_id) ON DELETE CASCADE,
  version_no            integer NOT NULL,
  subject_text          text NULL,
  body_text             text NULL,
  body_html             text NULL,
  body_json             jsonb NULL,
  variables_json        jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_summary        text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  CONSTRAINT uq_template_version UNIQUE (template_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_template_version_template ON smm.template_version(template_id);

CREATE TABLE IF NOT EXISTS smm.template_field_def (
  field_def_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           uuid NOT NULL REFERENCES smm.template_master(template_id) ON DELETE CASCADE,
  field_key             text NOT NULL,
  field_label           text NOT NULL,
  field_type_lookup_id  uuid NULL,
  required_flag         boolean NOT NULL DEFAULT false,
  default_value_json    jsonb NULL,
  validation_json       jsonb NULL,
  sort_order            integer NOT NULL DEFAULT 0,
  CONSTRAINT uq_template_field UNIQUE (template_id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_template_field_template ON smm.template_field_def(template_id);

CREATE TABLE IF NOT EXISTS smm.template_render_log (
  render_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           uuid NOT NULL REFERENCES smm.template_master(template_id) ON DELETE CASCADE,
  template_version_id   uuid NOT NULL REFERENCES smm.template_version(template_version_id) ON DELETE CASCADE,
  entity_type           text NULL,
  entity_id             uuid NULL,
  input_json            jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_preview        text NULL,
  success_flag          boolean NOT NULL DEFAULT true,
  error_text            text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_template_render_entity ON smm.template_render_log(entity_type, entity_id, created_at DESC);

COMMIT;
