/**
 * Seed Default Report Templates
 *
 * Creates pre-built report templates for each category:
 * - Survey Analytics
 * - Delivery Performance
 * - Sentiment Analysis
 * - Mixed/Executive
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

const templates = [
  // ========================================
  // SURVEY ANALYTICS TEMPLATES
  // ========================================
  {
    name: 'NPS Dashboard',
    description: 'Comprehensive Net Promoter Score analysis with trend tracking, distribution, and key driver analysis',
    category: 'survey',
    is_public: true,
    layout: { cols: 12, rows: 8 },
    widgets: [
      {
        type: 'kpi',
        x: 0, y: 0, w: 3, h: 2,
        config: {
          title: 'NPS Score',
          metric: 'nps',
          showTrend: true,
          icon: 'TrendingUp'
        }
      },
      {
        type: 'kpi',
        x: 3, y: 0, w: 3, h: 2,
        config: {
          title: 'Total Responses',
          metric: 'count',
          icon: 'Users'
        }
      },
      {
        type: 'kpi',
        x: 6, y: 0, w: 3, h: 2,
        config: {
          title: 'Promoters',
          metric: 'promoters_percent',
          color: '#10b981'
        }
      },
      {
        type: 'kpi',
        x: 9, y: 0, w: 3, h: 2,
        config: {
          title: 'Detractors',
          metric: 'detractors_percent',
          color: '#ef4444'
        }
      },
      {
        type: 'chart',
        x: 0, y: 2, w: 6, h: 3,
        config: {
          type: 'line',
          title: 'NPS Trend Over Time',
          xKey: 'date',
          yKey: 'nps',
          yAggregation: 'avg'
        }
      },
      {
        type: 'chart',
        x: 6, y: 2, w: 6, h: 3,
        config: {
          type: 'bar',
          title: 'Distribution by Score',
          xKey: 'score',
          yKey: 'count',
          yAggregation: 'count'
        }
      },
      {
        type: 'keydriver',
        x: 0, y: 5, w: 6, h: 3,
        config: {
          title: 'Key Drivers of NPS',
          targetMetric: 'nps'
        }
      },
      {
        type: 'table',
        x: 6, y: 5, w: 6, h: 3,
        config: {
          title: 'Recent Responses',
          limit: 10,
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      }
    ]
  },

  {
    name: 'Customer Satisfaction Report',
    description: 'CSAT analysis with satisfaction trends, category breakdown, and improvement areas',
    category: 'survey',
    is_public: true,
    layout: { cols: 12, rows: 8 },
    widgets: [
      {
        type: 'kpi',
        x: 0, y: 0, w: 4, h: 2,
        config: {
          title: 'Average CSAT Score',
          metric: 'csat',
          showTrend: true
        }
      },
      {
        type: 'kpi',
        x: 4, y: 0, w: 4, h: 2,
        config: {
          title: 'Satisfaction Rate',
          metric: 'satisfaction_rate',
          format: 'percentage'
        }
      },
      {
        type: 'kpi',
        x: 8, y: 0, w: 4, h: 2,
        config: {
          title: 'Total Surveys',
          metric: 'count'
        }
      },
      {
        type: 'chart',
        x: 0, y: 2, w: 8, h: 3,
        config: {
          type: 'area',
          title: 'Satisfaction Trend',
          xKey: 'date',
          yKey: 'satisfaction_score',
          yAggregation: 'avg'
        }
      },
      {
        type: 'chart',
        x: 8, y: 2, w: 4, h: 3,
        config: {
          type: 'pie',
          title: 'Rating Distribution',
          xKey: 'rating',
          yKey: 'count',
          yAggregation: 'count'
        }
      },
      {
        type: 'chart',
        x: 0, y: 5, w: 6, h: 3,
        config: {
          type: 'bar',
          title: 'Satisfaction by Category',
          xKey: 'category',
          yKey: 'satisfaction_score',
          yAggregation: 'avg'
        }
      },
      {
        type: 'wordcloud',
        x: 6, y: 5, w: 6, h: 3,
        config: {
          title: 'Customer Feedback',
          field: 'comments',
          maxWords: 50
        }
      }
    ]
  },

  {
    name: 'Survey Response Analysis',
    description: 'Detailed response analysis with completion rates, drop-off points, and demographic breakdown',
    category: 'survey',
    is_public: true,
    layout: { cols: 12, rows: 8 },
    widgets: [
      {
        type: 'kpi',
        x: 0, y: 0, w: 3, h: 2,
        config: {
          title: 'Completion Rate',
          metric: 'completion_rate',
          format: 'percentage'
        }
      },
      {
        type: 'kpi',
        x: 3, y: 0, w: 3, h: 2,
        config: {
          title: 'Avg. Time to Complete',
          metric: 'avg_completion_time',
          format: 'duration'
        }
      },
      {
        type: 'kpi',
        x: 6, y: 0, w: 3, h: 2,
        config: {
          title: 'Started',
          metric: 'started_count'
        }
      },
      {
        type: 'kpi',
        x: 9, y: 0, w: 3, h: 2,
        config: {
          title: 'Completed',
          metric: 'completed_count'
        }
      },
      {
        type: 'chart',
        x: 0, y: 2, w: 6, h: 3,
        config: {
          type: 'funnel',
          title: 'Response Funnel',
          xKey: 'stage',
          yKey: 'count'
        }
      },
      {
        type: 'chart',
        x: 6, y: 2, w: 6, h: 3,
        config: {
          type: 'bar',
          title: 'Responses by Source',
          xKey: 'source',
          yKey: 'count',
          yAggregation: 'count'
        }
      },
      {
        type: 'chart',
        x: 0, y: 5, w: 6, h: 3,
        config: {
          type: 'bar',
          title: 'Demographics',
          xKey: 'demographic',
          yKey: 'count',
          yAggregation: 'count'
        }
      },
      {
        type: 'pivot',
        x: 6, y: 5, w: 6, h: 3,
        config: {
          title: 'Cross-Tab Analysis',
          rowField: 'region',
          columnField: 'product',
          valueField: 'score',
          operation: 'avg'
        }
      }
    ]
  },

  // ========================================
  // DELIVERY PERFORMANCE TEMPLATES
  // ========================================
  {
    name: 'Multi-Channel Delivery Dashboard',
    description: 'Comprehensive delivery tracking across email, SMS, and WhatsApp with delivery rates and engagement metrics',
    category: 'delivery',
    is_public: true,
    layout: { cols: 12, rows: 8 },
    widgets: [
      {
        type: 'kpi',
        x: 0, y: 0, w: 3, h: 2,
        config: {
          title: 'Total Sent',
          metric: 'total_sent',
          icon: 'Send'
        }
      },
      {
        type: 'kpi',
        x: 3, y: 0, w: 3, h: 2,
        config: {
          title: 'Delivery Rate',
          metric: 'delivery_rate',
          format: 'percentage',
          showTrend: true
        }
      },
      {
        type: 'kpi',
        x: 6, y: 0, w: 3, h: 2,
        config: {
          title: 'Open Rate',
          metric: 'open_rate',
          format: 'percentage'
        }
      },
      {
        type: 'kpi',
        x: 9, y: 0, w: 3, h: 2,
        config: {
          title: 'Click Rate',
          metric: 'click_rate',
          format: 'percentage'
        }
      },
      {
        type: 'chart',
        x: 0, y: 2, w: 8, h: 3,
        config: {
          type: 'bar',
          title: 'Delivery Performance by Channel',
          xKey: 'channel',
          yKey: 'delivery_rate',
          legendKey: 'status',
          yAggregation: 'avg'
        }
      },
      {
        type: 'chart',
        x: 8, y: 2, w: 4, h: 3,
        config: {
          type: 'pie',
          title: 'Channel Distribution',
          xKey: 'channel',
          yKey: 'count',
          yAggregation: 'count'
        }
      },
      {
        type: 'chart',
        x: 0, y: 5, w: 12, h: 3,
        config: {
          type: 'line',
          title: 'Delivery Trend Over Time',
          xKey: 'date',
          yKey: 'delivery_rate',
          legendKey: 'channel',
          yAggregation: 'avg'
        }
      }
    ]
  },

  {
    name: 'Email Campaign Performance',
    description: 'Email-specific metrics with bounce analysis, engagement tracking, and subscriber growth',
    category: 'delivery',
    is_public: true,
    layout: { cols: 12, rows: 8 },
    widgets: [
      {
        type: 'kpi',
        x: 0, y: 0, w: 3, h: 2,
        config: {
          title: 'Emails Sent',
          metric: 'email_sent'
        }
      },
      {
        type: 'kpi',
        x: 3, y: 0, w: 3, h: 2,
        config: {
          title: 'Open Rate',
          metric: 'email_open_rate',
          format: 'percentage'
        }
      },
      {
        type: 'kpi',
        x: 6, y: 0, w: 3, h: 2,
        config: {
          title: 'Click-Through Rate',
          metric: 'email_ctr',
          format: 'percentage'
        }
      },
      {
        type: 'kpi',
        x: 9, y: 0, w: 3, h: 2,
        config: {
          title: 'Bounce Rate',
          metric: 'email_bounce_rate',
          format: 'percentage',
          color: '#ef4444'
        }
      },
      {
        type: 'chart',
        x: 0, y: 2, w: 6, h: 3,
        config: {
          type: 'area',
          title: 'Engagement Over Time',
          xKey: 'date',
          yKey: 'engagement_rate',
          yAggregation: 'avg'
        }
      },
      {
        type: 'chart',
        x: 6, y: 2, w: 6, h: 3,
        config: {
          type: 'bar',
          title: 'Status Breakdown',
          xKey: 'status',
          yKey: 'count',
          yAggregation: 'count'
        }
      },
      {
        type: 'anomaly',
        x: 0, y: 5, w: 6, h: 3,
        config: {
          title: 'Anomaly Detection',
          targetMetric: 'email_open_rate'
        }
      },
      {
        type: 'table',
        x: 6, y: 5, w: 6, h: 3,
        config: {
          title: 'Top Performing Campaigns',
          limit: 10,
          sortBy: 'engagement_rate',
          sortOrder: 'desc'
        }
      }
    ]
  },

  // ========================================
  // SENTIMENT ANALYSIS TEMPLATES
  // ========================================
  {
    name: 'Sentiment Analysis Dashboard',
    description: 'Overall sentiment tracking with positive/negative/neutral breakdown and trending topics',
    category: 'sentiment',
    is_public: true,
    layout: { cols: 12, rows: 8 },
    widgets: [
      {
        type: 'kpi',
        x: 0, y: 0, w: 3, h: 2,
        config: {
          title: 'Avg Sentiment Score',
          metric: 'sentiment_score',
          showTrend: true
        }
      },
      {
        type: 'kpi',
        x: 3, y: 0, w: 3, h: 2,
        config: {
          title: 'Positive %',
          metric: 'positive_percent',
          format: 'percentage',
          color: '#10b981'
        }
      },
      {
        type: 'kpi',
        x: 6, y: 0, w: 3, h: 2,
        config: {
          title: 'Negative %',
          metric: 'negative_percent',
          format: 'percentage',
          color: '#ef4444'
        }
      },
      {
        type: 'kpi',
        x: 9, y: 0, w: 3, h: 2,
        config: {
          title: 'Neutral %',
          metric: 'neutral_percent',
          format: 'percentage',
          color: '#94a3b8'
        }
      },
      {
        type: 'chart',
        x: 0, y: 2, w: 8, h: 3,
        config: {
          type: 'area',
          title: 'Sentiment Trend',
          xKey: 'date',
          yKey: 'sentiment_score',
          legendKey: 'sentiment_category',
          yAggregation: 'avg'
        }
      },
      {
        type: 'chart',
        x: 8, y: 2, w: 4, h: 3,
        config: {
          type: 'pie',
          title: 'Sentiment Distribution',
          xKey: 'sentiment',
          yKey: 'count',
          yAggregation: 'count'
        }
      },
      {
        type: 'wordcloud',
        x: 0, y: 5, w: 6, h: 3,
        config: {
          title: 'Most Common Words',
          field: 'text',
          maxWords: 100,
          colorBySentiment: true
        }
      },
      {
        type: 'chart',
        x: 6, y: 5, w: 6, h: 3,
        config: {
          type: 'bar',
          title: 'Sentiment by Category',
          xKey: 'category',
          yKey: 'sentiment_score',
          yAggregation: 'avg'
        }
      }
    ]
  },

  // ========================================
  // MIXED/EXECUTIVE TEMPLATES
  // ========================================
  {
    name: 'Executive Summary',
    description: 'High-level KPIs and trends for executive reporting with multi-metric overview',
    category: 'mixed',
    is_public: true,
    layout: { cols: 12, rows: 8 },
    widgets: [
      {
        type: 'kpi',
        x: 0, y: 0, w: 2, h: 2,
        config: {
          title: 'NPS',
          metric: 'nps',
          showTrend: true
        }
      },
      {
        type: 'kpi',
        x: 2, y: 0, w: 2, h: 2,
        config: {
          title: 'CSAT',
          metric: 'csat',
          showTrend: true
        }
      },
      {
        type: 'kpi',
        x: 4, y: 0, w: 2, h: 2,
        config: {
          title: 'Responses',
          metric: 'total_responses'
        }
      },
      {
        type: 'kpi',
        x: 6, y: 0, w: 2, h: 2,
        config: {
          title: 'Delivery Rate',
          metric: 'delivery_rate',
          format: 'percentage'
        }
      },
      {
        type: 'kpi',
        x: 8, y: 0, w: 2, h: 2,
        config: {
          title: 'Sentiment',
          metric: 'sentiment_score'
        }
      },
      {
        type: 'kpi',
        x: 10, y: 0, w: 2, h: 2,
        config: {
          title: 'Engagement',
          metric: 'engagement_rate',
          format: 'percentage'
        }
      },
      {
        type: 'chart',
        x: 0, y: 2, w: 6, h: 3,
        config: {
          type: 'line',
          title: 'Key Metrics Trend',
          xKey: 'date',
          yKey: 'value',
          legendKey: 'metric',
          yAggregation: 'avg'
        }
      },
      {
        type: 'chart',
        x: 6, y: 2, w: 6, h: 3,
        config: {
          type: 'bar',
          title: 'Performance by Region',
          xKey: 'region',
          yKey: 'score',
          yAggregation: 'avg'
        }
      },
      {
        type: 'cohort',
        x: 0, y: 5, w: 6, h: 3,
        config: {
          title: 'Cohort Analysis',
          metric: 'nps',
          cohortBy: 'month'
        }
      },
      {
        type: 'forecast',
        x: 6, y: 5, w: 6, h: 3,
        config: {
          title: '7-Day Forecast',
          metric: 'nps',
          periods: 7,
          interval: 'day'
        }
      }
    ]
  },

  {
    name: 'Advanced Analytics Report',
    description: 'Statistical analysis with cohort tracking, forecasting, and anomaly detection',
    category: 'mixed',
    is_public: true,
    layout: { cols: 12, rows: 10 },
    widgets: [
      {
        type: 'kpi',
        x: 0, y: 0, w: 4, h: 2,
        config: {
          title: 'Overall Score',
          metric: 'overall_score',
          showTrend: true
        }
      },
      {
        type: 'kpi',
        x: 4, y: 0, w: 4, h: 2,
        config: {
          title: 'Sample Size',
          metric: 'sample_size'
        }
      },
      {
        type: 'kpi',
        x: 8, y: 0, w: 4, h: 2,
        config: {
          title: 'Confidence Level',
          metric: 'confidence_level',
          format: 'percentage'
        }
      },
      {
        type: 'cohort',
        x: 0, y: 2, w: 6, h: 3,
        config: {
          title: 'Monthly Cohort Analysis',
          metric: 'nps',
          cohortBy: 'month'
        }
      },
      {
        type: 'forecast',
        x: 6, y: 2, w: 6, h: 3,
        config: {
          title: '14-Day Forecast',
          metric: 'nps',
          periods: 14,
          interval: 'day'
        }
      },
      {
        type: 'anomaly',
        x: 0, y: 5, w: 6, h: 3,
        config: {
          title: 'Anomaly Detection',
          targetMetric: 'nps'
        }
      },
      {
        type: 'statsig',
        x: 6, y: 5, w: 6, h: 3,
        config: {
          title: 'Statistical Significance',
          group1Field: 'control_group',
          group2Field: 'test_group',
          metric: 'score'
        }
      },
      {
        type: 'keydriver',
        x: 0, y: 8, w: 6, h: 2,
        config: {
          title: 'Key Drivers',
          targetMetric: 'nps'
        }
      },
      {
        type: 'pivot',
        x: 6, y: 8, w: 6, h: 2,
        config: {
          title: 'Pivot Analysis',
          rowField: 'region',
          columnField: 'product',
          valueField: 'score',
          operation: 'avg'
        }
      }
    ]
  }
];

async function seedTemplates() {
  try {
    logger.info('Starting report template seeding...');

    // Check if templates already exist
    const existingCount = await query('SELECT COUNT(*) FROM report_templates');
    const count = parseInt(existingCount.rows[0].count);

    if (count > 0) {
      logger.info(`Found ${count} existing templates. Skipping seed.`);
      logger.info('To re-seed, run: DELETE FROM report_templates WHERE is_public = true;');
      return;
    }

    // Insert templates
    let inserted = 0;
    for (const template of templates) {
      try {
        await query(
          `INSERT INTO report_templates (name, description, category, is_public, layout, widgets, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            template.name,
            template.description,
            template.category,
            template.is_public,
            JSON.stringify(template.layout),
            JSON.stringify(template.widgets)
          ]
        );
        inserted++;
        logger.info(`✓ Created template: ${template.name}`);
      } catch (err) {
        logger.error(`✗ Failed to create template: ${template.name}`, { error: err.message });
      }
    }

    logger.info(`✓ Successfully seeded ${inserted}/${templates.length} report templates`);

    // Show template summary
    const summary = await query(`
      SELECT category, COUNT(*) as count
      FROM report_templates
      WHERE is_public = true
      GROUP BY category
      ORDER BY category
    `);

    logger.info('Template Summary:');
    summary.rows.forEach(row => {
      logger.info(`  ${row.category}: ${row.count} templates`);
    });

  } catch (error) {
    logger.error('Error seeding templates', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      logger.info('Template seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Template seeding failed', { error: error.message });
      process.exit(1);
    });
}

module.exports = { seedTemplates, templates };
