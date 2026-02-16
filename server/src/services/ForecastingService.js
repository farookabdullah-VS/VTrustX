/**
 * ForecastingService - Predictive analytics and trend forecasting
 *
 * Features:
 * - Linear regression forecasting
 * - Moving average predictions
 * - Trend analysis
 * - Seasonal decomposition
 * - Confidence intervals
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class ForecastingService {
  /**
   * Forecast future values using linear regression
   *
   * @param {string} surveyId - Survey ID
   * @param {number} tenantId - Tenant ID
   * @param {string} metric - Metric to forecast (nps, csat, response_count)
   * @param {Object} options - Forecasting options
   * @returns {Promise<Object>} Forecast results
   */
  async forecastTrend(surveyId, tenantId, metric, options = {}) {
    try {
      const {
        periods = 7,
        interval = 'day', // 'day', 'week', 'month'
        startDate = null,
        endDate = null
      } = options;

      logger.info('Starting trend forecast', {
        surveyId,
        tenantId,
        metric,
        periods
      });

      // Get historical data
      const historicalData = await this.getHistoricalData(
        surveyId,
        tenantId,
        metric,
        interval,
        startDate,
        endDate
      );

      if (historicalData.length < 2) {
        throw new Error('Insufficient data for forecasting (minimum 2 data points required)');
      }

      // Calculate linear regression
      const regression = this.calculateLinearRegression(historicalData);

      // Generate forecast
      const forecast = [];
      const lastPeriod = historicalData.length - 1;

      for (let i = 1; i <= periods; i++) {
        const x = lastPeriod + i;
        const predicted = regression.slope * x + regression.intercept;

        // Calculate confidence interval (simple approximation)
        const residuals = historicalData.map((point, idx) => {
          const predicted = regression.slope * idx + regression.intercept;
          return point.value - predicted;
        });

        const stdDev = this.calculateStandardDeviation(residuals);
        const margin = 1.96 * stdDev; // 95% confidence interval

        forecast.push({
          period: x,
          periodLabel: this.generatePeriodLabel(interval, i),
          predicted: parseFloat(predicted.toFixed(2)),
          lowerBound: parseFloat((predicted - margin).toFixed(2)),
          upperBound: parseFloat((predicted + margin).toFixed(2)),
          confidence: 95
        });
      }

      // Calculate forecast accuracy metrics
      const metrics = this.calculateForecastMetrics(historicalData, regression);

      logger.info('Trend forecast completed', {
        surveyId,
        historicalPoints: historicalData.length,
        forecastPeriods: forecast.length,
        r2: metrics.r2
      });

      return {
        historical: historicalData,
        forecast,
        regression: {
          slope: regression.slope,
          intercept: regression.intercept,
          r2: metrics.r2,
          mse: metrics.mse
        },
        trend: this.analyzeTrend(regression.slope)
      };
    } catch (error) {
      logger.error('Trend forecast failed', {
        error: error.message,
        stack: error.stack,
        surveyId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Forecast using moving average
   *
   * @param {string} surveyId - Survey ID
   * @param {number} tenantId - Tenant ID
   * @param {string} metric - Metric to forecast
   * @param {Object} options - Forecasting options
   * @returns {Promise<Object>} Moving average forecast
   */
  async forecastMovingAverage(surveyId, tenantId, metric, options = {}) {
    try {
      const {
        periods = 7,
        window = 7,
        interval = 'day'
      } = options;

      logger.info('Starting moving average forecast', {
        surveyId,
        metric,
        window,
        periods
      });

      // Get historical data
      const historicalData = await this.getHistoricalData(
        surveyId,
        tenantId,
        metric,
        interval
      );

      if (historicalData.length < window) {
        throw new Error(`Insufficient data for moving average (minimum ${window} data points required)`);
      }

      // Calculate moving averages for historical data
      const movingAverages = [];
      for (let i = window - 1; i < historicalData.length; i++) {
        const windowData = historicalData.slice(i - window + 1, i + 1);
        const average = windowData.reduce((sum, point) => sum + point.value, 0) / window;

        movingAverages.push({
          period: i,
          value: parseFloat(average.toFixed(2)),
          date: historicalData[i].date
        });
      }

      // Forecast future periods using last moving average
      const lastMA = movingAverages[movingAverages.length - 1].value;
      const forecast = [];

      for (let i = 1; i <= periods; i++) {
        forecast.push({
          period: historicalData.length + i - 1,
          periodLabel: this.generatePeriodLabel(interval, i),
          predicted: lastMA
        });
      }

      logger.info('Moving average forecast completed', {
        surveyId,
        forecastPeriods: forecast.length
      });

      return {
        historical: historicalData,
        movingAverages,
        forecast,
        window
      };
    } catch (error) {
      logger.error('Moving average forecast failed', {
        error: error.message,
        surveyId
      });
      throw error;
    }
  }

  /**
   * Detect seasonality in data
   *
   * @param {string} surveyId - Survey ID
   * @param {number} tenantId - Tenant ID
   * @param {string} metric - Metric to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Seasonality analysis
   */
  async detectSeasonality(surveyId, tenantId, metric, options = {}) {
    try {
      const { interval = 'month' } = options;

      logger.info('Starting seasonality detection', { surveyId, metric });

      // Get historical data
      const historicalData = await this.getHistoricalData(
        surveyId,
        tenantId,
        metric,
        interval
      );

      if (historicalData.length < 12) {
        return {
          hasSeasonality: false,
          message: 'Insufficient data for seasonality detection (minimum 12 periods required)'
        };
      }

      // Calculate seasonal indices
      const periodCount = interval === 'month' ? 12 : interval === 'quarter' ? 4 : 7;
      const seasonalIndices = {};

      for (let period = 0; period < periodCount; period++) {
        const periodValues = historicalData
          .filter((_, idx) => idx % periodCount === period)
          .map(point => point.value);

        if (periodValues.length > 0) {
          const average = periodValues.reduce((sum, val) => sum + val, 0) / periodValues.length;
          seasonalIndices[period] = parseFloat(average.toFixed(2));
        }
      }

      // Calculate overall average
      const overallAvg = Object.values(seasonalIndices).reduce((sum, val) => sum + val, 0) /
        Object.values(seasonalIndices).length;

      // Normalize seasonal indices
      const normalizedIndices = {};
      Object.keys(seasonalIndices).forEach(period => {
        normalizedIndices[period] = parseFloat((seasonalIndices[period] / overallAvg).toFixed(3));
      });

      // Detect if seasonality exists (coefficient of variation > 0.1)
      const values = Object.values(normalizedIndices);
      const stdDev = this.calculateStandardDeviation(values.map(v => v - 1));
      const hasSeasonality = stdDev > 0.1;

      logger.info('Seasonality detection completed', {
        surveyId,
        hasSeasonality,
        stdDev
      });

      return {
        hasSeasonality,
        seasonalIndices: normalizedIndices,
        strength: parseFloat(stdDev.toFixed(3)),
        periodCount
      };
    } catch (error) {
      logger.error('Seasonality detection failed', {
        error: error.message,
        surveyId
      });
      throw error;
    }
  }

  /**
   * Get historical data for forecasting
   */
  async getHistoricalData(surveyId, tenantId, metric, interval = 'day', startDate = null, endDate = null) {
    const dateFormat = this.getDateFormat(interval);

    let sql = `
      SELECT
        TO_CHAR(s.created_at, '${dateFormat}') as period,
        DATE_TRUNC('${interval}', s.created_at) as date,
        ${this.getMetricSQL(metric)} as value
      FROM submissions s
      WHERE s.tenant_id = $1 AND s.form_id = $2
    `;

    const params = [tenantId, surveyId];
    let paramIndex = 3;

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
      GROUP BY period, date
      ORDER BY date
    `;

    const result = await query(sql, params);

    return result.rows.map((row, index) => ({
      period: index,
      periodLabel: row.period,
      date: row.date,
      value: parseFloat(row.value || 0)
    }));
  }

  /**
   * Calculate linear regression
   */
  calculateLinearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach((point, index) => {
      const x = index;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Calculate forecast accuracy metrics
   */
  calculateForecastMetrics(data, regression) {
    let sumSquaredErrors = 0;
    let sumSquaredTotal = 0;
    const mean = data.reduce((sum, point) => sum + point.value, 0) / data.length;

    data.forEach((point, index) => {
      const predicted = regression.slope * index + regression.intercept;
      const error = point.value - predicted;
      sumSquaredErrors += error * error;
      sumSquaredTotal += (point.value - mean) * (point.value - mean);
    });

    const mse = sumSquaredErrors / data.length;
    const r2 = 1 - (sumSquaredErrors / sumSquaredTotal);

    return {
      mse: parseFloat(mse.toFixed(4)),
      r2: parseFloat(r2.toFixed(4)),
      rmse: parseFloat(Math.sqrt(mse).toFixed(4))
    };
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Analyze trend direction
   */
  analyzeTrend(slope) {
    if (Math.abs(slope) < 0.01) {
      return { direction: 'flat', description: 'No significant trend', strength: 'neutral' };
    } else if (slope > 0) {
      const strength = slope > 0.5 ? 'strong' : slope > 0.1 ? 'moderate' : 'weak';
      return { direction: 'increasing', description: 'Positive trend', strength };
    } else {
      const strength = slope < -0.5 ? 'strong' : slope < -0.1 ? 'moderate' : 'weak';
      return { direction: 'decreasing', description: 'Negative trend', strength };
    }
  }

  /**
   * Generate period label for forecast
   */
  generatePeriodLabel(interval, offset) {
    const date = new Date();

    switch (interval) {
      case 'day':
        date.setDate(date.getDate() + offset);
        return date.toISOString().split('T')[0];

      case 'week':
        date.setDate(date.getDate() + (offset * 7));
        return `Week ${date.toISOString().split('T')[0]}`;

      case 'month':
        date.setMonth(date.getMonth() + offset);
        return date.toISOString().slice(0, 7);

      default:
        return `Period +${offset}`;
    }
  }

  /**
   * Get date format for PostgreSQL
   */
  getDateFormat(interval) {
    switch (interval) {
      case 'day':
        return 'YYYY-MM-DD';
      case 'week':
        return 'IYYY-IW';
      case 'month':
        return 'YYYY-MM';
      case 'quarter':
        return 'YYYY-Q';
      case 'year':
        return 'YYYY';
      default:
        return 'YYYY-MM-DD';
    }
  }

  /**
   * Get SQL for metric calculation
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

      case 'response_count':
        return 'COUNT(*)';

      case 'avg_score':
        return `AVG(CAST(response_data->>'score' AS NUMERIC))`;

      default:
        return 'COUNT(*)';
    }
  }
}

module.exports = new ForecastingService();
