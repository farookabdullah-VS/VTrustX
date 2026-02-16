/**
 * Migration: Analytics Studio Enhancements (Phase 2)
 *
 * This migration adds support for:
 * - Report templates (pre-built report layouts)
 * - Scheduled reports (automated report generation and delivery)
 * - Report snapshots (point-in-time data captures for comparison)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================
  // 1. Report Templates Table
  // ============================================
  pgm.createTable('report_templates', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    category: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'Template category: survey, delivery, sentiment, mixed'
    },
    layout: {
      type: 'jsonb',
      notNull: true,
      comment: 'Grid layout configuration (react-grid-layout format)'
    },
    widgets: {
      type: 'jsonb',
      notNull: true,
      comment: 'Array of widget configurations'
    },
    thumbnail_url: {
      type: 'varchar(500)',
      comment: 'URL to template preview image'
    },
    is_public: {
      type: 'boolean',
      default: false,
      comment: 'Whether template is available to all tenants'
    },
    usage_count: {
      type: 'integer',
      default: 0,
      comment: 'Number of times template has been used'
    },
    created_by: {
      type: 'integer',
      references: 'users(id)',
      onDelete: 'SET NULL',
      comment: 'User who created the template (NULL for system templates)'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Indexes for report_templates
  pgm.createIndex('report_templates', 'category');
  pgm.createIndex('report_templates', 'is_public');
  pgm.createIndex('report_templates', ['category', 'is_public']);
  pgm.createIndex('report_templates', 'usage_count', { name: 'report_templates_usage_idx' });

  // ============================================
  // 2. Scheduled Reports Table
  // ============================================
  pgm.createTable('scheduled_reports', {
    id: { type: 'serial', primaryKey: true },
    tenant_id: {
      type: 'integer',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE'
    },
    report_id: {
      type: 'uuid',
      references: 'reports(id)',
      onDelete: 'CASCADE',
      comment: 'The report to run on schedule'
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Name of the scheduled report'
    },
    schedule_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Schedule frequency: daily, weekly, monthly, custom'
    },
    schedule_config: {
      type: 'jsonb',
      notNull: true,
      comment: 'Schedule configuration (time, day, cron expression, etc.)'
    },
    recipients: {
      type: 'jsonb',
      notNull: true,
      comment: 'Array of email addresses to receive the report'
    },
    format: {
      type: 'varchar(20)',
      notNull: true,
      default: "'pdf'",
      comment: 'Export format: pdf, excel, pptx'
    },
    filters: {
      type: 'jsonb',
      comment: 'Filters to apply when generating report'
    },
    is_active: {
      type: 'boolean',
      default: true,
      comment: 'Whether the schedule is currently active'
    },
    last_run_at: {
      type: 'timestamp',
      comment: 'Timestamp of last successful execution'
    },
    last_run_status: {
      type: 'varchar(50)',
      comment: 'Status of last run: success, failed, partial'
    },
    last_run_error: {
      type: 'text',
      comment: 'Error message from last failed run'
    },
    next_run_at: {
      type: 'timestamp',
      comment: 'Timestamp of next scheduled execution'
    },
    created_by: {
      type: 'integer',
      references: 'users(id)',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Indexes for scheduled_reports
  pgm.createIndex('scheduled_reports', 'tenant_id');
  pgm.createIndex('scheduled_reports', 'report_id');
  pgm.createIndex('scheduled_reports', ['is_active', 'next_run_at'], {
    name: 'scheduled_reports_active_next_run_idx'
  });
  pgm.createIndex('scheduled_reports', 'created_by');

  // ============================================
  // 3. Report Snapshots Table
  // ============================================
  pgm.createTable('report_snapshots', {
    id: { type: 'serial', primaryKey: true },
    tenant_id: {
      type: 'integer',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE'
    },
    report_id: {
      type: 'uuid',
      references: 'reports(id)',
      onDelete: 'CASCADE',
      comment: 'The report this snapshot belongs to'
    },
    snapshot_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'User-friendly name for the snapshot'
    },
    snapshot_data: {
      type: 'jsonb',
      notNull: true,
      comment: 'Complete data captured at snapshot time'
    },
    filters_applied: {
      type: 'jsonb',
      comment: 'Filters that were active when snapshot was taken'
    },
    metadata: {
      type: 'jsonb',
      comment: 'Additional metadata (row count, date range, etc.)'
    },
    created_by: {
      type: 'integer',
      references: 'users(id)',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Indexes for report_snapshots
  pgm.createIndex('report_snapshots', 'tenant_id');
  pgm.createIndex('report_snapshots', 'report_id');
  pgm.createIndex('report_snapshots', ['tenant_id', 'report_id'], {
    name: 'report_snapshots_tenant_report_idx'
  });
  pgm.createIndex('report_snapshots', 'created_at');

  // ============================================
  // 4. Insert System Templates
  // ============================================

  // Template 1: NPS Overview Dashboard
  pgm.sql(`
    INSERT INTO report_templates (name, description, category, layout, widgets, is_public, thumbnail_url)
    VALUES (
      'NPS Overview Dashboard',
      'Comprehensive NPS analysis with trends, distribution, and detractor management',
      'survey',
      '[
        {"i":"nps-score","x":0,"y":0,"w":3,"h":2},
        {"i":"response-count","x":3,"y":0,"w":3,"h":2},
        {"i":"nps-trend","x":0,"y":2,"w":6,"h":4},
        {"i":"nps-distribution","x":6,"y":0,"w":6,"h":3},
        {"i":"detractors-table","x":6,"y":3,"w":6,"h":3}
      ]'::jsonb,
      '[
        {
          "id": "nps-score",
          "type": "kpi",
          "config": {
            "title": "Net Promoter Score",
            "metric": "nps",
            "format": "number",
            "showTrend": true
          }
        },
        {
          "id": "response-count",
          "type": "kpi",
          "config": {
            "title": "Total Responses",
            "metric": "count",
            "format": "number"
          }
        },
        {
          "id": "nps-trend",
          "type": "chart",
          "config": {
            "title": "NPS Trend Over Time",
            "chartType": "line",
            "xAxis": "date",
            "yAxis": "nps"
          }
        },
        {
          "id": "nps-distribution",
          "type": "chart",
          "config": {
            "title": "Score Distribution",
            "chartType": "bar",
            "xAxis": "score",
            "yAxis": "count"
          }
        },
        {
          "id": "detractors-table",
          "type": "table",
          "config": {
            "title": "Recent Detractors",
            "columns": ["name", "score", "feedback", "date"],
            "filter": "score <= 6"
          }
        }
      ]'::jsonb,
      true,
      '/templates/nps-overview.png'
    )
  `);

  // Template 2: Delivery Performance Summary
  pgm.sql(`
    INSERT INTO report_templates (name, description, category, layout, widgets, is_public, thumbnail_url)
    VALUES (
      'Delivery Performance Summary',
      'Multi-channel delivery metrics with funnel analysis and channel comparison',
      'delivery',
      '[
        {"i":"delivery-rate","x":0,"y":0,"w":3,"h":2},
        {"i":"response-rate","x":3,"y":0,"w":3,"h":2},
        {"i":"avg-time","x":6,"y":0,"w":3,"h":2},
        {"i":"funnel","x":0,"y":2,"w":6,"h":4},
        {"i":"channel-comparison","x":6,"y":2,"w":6,"h":4}
      ]'::jsonb,
      '[
        {
          "id": "delivery-rate",
          "type": "kpi",
          "config": {
            "title": "Delivery Rate",
            "metric": "deliveryRate",
            "format": "percentage",
            "showTrend": true
          }
        },
        {
          "id": "response-rate",
          "type": "kpi",
          "config": {
            "title": "Response Rate",
            "metric": "responseRate",
            "format": "percentage",
            "showTrend": true
          }
        },
        {
          "id": "avg-time",
          "type": "kpi",
          "config": {
            "title": "Avg. Time to Respond",
            "metric": "avgResponseTime",
            "format": "duration"
          }
        },
        {
          "id": "funnel",
          "type": "chart",
          "config": {
            "title": "Response Funnel",
            "chartType": "funnel",
            "stages": ["sent", "delivered", "viewed", "started", "completed"]
          }
        },
        {
          "id": "channel-comparison",
          "type": "chart",
          "config": {
            "title": "Performance by Channel",
            "chartType": "bar",
            "xAxis": "channel",
            "yAxis": "deliveryRate"
          }
        }
      ]'::jsonb,
      true,
      '/templates/delivery-performance.png'
    )
  `);

  // Template 3: Sentiment Analysis Dashboard
  pgm.sql(`
    INSERT INTO report_templates (name, description, category, layout, widgets, is_public, thumbnail_url)
    VALUES (
      'Sentiment Analysis Dashboard',
      'Text analytics with sentiment trends, word clouds, and key themes',
      'sentiment',
      '[
        {"i":"sentiment-score","x":0,"y":0,"w":3,"h":2},
        {"i":"sentiment-distribution","x":3,"y":0,"w":3,"h":2},
        {"i":"sentiment-trend","x":0,"y":2,"w":6,"h":3},
        {"i":"word-cloud","x":6,"y":0,"w":6,"h":3},
        {"i":"themes-table","x":6,"y":3,"w":6,"h":3}
      ]'::jsonb,
      '[
        {
          "id": "sentiment-score",
          "type": "kpi",
          "config": {
            "title": "Average Sentiment",
            "metric": "avgSentiment",
            "format": "number",
            "showTrend": true
          }
        },
        {
          "id": "sentiment-distribution",
          "type": "chart",
          "config": {
            "title": "Sentiment Distribution",
            "chartType": "pie",
            "field": "sentiment"
          }
        },
        {
          "id": "sentiment-trend",
          "type": "chart",
          "config": {
            "title": "Sentiment Over Time",
            "chartType": "area",
            "xAxis": "date",
            "yAxis": "sentiment"
          }
        },
        {
          "id": "word-cloud",
          "type": "wordCloud",
          "config": {
            "title": "Common Terms",
            "field": "feedback"
          }
        },
        {
          "id": "themes-table",
          "type": "table",
          "config": {
            "title": "Key Themes",
            "columns": ["theme", "count", "sentiment"]
          }
        }
      ]'::jsonb,
      true,
      '/templates/sentiment-analysis.png'
    )
  `);

  // Template 4: Executive Summary
  pgm.sql(`
    INSERT INTO report_templates (name, description, category, layout, widgets, is_public, thumbnail_url)
    VALUES (
      'Executive Summary',
      'High-level overview with key metrics, trends, and insights for leadership',
      'mixed',
      '[
        {"i":"nps","x":0,"y":0,"w":2,"h":2},
        {"i":"csat","x":2,"y":0,"w":2,"h":2},
        {"i":"responses","x":4,"y":0,"w":2,"h":2},
        {"i":"response-rate","x":6,"y":0,"w":2,"h":2},
        {"i":"nps-trend","x":0,"y":2,"w":8,"h":3},
        {"i":"key-drivers","x":8,"y":0,"w":4,"h":5}
      ]'::jsonb,
      '[
        {
          "id": "nps",
          "type": "kpi",
          "config": {
            "title": "NPS",
            "metric": "nps",
            "format": "number",
            "showTrend": true,
            "target": 50
          }
        },
        {
          "id": "csat",
          "type": "kpi",
          "config": {
            "title": "CSAT",
            "metric": "csat",
            "format": "percentage",
            "showTrend": true,
            "target": 85
          }
        },
        {
          "id": "responses",
          "type": "kpi",
          "config": {
            "title": "Total Responses",
            "metric": "count",
            "format": "number"
          }
        },
        {
          "id": "response-rate",
          "type": "kpi",
          "config": {
            "title": "Response Rate",
            "metric": "responseRate",
            "format": "percentage",
            "showTrend": true
          }
        },
        {
          "id": "nps-trend",
          "type": "chart",
          "config": {
            "title": "NPS Trend (Last 90 Days)",
            "chartType": "line",
            "xAxis": "date",
            "yAxis": "nps"
          }
        },
        {
          "id": "key-drivers",
          "type": "keyDrivers",
          "config": {
            "title": "Key Satisfaction Drivers",
            "targetMetric": "satisfaction"
          }
        }
      ]'::jsonb,
      true,
      '/templates/executive-summary.png'
    )
  `);

  // ============================================
  // 5. Add Triggers for updated_at
  // ============================================

  // Function to update updated_at timestamp
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Trigger for report_templates
  pgm.sql(`
    CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Trigger for scheduled_reports
  pgm.sql(`
    CREATE TRIGGER update_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = (pgm) => {
  // Drop triggers
  pgm.sql('DROP TRIGGER IF EXISTS update_scheduled_reports_updated_at ON scheduled_reports');
  pgm.sql('DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates');
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column()');

  // Drop tables in reverse order (respecting foreign key dependencies)
  pgm.dropTable('report_snapshots');
  pgm.dropTable('scheduled_reports');
  pgm.dropTable('report_templates');
};
