/**
 * CohortAnalysisService - Cohort-based analytics
 *
 * Features:
 * - Time-based cohort analysis
 * - Retention analysis
 * - Cohort comparison
 * - Trend analysis by cohort
 * - Customizable cohort definitions
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class CohortAnalysisService {
  /**
   * Analyze cohorts by time period
   *
   * @param {string} surveyId - Survey ID
   * @param {number} tenantId - Tenant ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Array>} Cohort analysis results
   */
  async analyzeCohorts(surveyId, tenantId, options = {}) {
    try {
      const {
        cohortBy = 'month', // 'day', 'week', 'month', 'quarter'
        metric = 'nps',
        startDate = null,
        endDate = null
      } = options;

      logger.info('Starting cohort analysis', {
        surveyId,
        tenantId,
        cohortBy,
        metric
      });

      // Build SQL for cohort grouping
      const dateFormat = this.getDateFormat(cohortBy);

      let sql = `
        WITH cohorts AS (
          SELECT
            TO_CHAR(s.created_at, '${dateFormat}') as cohort,
            s.created_at as submission_date,
            s.response_data,
            s.id
          FROM submissions s
          WHERE s.tenant_id = $1 AND s.form_id = $2
      `;

      const params = [tenantId, surveyId];
      let paramIndex = 3;

      // Add date filters
      if (startDate) {
        sql += ` AND s.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        sql += ` AND s.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      sql += `
        )
        SELECT
          cohort,
          COUNT(*) as total_responses,
          ${this.getMetricSQL(metric)} as metric_value,
          MIN(submission_date) as cohort_start,
          MAX(submission_date) as cohort_end
        FROM cohorts
        GROUP BY cohort
        ORDER BY cohort
      `;

      const result = await query(sql, params);

      // Calculate trends and insights
      const cohorts = result.rows.map(row => ({
        cohort: row.cohort,
        totalResponses: parseInt(row.total_responses),
        metricValue: parseFloat(row.metric_value || 0),
        cohortStart: row.cohort_start,
        cohortEnd: row.cohort_end
      }));

      // Add trend calculations
      for (let i = 0; i < cohorts.length; i++) {
        if (i > 0) {
          const current = cohorts[i].metricValue;
          const previous = cohorts[i - 1].metricValue;
          const change = current - previous;
          const percentChange = previous !== 0 ? (change / previous) * 100 : 0;

          cohorts[i].trend = {
            change,
            percentChange: parseFloat(percentChange.toFixed(2)),
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
          };
        }
      }

      logger.info('Cohort analysis completed', {
        surveyId,
        cohortCount: cohorts.length
      });

      return cohorts;
    } catch (error) {
      logger.error('Cohort analysis failed', {
        error: error.message,
        stack: error.stack,
        surveyId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Calculate retention rates by cohort
   *
   * @param {string} surveyId - Survey ID
   * @param {number} tenantId - Tenant ID
   * @param {Object} options - Retention options
   * @returns {Promise<Array>} Retention analysis
   */
  async analyzeRetention(surveyId, tenantId, options = {}) {
    try {
      const {
        cohortBy = 'month',
        periodCount = 6
      } = options;

      logger.info('Starting retention analysis', {
        surveyId,
        tenantId,
        cohortBy,
        periodCount
      });

      const dateFormat = this.getDateFormat(cohortBy);

      // Get respondent retention across periods
      const sql = `
        WITH first_response AS (
          SELECT
            respondent_email,
            TO_CHAR(MIN(created_at), '${dateFormat}') as first_cohort,
            MIN(created_at) as first_date
          FROM submissions
          WHERE tenant_id = $1 AND form_id = $2
            AND respondent_email IS NOT NULL
          GROUP BY respondent_email
        ),
        subsequent_responses AS (
          SELECT
            s.respondent_email,
            TO_CHAR(s.created_at, '${dateFormat}') as response_cohort,
            f.first_cohort
          FROM submissions s
          INNER JOIN first_response f ON s.respondent_email = f.respondent_email
          WHERE s.tenant_id = $1 AND s.form_id = $2
        )
        SELECT
          first_cohort,
          response_cohort,
          COUNT(DISTINCT respondent_email) as retained_count
        FROM subsequent_responses
        GROUP BY first_cohort, response_cohort
        ORDER BY first_cohort, response_cohort
      `;

      const result = await query(sql, [tenantId, surveyId]);

      // Process retention data
      const retentionMap = {};

      result.rows.forEach(row => {
        if (!retentionMap[row.first_cohort]) {
          retentionMap[row.first_cohort] = {
            cohort: row.first_cohort,
            periods: {}
          };
        }

        retentionMap[row.first_cohort].periods[row.response_cohort] = parseInt(row.retained_count);
      });

      // Calculate retention rates
      const retention = Object.values(retentionMap).map(cohortData => {
        const cohortTotal = cohortData.periods[cohortData.cohort] || 0;
        const retentionRates = {};

        Object.keys(cohortData.periods).forEach(period => {
          const count = cohortData.periods[period];
          retentionRates[period] = cohortTotal > 0
            ? parseFloat(((count / cohortTotal) * 100).toFixed(2))
            : 0;
        });

        return {
          cohort: cohortData.cohort,
          totalRespondents: cohortTotal,
          retentionRates
        };
      });

      logger.info('Retention analysis completed', {
        surveyId,
        cohortCount: retention.length
      });

      return retention;
    } catch (error) {
      logger.error('Retention analysis failed', {
        error: error.message,
        stack: error.stack,
        surveyId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Compare multiple cohorts
   *
   * @param {string} surveyId - Survey ID
   * @param {number} tenantId - Tenant ID
   * @param {Array} cohorts - Array of cohort identifiers
   * @param {Object} options - Comparison options
   * @returns {Promise<Object>} Comparison results
   */
  async compareCohorts(surveyId, tenantId, cohorts, options = {}) {
    try {
      const { metric = 'nps' } = options;

      logger.info('Starting cohort comparison', {
        surveyId,
        cohortCount: cohorts.length
      });

      const results = {};

      for (const cohort of cohorts) {
        const cohortData = await this.analyzeCohorts(surveyId, tenantId, {
          ...options,
          startDate: cohort.startDate,
          endDate: cohort.endDate
        });

        results[cohort.name || cohort.startDate] = {
          totalResponses: cohortData.reduce((sum, c) => sum + c.totalResponses, 0),
          avgMetric: cohortData.reduce((sum, c) => sum + c.metricValue, 0) / cohortData.length,
          data: cohortData
        };
      }

      logger.info('Cohort comparison completed', {
        surveyId,
        cohortCount: Object.keys(results).length
      });

      return results;
    } catch (error) {
      logger.error('Cohort comparison failed', {
        error: error.message,
        surveyId
      });
      throw error;
    }
  }

  /**
   * Get date format string for PostgreSQL TO_CHAR
   */
  getDateFormat(cohortBy) {
    switch (cohortBy) {
      case 'day':
        return 'YYYY-MM-DD';
      case 'week':
        return 'IYYY-IW'; // ISO week
      case 'month':
        return 'YYYY-MM';
      case 'quarter':
        return 'YYYY-Q';
      case 'year':
        return 'YYYY';
      default:
        return 'YYYY-MM';
    }
  }

  /**
   * Get SQL for calculating specific metrics
   */
  getMetricSQL(metric) {
    switch (metric) {
      case 'nps':
        return `
          CASE
            WHEN COUNT(*) > 0 THEN
              (
                SUM(CASE WHEN CAST(response_data->>'nps_score' AS INTEGER) >= 9 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) -
                SUM(CASE WHEN CAST(response_data->>'nps_score' AS INTEGER) <= 6 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
              )
            ELSE 0
          END
        `;

      case 'csat':
        return `AVG(CAST(response_data->>'satisfaction_score' AS NUMERIC))`;

      case 'avg_score':
        return `AVG(CAST(response_data->>'score' AS NUMERIC))`;

      case 'completion_rate':
        return `
          CASE
            WHEN COUNT(*) > 0 THEN
              SUM(CASE WHEN response_data->>'completed' = 'true' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
            ELSE 0
          END
        `;

      default:
        return 'COUNT(*)';
    }
  }
}

module.exports = new CohortAnalysisService();
