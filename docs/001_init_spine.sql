-- =========================================================
-- 001_init_spine.sql
-- Core spine schema for Social Media Marketing Platform
-- PostgreSQL / Schema: smm
-- =========================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS smm;

-- =========================================================
-- 0) Reference tables
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.timezone_master (
  timezone_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iana_name            text NOT NULL UNIQUE,
  utc_offset_minutes   integer NOT NULL
);

CREATE TABLE IF NOT EXISTS smm.currency_master (
  currency_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code             text NOT NULL UNIQUE,
  name                 text NOT NULL,
  symbol               text
);

CREATE TABLE IF NOT EXISTS smm.language_master (
  language_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code             text NOT NULL UNIQUE,
  name                 text NOT NULL,
  is_rtl               boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS smm.country_master (
  country_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code             text NOT NULL UNIQUE,
  name                 text NOT NULL
);

-- =========================================================
-- 1) Tenancy: Org / Client / Brand
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.org (
  org_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_code             text NOT NULL UNIQUE,
  org_name             text NOT NULL,
  org_type_lookup_id   uuid NULL,
  status_lookup_id     uuid NULL,
  default_timezone_id  uuid NULL REFERENCES smm.timezone_master(timezone_id),
  default_currency_id  uuid NULL REFERENCES smm.currency_master(currency_id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL
);

CREATE TABLE IF NOT EXISTS smm.org_setting (
  setting_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  key                  text NOT NULL,
  value_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_from       timestamptz NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_org_setting UNIQUE (org_id, key)
);
CREATE INDEX IF NOT EXISTS idx_org_setting_org ON smm.org_setting(org_id);

CREATE TABLE IF NOT EXISTS smm.client (
  client_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  client_code          text NOT NULL,
  client_name          text NOT NULL,
  billing_email        text NULL,
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_client_code UNIQUE (org_id, client_code)
);
CREATE INDEX IF NOT EXISTS idx_client_org ON smm.client(org_id);

CREATE TABLE IF NOT EXISTS smm.brand (
  brand_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  client_id            uuid NULL REFERENCES smm.client(client_id) ON DELETE SET NULL,
  brand_code           text NOT NULL,
  brand_name           text NOT NULL,
  industry_lookup_id   uuid NULL,
  default_language_id  uuid NULL REFERENCES smm.language_master(language_id),
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_brand_code UNIQUE (org_id, brand_code)
);
CREATE INDEX IF NOT EXISTS idx_brand_org ON smm.brand(org_id);
CREATE INDEX IF NOT EXISTS idx_brand_client ON smm.brand(client_id);

CREATE TABLE IF NOT EXISTS smm.brand_setting (
  brand_setting_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  key                  text NOT NULL,
  value_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_brand_setting UNIQUE (brand_id, key)
);
CREATE INDEX IF NOT EXISTS idx_brand_setting_brand ON smm.brand_setting(brand_id);

-- =========================================================
-- 2) Identity & RBAC
-- =========================================================
CREATE TABLE IF NOT EXISTS smm."user" (
  user_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  email                text NOT NULL,
  full_name            text NOT NULL,
  phone                text NULL,
  user_status_lookup_id uuid NULL,
  last_login_at        timestamptz NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_user_email UNIQUE (org_id, email)
);
CREATE INDEX IF NOT EXISTS idx_user_org ON smm."user"(org_id);

CREATE TABLE IF NOT EXISTS smm.user_profile (
  profile_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL UNIQUE REFERENCES smm."user"(user_id) ON DELETE CASCADE,
  job_title            text NULL,
  department           text NULL,
  avatar_asset_id      uuid NULL,
  preferences_json     jsonb NULL
);

CREATE TABLE IF NOT EXISTS smm.role (
  role_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  role_code            text NOT NULL,
  role_name            text NOT NULL,
  role_type_lookup_id  uuid NULL,
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_role_code UNIQUE (org_id, role_code)
);
CREATE INDEX IF NOT EXISTS idx_role_org ON smm.role(org_id);

CREATE TABLE IF NOT EXISTS smm.permission (
  permission_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perm_code            text NOT NULL UNIQUE,
  perm_name            text NOT NULL,
  module               text NOT NULL,
  description          text NULL
);

