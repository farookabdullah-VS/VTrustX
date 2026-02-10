-- =========================================================
-- 004_engagement_sla_sentiment.sql
-- SLA policy/timers + sentiment + canned responses
-- Schema: smm (PostgreSQL)
-- =========================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS smm;

CREATE TABLE IF NOT EXISTS smm.engagement_sla_policy (
  sla_policy_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  channel_id            uuid NULL REFERENCES smm.md_channel(channel_id) ON DELETE SET NULL,
  engagement_type_lookup_id uuid NULL,
  priority_lookup_id    uuid NULL,
  first_response_minutes integer NOT NULL DEFAULT 60,
  resolution_minutes     integer NOT NULL DEFAULT 1440,
  escalation_team_id    uuid NULL REFERENCES smm.team(team_id) ON DELETE SET NULL,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  updated_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_sla_policy_brand ON smm.engagement_sla_policy(brand_id);

CREATE TABLE IF NOT EXISTS smm.engagement_sla_timer (
  sla_timer_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         uuid NOT NULL REFERENCES smm.engagement_item(engagement_id) ON DELETE CASCADE,
  sla_policy_id         uuid NULL REFERENCES smm.engagement_sla_policy(sla_policy_id) ON DELETE SET NULL,
  first_response_due_at timestamptz NULL,
  resolution_due_at     timestamptz NULL,
  first_response_at     timestamptz NULL,
  resolved_at           timestamptz NULL,
  breached_first_response boolean NOT NULL DEFAULT false,
  breached_resolution     boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sla_timer_engagement ON smm.engagement_sla_timer(engagement_id);
CREATE INDEX IF NOT EXISTS idx_sla_timer_due ON smm.engagement_sla_timer(first_response_due_at, resolution_due_at);

CREATE TABLE IF NOT EXISTS smm.engagement_sentiment (
  sentiment_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         uuid NOT NULL REFERENCES smm.engagement_item(engagement_id) ON DELETE CASCADE,
  sentiment_lookup_id   uuid NULL,
  score                 numeric(6,4) NULL,
  emotion_json          jsonb NULL,
  language              text NULL,
  model_ref             text NULL,
  explanation           text NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eng_sentiment_eng ON smm.engagement_sentiment(engagement_id);

CREATE TABLE IF NOT EXISTS smm.engagement_response_template (
  response_template_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  channel_id            uuid NULL REFERENCES smm.md_channel(channel_id) ON DELETE SET NULL,
  template_name         text NOT NULL,
  category_lookup_id    uuid NULL,
  language              text NULL,
  body_text             text NOT NULL,
  body_json             jsonb NULL,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  updated_by            uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_eng_resp_tmpl_brand ON smm.engagement_response_template(brand_id);

CREATE TABLE IF NOT EXISTS smm.engagement_response_log (
  response_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         uuid NOT NULL REFERENCES smm.engagement_item(engagement_id) ON DELETE CASCADE,
  thread_id             uuid NULL REFERENCES smm.engagement_thread(thread_id) ON DELETE SET NULL,
  responder_user_id     uuid NULL REFERENCES smm."user"(user_id) ON DELETE SET NULL,
  response_text         text NOT NULL,
  response_payload_json jsonb NULL,
  external_message_id   text NULL,
  sent_at               timestamptz NULL,
  send_status_lookup_id uuid NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eng_response_eng ON smm.engagement_response_log(engagement_id, created_at DESC);

COMMIT;
