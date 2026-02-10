-- =========================================================
-- 005_compliance_crisis_links.sql
-- Banned terms, disclaimers, compliance checks, crisis cases, UTM/link tracking
-- Schema: smm (PostgreSQL)
-- =========================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS smm;

CREATE TABLE IF NOT EXISTS smm.md_banned_term (
  banned_term_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  term                  text NOT NULL,
  match_type_lookup_id  uuid NULL,
  severity_lookup_id    uuid NULL,
  notes                 text NULL,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  CONSTRAINT uq_banned_term UNIQUE (brand_id, term)
);
CREATE INDEX IF NOT EXISTS idx_banned_term_brand ON smm.md_banned_term(brand_id);

CREATE TABLE IF NOT EXISTS smm.md_disclaimer (
  disclaimer_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  disclaimer_code       text NOT NULL,
  disclaimer_text       text NOT NULL,
  language              text NULL,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  CONSTRAINT uq_disclaimer_code UNIQUE (brand_id, disclaimer_code)
);
CREATE INDEX IF NOT EXISTS idx_disclaimer_brand ON smm.md_disclaimer(brand_id);

CREATE TABLE IF NOT EXISTS smm.disclaimer_rule (
  disclaimer_rule_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  rule_name             text NOT NULL,
  priority              integer NOT NULL DEFAULT 0,
  condition_json        jsonb NOT NULL DEFAULT '{}'::jsonb,
  disclaimer_id         uuid NOT NULL REFERENCES smm.md_disclaimer(disclaimer_id) ON DELETE CASCADE,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disclaimer_rule_brand ON smm.disclaimer_rule(brand_id, priority);

CREATE TABLE IF NOT EXISTS smm.content_compliance_check (
  compliance_check_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_version_id       uuid NOT NULL REFERENCES smm.post_version(post_version_id) ON DELETE CASCADE,
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  status_lookup_id      uuid NULL,
  findings_json         jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at            timestamptz NOT NULL DEFAULT now(),
  checked_by            uuid NULL,
  CONSTRAINT uq_compliance_post_version UNIQUE (post_version_id)
);
CREATE INDEX IF NOT EXISTS idx_compliance_brand_time ON smm.content_compliance_check(brand_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS smm.crisis_policy (
  crisis_policy_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  sla_minutes           integer NOT NULL DEFAULT 15,
  escalation_team_id    uuid NULL REFERENCES smm.team(team_id) ON DELETE SET NULL,
  notify_channels_json  jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crisis_policy_brand ON smm.crisis_policy(brand_id);

CREATE TABLE IF NOT EXISTS smm.crisis_trigger_rule (
  trigger_rule_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_policy_id      uuid NOT NULL REFERENCES smm.crisis_policy(crisis_policy_id) ON DELETE CASCADE,
  rule_name             text NOT NULL,
  priority              integer NOT NULL DEFAULT 0,
  condition_json        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crisis_trigger_policy ON smm.crisis_trigger_rule(crisis_policy_id, priority);

CREATE TABLE IF NOT EXISTS smm.crisis_case (
  crisis_case_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  engagement_id         uuid NULL REFERENCES smm.engagement_item(engagement_id) ON DELETE SET NULL,
  status_lookup_id      uuid NULL,
  severity_lookup_id    uuid NULL,
  title                 text NOT NULL,
  description           text NULL,
  owner_user_id         uuid NULL REFERENCES smm."user"(user_id) ON DELETE SET NULL,
  sla_due_at            timestamptz NULL,
  resolved_at           timestamptz NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crisis_case_brand_status ON smm.crisis_case(brand_id, status_lookup_id, created_at DESC);

CREATE TABLE IF NOT EXISTS smm.crisis_case_timeline (
  timeline_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_case_id        uuid NOT NULL REFERENCES smm.crisis_case(crisis_case_id) ON DELETE CASCADE,
  event_type            text NOT NULL,
  event_json            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_crisis_timeline_case ON smm.crisis_case_timeline(crisis_case_id, created_at);

CREATE TABLE IF NOT EXISTS smm.link_master (
  link_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  original_url          text NOT NULL,
  short_url             text NULL,
  shortener_provider_lookup_id uuid NULL,
  utm_json              jsonb NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_link_brand ON smm.link_master(brand_id);

CREATE TABLE IF NOT EXISTS smm.link_utm_template (
  utm_template_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  template_name         text NOT NULL,
  template_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utm_template_brand ON smm.link_utm_template(brand_id);

CREATE TABLE IF NOT EXISTS smm.link_click_event (
  click_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id               uuid NOT NULL REFERENCES smm.link_master(link_id) ON DELETE CASCADE,
  channel_id            uuid NULL REFERENCES smm.md_channel(channel_id) ON DELETE SET NULL,
  social_account_id     uuid NULL REFERENCES smm.social_account(social_account_id) ON DELETE SET NULL,
  post_id               uuid NULL REFERENCES smm.post(post_id) ON DELETE SET NULL,
  clicked_at            timestamptz NOT NULL DEFAULT now(),
  meta_json             jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_link_click_link_time ON smm.link_click_event(link_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_click_post_time ON smm.link_click_event(post_id, clicked_at DESC);

COMMIT;
