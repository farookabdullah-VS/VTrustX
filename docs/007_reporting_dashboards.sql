-- =========================================================
-- 007_reporting_dashboards.sql
-- Dashboards/widgets, report templates, report runs, exports
-- Schema: smm (PostgreSQL)
-- =========================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS smm;

CREATE TABLE IF NOT EXISTS smm.dashboard (
  dashboard_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id              uuid NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  dashboard_code        text NOT NULL,
  dashboard_name        text NOT NULL,
  status_lookup_id      uuid NULL,
  layout_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid NULL,
  updated_by            uuid NULL,
  CONSTRAINT uq_dashboard_code UNIQUE (org_id, brand_id, dashboard_code)
);
CREATE INDEX IF NOT EXISTS idx_dashboard_brand ON smm.dashboard(brand_id);

CREATE TABLE IF NOT EXISTS smm.dashboard_widget (
  widget_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id          uuid NOT NULL REFERENCES smm.dashboard(dashboard_id) ON DELETE CASCADE,
  widget_type_lookup_id uuid NULL,
  title                 text NULL,
  query_type            text NOT NULL DEFAULT 'SQL',
  query_text            text NULL,
  config_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_widget_dashboard ON smm.dashboard_widget(dashboard_id);

CREATE TABLE IF NOT EXISTS smm.report_template (
  report_template_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES smm.org(org_id) ON DELETE CASCADE,
  brand_id              uuid NULL REFERENCES smm.brand(brand_id) ON DELETE CASCADE,
  template_code         text NOT NULL,
  template_name         text NOT NULL,
  status_lookup_id      uuid NULL,
  layout_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_report_template_code UNIQUE (org_id, brand_id, template_code)
);
CREATE INDEX IF NOT EXISTS idx_report_template_brand ON smm.report_template(brand_id);

CREATE TABLE IF NOT EXISTS smm.report_run (
  report_run_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_template_id    uuid NOT NULL REFERENCES smm.report_template(report_template_id) ON DELETE CASCADE,
  parameters_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_lookup_id      uuid NULL,
  started_at            timestamptz NOT NULL DEFAULT now(),
  finished_at           timestamptz NULL,
  error_text            text NULL,
  requested_by          uuid NULL REFERENCES smm."user"(user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_report_run_template_time ON smm.report_run(report_template_id, started_at DESC);

CREATE TABLE IF NOT EXISTS smm.report_export (
  report_export_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_run_id         uuid NOT NULL REFERENCES smm.report_run(report_run_id) ON DELETE CASCADE,
  export_format_lookup_id uuid NULL,
  storage_path          text NOT NULL,
  file_name             text NOT NULL,
  file_size_bytes       bigint NULL,
  checksum              text NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_export_run ON smm.report_export(report_run_id);

COMMIT;