CREATE TABLE IF NOT EXISTS smm.role_permission (
  rp_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id              uuid NOT NULL REFERENCES smm.role(role_id) ON DELETE CASCADE,
  permission_id        uuid NOT NULL REFERENCES smm.permission(permission_id) ON DELETE CASCADE,
  CONSTRAINT uq_role_perm UNIQUE (role_id, permission_id)
);
CREATE INDEX IF NOT EXISTS idx_role_permission_role ON smm.role_permission(role_id);

CREATE TABLE IF NOT EXISTS smm.user_role (
  ur_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES smm."user"(user_id) ON DELETE CASCADE,
  role_id              uuid NOT NULL REFERENCES smm.role(role_id) ON DELETE CASCADE,
  brand_id             uuid NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  CONSTRAINT uq_user_role UNIQUE (user_id, role_id, brand_id)
);
CREATE INDEX IF NOT EXISTS idx_user_role_user ON smm.user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_brand ON smm.user_role(brand_id);

CREATE TABLE IF NOT EXISTS smm.team (
  team_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  team_code            text NOT NULL,
  team_name            text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_team_code UNIQUE (org_id, team_code)
);
CREATE INDEX IF NOT EXISTS idx_team_org ON smm.team(org_id);

CREATE TABLE IF NOT EXISTS smm.team_member (
  team_member_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id              uuid NOT NULL REFERENCES smm.team(team_id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES smm."user"(user_id) ON DELETE CASCADE,
  team_role_lookup_id  uuid NULL,
  CONSTRAINT uq_team_member UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_member_team ON smm.team_member(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_user ON smm.team_member(user_id);

CREATE TABLE IF NOT EXISTS smm.login_session (
  session_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES smm."user"(user_id) ON DELETE CASCADE,
  refresh_token_hash   text NOT NULL,
  ip_address           inet NULL,
  user_agent           text NULL,
  expires_at           timestamptz NOT NULL,
  revoked_at           timestamptz NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_session_user ON smm.login_session(user_id);
CREATE INDEX IF NOT EXISTS idx_login_session_expires ON smm.login_session(expires_at);

-- =========================================================
-- 3) Master Lookups
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.md_lookup_master (
  lookup_master_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  lookup_code          text NOT NULL,
  lookup_name          text NOT NULL,
  description          text NULL,
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_lookup_master UNIQUE (org_id, lookup_code)
);
CREATE INDEX IF NOT EXISTS idx_lookup_master_org ON smm.md_lookup_master(org_id);

CREATE TABLE IF NOT EXISTS smm.md_lookup_value (
  lookup_value_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_master_id     uuid NOT NULL REFERENCES smm.md_lookup_master(lookup_master_id) ON DELETE CASCADE,
  value_code           text NOT NULL,
  value_label          text NOT NULL,
  value_color          text NULL,
  sort_order           integer NOT NULL DEFAULT 0,
  is_default           boolean NOT NULL DEFAULT false,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_lookup_value UNIQUE (lookup_master_id, value_code)
);
CREATE INDEX IF NOT EXISTS idx_lookup_value_master ON smm.md_lookup_value(lookup_master_id);

CREATE TABLE IF NOT EXISTS smm.md_lookup_scope (
  scope_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_value_id      uuid NOT NULL REFERENCES smm.md_lookup_value(lookup_value_id) ON DELETE CASCADE,
  org_id               uuid NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id             uuid NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  is_enabled           boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_lookup_scope UNIQUE (lookup_value_id, org_id, brand_id)
);
CREATE INDEX IF NOT EXISTS idx_lookup_scope_brand ON smm.md_lookup_scope(brand_id);

CREATE TABLE IF NOT EXISTS smm.md_lookup_translation (
  trans_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_value_id      uuid NOT NULL REFERENCES smm.md_lookup_value(lookup_value_id) ON DELETE CASCADE,
  language_id          uuid NOT NULL REFERENCES smm.language_master(language_id),
  label                text NOT NULL,
  CONSTRAINT uq_lookup_translation UNIQUE (lookup_value_id, language_id)
);

CREATE TABLE IF NOT EXISTS smm.md_tag (
  tag_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id             uuid NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  tag_code             text NOT NULL,
  tag_label            text NOT NULL,
  tag_type_lookup_id   uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_tag_code UNIQUE (org_id, brand_id, tag_code)
);
CREATE INDEX IF NOT EXISTS idx_tag_brand ON smm.md_tag(brand_id);

-- =========================================================
-- 4) Workflow + Approvals
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.md_workflow (
  workflow_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id             uuid NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  workflow_code        text NOT NULL,
  workflow_name        text NOT NULL,
  entity_type          text NOT NULL,
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_workflow_code UNIQUE (org_id, brand_id, workflow_code)
);
CREATE INDEX IF NOT EXISTS idx_workflow_brand ON smm.md_workflow(brand_id);

CREATE TABLE IF NOT EXISTS smm.md_workflow_state (
  state_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          uuid NOT NULL REFERENCES smm.md_workflow(workflow_id) ON DELETE CASCADE,
  state_lookup_value_id uuid NOT NULL REFERENCES smm.md_lookup_value(lookup_value_id),
  is_start             boolean NOT NULL DEFAULT false,
  is_end               boolean NOT NULL DEFAULT false,
  sort_order           integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_workflow_state_workflow ON smm.md_workflow_state(workflow_id);

CREATE TABLE IF NOT EXISTS smm.md_workflow_transition (
  transition_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          uuid NOT NULL REFERENCES smm.md_workflow(workflow_id) ON DELETE CASCADE,
  from_state_id        uuid NOT NULL REFERENCES smm.md_workflow_state(state_id) ON DELETE CASCADE,
  to_state_id          uuid NOT NULL REFERENCES smm.md_workflow_state(state_id) ON DELETE CASCADE,
  action_code          text NOT NULL,
  transition_name      text NOT NULL,
  requires_comment     boolean NOT NULL DEFAULT false,
  status_lookup_id     uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_wf_transition_workflow ON smm.md_workflow_transition(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_transition_from_to ON smm.md_workflow_transition(from_state_id, to_state_id);

CREATE TABLE IF NOT EXISTS smm.md_workflow_transition_role (
  tr_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_id        uuid NOT NULL REFERENCES smm.md_workflow_transition(transition_id) ON DELETE CASCADE,
  role_id              uuid NOT NULL REFERENCES smm.role(role_id) ON DELETE CASCADE,
  CONSTRAINT uq_transition_role UNIQUE (transition_id, role_id)
);

CREATE TABLE IF NOT EXISTS smm.md_workflow_rule (
  wf_rule_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          uuid NOT NULL REFERENCES smm.md_workflow(workflow_id) ON DELETE CASCADE,
  rule_name            text NOT NULL,
  priority             integer NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS smm.md_workflow_rule_condition (
  cond_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wf_rule_id           uuid NOT NULL REFERENCES smm.md_workflow_rule(wf_rule_id) ON DELETE CASCADE,
  field_path           text NOT NULL,
  operator             text NOT NULL,
  value_json           jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS smm.md_workflow_rule_action (
  action_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wf_rule_id           uuid NOT NULL REFERENCES smm.md_workflow_rule(wf_rule_id) ON DELETE CASCADE,
  action_type          text NOT NULL,
  params_json          jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS smm.workflow_instance (
  instance_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          uuid NOT NULL REFERENCES smm.md_workflow(workflow_id) ON DELETE CASCADE,
  entity_type          text NOT NULL,
  entity_id            uuid NOT NULL,
  current_state_id     uuid NOT NULL REFERENCES smm.md_workflow_state(state_id),
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_workflow_instance_entity ON smm.workflow_instance(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instance_state ON smm.workflow_instance(current_state_id);

CREATE TABLE IF NOT EXISTS smm.workflow_history (
  hist_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          uuid NOT NULL REFERENCES smm.workflow_instance(instance_id) ON DELETE CASCADE,
  from_state_id        uuid NULL REFERENCES smm.md_workflow_state(state_id),
  to_state_id          uuid NOT NULL REFERENCES smm.md_workflow_state(state_id),
  action_code          text NOT NULL,
  actor_user_id        uuid NULL REFERENCES smm."user"(user_id),
  comment              text NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_history_instance ON smm.workflow_history(instance_id);

CREATE TABLE IF NOT EXISTS smm.approval_request (
  approval_request_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id          uuid NOT NULL REFERENCES smm.workflow_instance(instance_id) ON DELETE CASCADE,
  entity_type          text NOT NULL,
  entity_id            uuid NOT NULL,
  status_lookup_id     uuid NULL,
  requested_by         uuid NULL REFERENCES smm."user"(user_id),
  requested_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_approval_request_entity ON smm.approval_request(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS smm.approval_step (
  step_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id  uuid NOT NULL REFERENCES smm.approval_request(approval_request_id) ON DELETE CASCADE,
  step_order           integer NOT NULL DEFAULT 1,
  required_role_id     uuid NOT NULL REFERENCES smm.role(role_id),
  is_parallel          boolean NOT NULL DEFAULT false,
  status_lookup_id     uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_approval_step_request ON smm.approval_step(approval_request_id);

-- =========================================================
-- 5) Channels / Social Accounts
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.md_channel (
  channel_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_code         text NOT NULL UNIQUE,
  channel_name         text NOT NULL
);

CREATE TABLE IF NOT EXISTS smm.md_channel_capability (
  cap_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id           uuid NOT NULL REFERENCES smm.md_channel(channel_id) ON DELETE CASCADE,
  capability_code      text NOT NULL,
  CONSTRAINT uq_channel_cap UNIQUE (channel_id, capability_code)
);

CREATE TABLE IF NOT EXISTS smm.md_channel_constraint (
  cons_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id           uuid NOT NULL REFERENCES smm.md_channel(channel_id) ON DELETE CASCADE,
  constraint_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_channel_constraint UNIQUE (channel_id)
);

CREATE TABLE IF NOT EXISTS smm.social_account (
  social_account_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  channel_id           uuid NOT NULL REFERENCES smm.md_channel(channel_id),
  external_account_id  text NOT NULL,
  display_name         text NOT NULL,
  handle               text NULL,
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_social_account UNIQUE (brand_id, channel_id, external_account_id)
);
CREATE INDEX IF NOT EXISTS idx_social_account_brand ON smm.social_account(brand_id);

CREATE TABLE IF NOT EXISTS smm.social_account_auth (
  auth_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id    uuid NOT NULL REFERENCES smm.social_account(social_account_id) ON DELETE CASCADE,
  access_token_enc     text NOT NULL,
  refresh_token_enc    text NULL,
  token_expires_at     timestamptz NULL,
  scopes_json          jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_refreshed_at    timestamptz NULL,
  status_lookup_id     uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_social_auth_account ON smm.social_account_auth(social_account_id);

-- =========================================================
-- 6) Campaigns / Posts / Versions / Scheduling / Publishing
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.campaign (
  campaign_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  campaign_code        text NOT NULL,
  campaign_name        text NOT NULL,
  objective_lookup_id  uuid NULL,
  status_lookup_id     uuid NULL,
  start_date           date NULL,
  end_date             date NULL,
  owner_user_id        uuid NULL REFERENCES smm."user"(user_id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL,
  CONSTRAINT uq_campaign_code UNIQUE (brand_id, campaign_code)
);
CREATE INDEX IF NOT EXISTS idx_campaign_brand ON smm.campaign(brand_id);

CREATE TABLE IF NOT EXISTS smm.asset (
  asset_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  asset_type_lookup_id uuid NULL,
  file_name            text NOT NULL,
  mime_type            text NULL,
  file_size_bytes      bigint NULL,
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL,
  updated_by           uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_brand ON smm.asset(brand_id);

CREATE TABLE IF NOT EXISTS smm.asset_storage_ref (
  storage_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id             uuid NOT NULL REFERENCES smm.asset(asset_id) ON DELETE CASCADE,
  provider             text NOT NULL,
  path                 text NOT NULL,
  checksum             text NULL,
  is_primary           boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_asset_storage_asset ON smm.asset_storage_ref(asset_id);

CREATE TABLE IF NOT EXISTS smm.post (
  post_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  campaign_id          uuid NULL REFERENCES smm.campaign(campaign_id) ON DELETE SET NULL,
  workflow_instance_id uuid NULL REFERENCES smm.workflow_instance(instance_id) ON DELETE SET NULL,
  post_status_lookup_id uuid NULL,
  title                text NULL,
  content_pillar_lookup_id uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL REFERENCES smm."user"(user_id),
  updated_by           uuid NULL REFERENCES smm."user"(user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_brand_status ON smm.post(brand_id, post_status_lookup_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_campaign ON smm.post(campaign_id);

CREATE TABLE IF NOT EXISTS smm.post_version (
  post_version_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id              uuid NOT NULL REFERENCES smm.post(post_id) ON DELETE CASCADE,
  version_no           integer NOT NULL,
  content_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_summary       text NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL REFERENCES smm."user"(user_id),
  CONSTRAINT uq_post_version UNIQUE (post_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_post_version_post ON smm.post_version(post_id);

CREATE TABLE IF NOT EXISTS smm.post_asset_link (
  pal_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_version_id      uuid NOT NULL REFERENCES smm.post_version(post_version_id) ON DELETE CASCADE,
  asset_id             uuid NOT NULL REFERENCES smm.asset(asset_id),
  sort_order           integer NOT NULL DEFAULT 0,
  CONSTRAINT uq_post_asset UNIQUE (post_version_id, asset_id)
);
CREATE INDEX IF NOT EXISTS idx_post_asset_version ON smm.post_asset_link(post_version_id);

CREATE TABLE IF NOT EXISTS smm.post_channel_map (
  pcm_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id              uuid NOT NULL REFERENCES smm.post(post_id) ON DELETE CASCADE,
  social_account_id    uuid NOT NULL REFERENCES smm.social_account(social_account_id) ON DELETE CASCADE,
  channel_content_type_lookup_id uuid NULL,
  status_lookup_id     uuid NULL,
  CONSTRAINT uq_post_channel UNIQUE (post_id, social_account_id)
);
CREATE INDEX IF NOT EXISTS idx_post_channel_post ON smm.post_channel_map(post_id);

CREATE TABLE IF NOT EXISTS smm.post_channel_payload (
  pcp_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_version_id      uuid NOT NULL REFERENCES smm.post_version(post_version_id) ON DELETE CASCADE,
  social_account_id    uuid NOT NULL REFERENCES smm.social_account(social_account_id) ON DELETE CASCADE,
  payload_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_result_json jsonb NULL,
  CONSTRAINT uq_payload UNIQUE (post_version_id, social_account_id)
);

CREATE TABLE IF NOT EXISTS smm.post_schedule (
  schedule_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id              uuid NOT NULL REFERENCES smm.post(post_id) ON DELETE CASCADE,
  timezone_id          uuid NOT NULL REFERENCES smm.timezone_master(timezone_id),
  scheduled_at         timestamptz NOT NULL,
  queue_status_lookup_id uuid NULL,
  publish_mode_lookup_id uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid NULL REFERENCES smm."user"(user_id),
  updated_by           uuid NULL REFERENCES smm."user"(user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_schedule_time ON smm.post_schedule(scheduled_at);

CREATE TABLE IF NOT EXISTS smm.publish_queue (
  queue_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id          uuid NOT NULL REFERENCES smm.post_schedule(schedule_id) ON DELETE CASCADE,
  run_at               timestamptz NOT NULL,
  priority             integer NOT NULL DEFAULT 100,
  attempt_count        integer NOT NULL DEFAULT 0,
  next_retry_at        timestamptz NULL,
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_publish_queue_run ON smm.publish_queue(status_lookup_id, run_at);

CREATE TABLE IF NOT EXISTS smm.post_publish_log (
  ppl_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id              uuid NOT NULL REFERENCES smm.post(post_id) ON DELETE CASCADE,
  social_account_id    uuid NOT NULL REFERENCES smm.social_account(social_account_id),
  schedule_id          uuid NULL REFERENCES smm.post_schedule(schedule_id) ON DELETE SET NULL,
  publish_status_lookup_id uuid NULL,
  external_post_id     text NULL,
  request_json         jsonb NULL,
  response_json        jsonb NULL,
  published_at         timestamptz NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_publish_log_post ON smm.post_publish_log(post_id);

CREATE TABLE IF NOT EXISTS smm.manual_publish_proof (
  mpp_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id              uuid NOT NULL REFERENCES smm.post(post_id) ON DELETE CASCADE,
  social_account_id    uuid NOT NULL REFERENCES smm.social_account(social_account_id),
  proof_type_lookup_id uuid NULL,
  proof_asset_id       uuid NULL REFERENCES smm.asset(asset_id),
  proof_url            text NULL,
  submitted_by         uuid NULL REFERENCES smm."user"(user_id),
  verified_by          uuid NULL REFERENCES smm."user"(user_id),
  verified_at          timestamptz NULL,
  status_lookup_id     uuid NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manual_proof_post ON smm.manual_publish_proof(post_id);

-- =========================================================
-- 7) Engagement Inbox
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.engagement_item (
  engagement_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  channel_id           uuid NOT NULL REFERENCES smm.md_channel(channel_id),
  social_account_id    uuid NOT NULL REFERENCES smm.social_account(social_account_id),
  type_lookup_id       uuid NULL,
  status_lookup_id     uuid NULL,
  priority_lookup_id   uuid NULL,
  external_thread_id   text NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_engagement_brand_status ON smm.engagement_item(brand_id, status_lookup_id, created_at DESC);

CREATE TABLE IF NOT EXISTS smm.engagement_thread (
  thread_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id        uuid NOT NULL REFERENCES smm.engagement_item(engagement_id) ON DELETE CASCADE,
  external_thread_id   text NULL
);

CREATE TABLE IF NOT EXISTS smm.engagement_author (
  author_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id           uuid NOT NULL REFERENCES smm.md_channel(channel_id),
  external_user_id     text NOT NULL,
  display_name         text NOT NULL,
  profile_url          text NULL,
  CONSTRAINT uq_author UNIQUE (channel_id, external_user_id)
);

CREATE TABLE IF NOT EXISTS smm.engagement_message (
  msg_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id            uuid NOT NULL REFERENCES smm.engagement_thread(thread_id) ON DELETE CASCADE,
  author_id            uuid NULL REFERENCES smm.engagement_author(author_id),
  direction_lookup_id  uuid NULL,
  message_text         text NOT NULL,
  message_payload_json jsonb NULL,
  external_message_id  text NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_engagement_msg_thread ON smm.engagement_message(thread_id, created_at);

CREATE TABLE IF NOT EXISTS smm.engagement_assignment (
  ea_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id        uuid NOT NULL REFERENCES smm.engagement_item(engagement_id) ON DELETE CASCADE,
  assigned_to          uuid NOT NULL REFERENCES smm."user"(user_id),
  assigned_by          uuid NULL REFERENCES smm."user"(user_id),
  assigned_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_engagement_assign_to ON smm.engagement_assignment(assigned_to);

-- =========================================================
-- 8) Analytics
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.metric_definition (
  metric_def_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_code          text NOT NULL UNIQUE,
  metric_name          text NOT NULL,
  unit_lookup_id       uuid NULL,
  aggregation_type     text NOT NULL DEFAULT 'SUM',
  description          text NULL
);

CREATE TABLE IF NOT EXISTS smm.metric_raw (
  raw_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  post_id              uuid NOT NULL REFERENCES smm.post(post_id) ON DELETE CASCADE,
  social_account_id    uuid NOT NULL REFERENCES smm.social_account(social_account_id) ON DELETE CASCADE,
  metric_def_id        uuid NOT NULL REFERENCES smm.metric_definition(metric_def_id) ON DELETE CASCADE,
  value                numeric(18,6) NOT NULL,
  captured_at          timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_metric_raw_time ON smm.metric_raw(social_account_id, metric_def_id, captured_at);

CREATE TABLE IF NOT EXISTS smm.metric_daily_agg (
  dagg_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  date                 date NOT NULL,
  metric_def_id        uuid NOT NULL REFERENCES smm.metric_definition(metric_def_id) ON DELETE CASCADE,
  value                numeric(18,6) NOT NULL,
  CONSTRAINT uq_metric_daily UNIQUE (brand_id, date, metric_def_id)
);

-- =========================================================
-- 9) Audit
-- =========================================================
CREATE TABLE IF NOT EXISTS smm.audit_log (
  audit_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id             uuid NULL REFERENCES smm.brand(brand_id) ON DELETE SET NULL,
  entity_type          text NOT NULL,
  entity_id            uuid NOT NULL,
  action               text NOT NULL,
  before_json          jsonb NULL,
  after_json           jsonb NULL,
  actor_user_id        uuid NULL REFERENCES smm."user"(user_id),
  ip_address           inet NULL,
  user_agent           text NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON smm.audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org_time ON smm.audit_log(org_id, created_at DESC);

COMMIT;
