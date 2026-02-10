-- =========================================================
-- 002_assets_extended.sql
-- Asset metadata, rights, derivatives, usage tracking
-- Schema: smm (PostgreSQL)
-- =========================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS smm;

CREATE TABLE IF NOT EXISTS smm.asset_version (
  asset_version_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid NOT NULL REFERENCES smm.asset(asset_id) ON DELETE CASCADE,
  version_no            integer NOT NULL,
  change_summary        text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  CONSTRAINT uq_asset_version UNIQUE (asset_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_asset_version_asset ON smm.asset_version(asset_id);

CREATE TABLE IF NOT EXISTS smm.asset_metadata (
  asset_metadata_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid NOT NULL REFERENCES smm.asset(asset_id) ON DELETE CASCADE,
  key                   text NOT NULL,
  value_text            text NULL,
  value_json            jsonb NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  CONSTRAINT uq_asset_metadata UNIQUE (asset_id, key)
);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_asset ON smm.asset_metadata(asset_id);

CREATE TABLE IF NOT EXISTS smm.asset_ai_tag (
  asset_ai_tag_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid NOT NULL REFERENCES smm.asset(asset_id) ON DELETE CASCADE,
  tag                   text NOT NULL,
  confidence            numeric(5,4) NULL,
  model_ref             text NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_ai_tag_asset ON smm.asset_ai_tag(asset_id);

CREATE TABLE IF NOT EXISTS smm.asset_rights (
  asset_rights_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid NOT NULL REFERENCES smm.asset(asset_id) ON DELETE CASCADE,
  rights_type_lookup_id uuid NULL,
  owner_name            text NULL,
  license_name          text NULL,
  license_url           text NULL,
  permitted_channels_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  permitted_regions_json  jsonb NOT NULL DEFAULT '[]'::jsonb,
  restrictions_text     text NULL,
  valid_from            date NULL,
  valid_to              date NULL,
  expiry_action_lookup_id uuid NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  updated_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_rights_asset ON smm.asset_rights(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_rights_valid_to ON smm.asset_rights(valid_to);

CREATE TABLE IF NOT EXISTS smm.asset_derivative (
  derivative_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid NOT NULL REFERENCES smm.asset(asset_id) ON DELETE CASCADE,
  channel_id            uuid NULL REFERENCES smm.md_channel(channel_id) ON DELETE SET NULL,
  derivative_type_lookup_id uuid NULL,
  width_px              integer NULL,
  height_px             integer NULL,
  mime_type             text NULL,
  file_size_bytes       bigint NULL,
  storage_path          text NOT NULL,
  checksum              text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_derivative_asset ON smm.asset_derivative(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_derivative_channel ON smm.asset_derivative(channel_id);

CREATE TABLE IF NOT EXISTS smm.asset_usage_log (
  usage_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid NOT NULL REFERENCES smm.asset(asset_id) ON DELETE CASCADE,
  post_id               uuid NULL REFERENCES smm.post(post_id) ON DELETE SET NULL,
  post_version_id       uuid NULL REFERENCES smm.post_version(post_version_id) ON DELETE SET NULL,
  social_account_id     uuid NULL REFERENCES smm.social_account(social_account_id) ON DELETE SET NULL,
  usage_type_lookup_id  uuid NULL,
  used_at               timestamptz NOT NULL DEFAULT now(),
  used_by               uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_usage_asset ON smm.asset_usage_log(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_post  ON smm.asset_usage_log(post_id);

COMMIT;
