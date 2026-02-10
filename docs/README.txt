SMM SQL MIGRATIONS (PostgreSQL)
Generated: 2026-01-15

Run order:
  001_init_spine.sql
  002_assets_extended.sql
  003_templates.sql
  004_engagement_sla_sentiment.sql
  005_compliance_crisis_links.sql
  006_ai_layer.sql
  007_reporting_dashboards.sql

Example:
  psql -h <host> -U <user> -d <db> -f 001_init_spine.sql
  psql -h <host> -U <user> -d <db> -f 002_assets_extended.sql
  ...

Notes:
- These are schema-only migrations.
- Lookups (statuses/types) should be seeded separately (seed script can be added if you want).
