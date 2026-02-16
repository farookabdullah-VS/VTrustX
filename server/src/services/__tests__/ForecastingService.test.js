/**
 * Integration tests for ForecastingService
 */

const ForecastingService = require('../ForecastingService');
const { query } = require('../../infrastructure/database/db');

describe('ForecastingService', () => {
  let testTenantId;
  let testSurveyId;

  beforeAll(async () => {
    // Create test tenant
    const tenantResult = await query(
      'INSERT INTO tenants (name, domain) VALUES ($1, $2) RETURNING id',
      ['Forecast Test Tenant', 'forecast-test.example.com']
    );
    testTenantId = tenantResult.rows[0].id;

    // Create test survey
    const surveyResult = await query(
      `INSERT INTO forms (tenant_id, title, definition, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTenantId, 'Forecast Test Survey', '{"pages":[]}', 1]
    );
    testSurveyId = surveyResult.rows[0].id;

    // Create test submissions with trend data
    const submissions = [
      { date: '2026-02-01', nps_score: 40 },
      { date: '2026-02-02', nps_score: 42 },
      { date: '2026-02-03', nps_score: 45 },
      { date: '2026-02-04', nps_score: 47 },
      { date: '2026-02-05', nps_score: 50 },
      { date: '2026-02-06', nps_score: 52 },
      { date: '2026-02-07', nps_score: 55 },
      { date: '2026-02-08', nps_score: 57 },
      { date: '2026-02-09', nps_score: 60 },
      { date: '2026-02-10', nps_score: 62 }
    ];

    for (const submission of submissions) {
      // Create multiple submissions per day to get proper NPS calculation
      const promoterCount = Math.floor(submission.nps_score / 10);
      const detractorCount = 10 - promoterCount;

      for (let i = 0; i < promoterCount; i++) {
        await query(
          `INSERT INTO submissions (tenant_id, form_id, response_data, created_at)
           VALUES ($1, $2, $3, $4)`,
          [
            testTenantId,
            testSurveyId,
            JSON.stringify({ nps_score: 9 }), // Promoter
            submission.date
          ]
        );
      }

      for (let i = 0; i < detractorCount; i++) {
        await query(
          `INSERT INTO submissions (tenant_id, form_id, response_data, created_at)
           VALUES ($1, $2, $3, $4)`,
          [
            testTenantId,
            testSurveyId,
            JSON.stringify({ nps_score: 8 }), // Passive
            submission.date
          ]
        );
      }
    }
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM submissions WHERE tenant_id = $1', [testTenantId]);
    await query('DELETE FROM forms WHERE id = $1', [testSurveyId]);
    await query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
  });

  describe('forecastTrend', () => {
    test('generates forecast with linear regression', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 7, interval: 'day' }
      );

      expect(result).toHaveProperty('historical');
      expect(result).toHaveProperty('forecast');
      expect(result).toHaveProperty('regression');
      expect(result).toHaveProperty('trend');

      expect(Array.isArray(result.historical)).toBe(true);
      expect(Array.isArray(result.forecast)).toBe(true);
      expect(result.forecast.length).toBe(7);
    });

    test('calculates regression coefficients', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 5, interval: 'day' }
      );

      expect(result.regression).toHaveProperty('slope');
      expect(result.regression).toHaveProperty('intercept');
      expect(result.regression).toHaveProperty('r2');
      expect(result.regression).toHaveProperty('mse');

      expect(typeof result.regression.slope).toBe('number');
      expect(typeof result.regression.intercept).toBe('number');
      expect(result.regression.r2).toBeGreaterThanOrEqual(0);
      expect(result.regression.r2).toBeLessThanOrEqual(1);
    });

    test('includes confidence intervals', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 5, interval: 'day' }
      );

      result.forecast.forEach(point => {
        expect(point).toHaveProperty('predicted');
        expect(point).toHaveProperty('lowerBound');
        expect(point).toHaveProperty('upperBound');
        expect(point).toHaveProperty('confidence');

        expect(point.confidence).toBe(95);
        expect(point.lowerBound).toBeLessThan(point.predicted);
        expect(point.upperBound).toBeGreaterThan(point.predicted);
      });
    });

    test('generates period labels', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 3, interval: 'day' }
      );

      result.forecast.forEach(point => {
        expect(point).toHaveProperty('periodLabel');
        expect(typeof point.periodLabel).toBe('string');
        expect(point.periodLabel).toMatch(/\d{4}-\d{2}-\d{2}/);
      });
    });

    test('determines trend direction', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 5, interval: 'day' }
      );

      expect(result.trend).toHaveProperty('direction');
      expect(result.trend).toHaveProperty('description');
      expect(result.trend).toHaveProperty('strength');

      expect(['increasing', 'decreasing', 'flat']).toContain(result.trend.direction);
      expect(['strong', 'moderate', 'weak', 'neutral']).toContain(result.trend.strength);
    });

    test('handles different intervals', async () => {
      const intervals = ['day', 'week', 'month'];

      for (const interval of intervals) {
        const result = await ForecastingService.forecastTrend(
          testSurveyId,
          testTenantId,
          'nps',
          { periods: 3, interval }
        );

        expect(result.forecast.length).toBe(3);
        expect(result.historical.length).toBeGreaterThan(0);
      }
    });

    test('filters by date range', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        {
          periods: 3,
          interval: 'day',
          startDate: '2026-02-05',
          endDate: '2026-02-10'
        }
      );

      // Historical data should only include specified range
      result.historical.forEach(point => {
        const date = new Date(point.date);
        expect(date.getTime()).toBeGreaterThanOrEqual(new Date('2026-02-05').getTime());
        expect(date.getTime()).toBeLessThanOrEqual(new Date('2026-02-10').getTime());
      });
    });

    test('throws error with insufficient data', async () => {
      // Create a survey with only one data point
      const minimalSurveyResult = await query(
        `INSERT INTO forms (tenant_id, title, definition, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [testTenantId, 'Minimal Survey', '{"pages":[]}', 1]
      );
      const minimalSurveyId = minimalSurveyResult.rows[0].id;

      await query(
        `INSERT INTO submissions (tenant_id, form_id, response_data, created_at)
         VALUES ($1, $2, $3, $4)`,
        [testTenantId, minimalSurveyId, JSON.stringify({ nps_score: 9 }), '2026-02-01']
      );

      await expect(
        ForecastingService.forecastTrend(
          minimalSurveyId,
          testTenantId,
          'nps',
          { periods: 3, interval: 'day' }
        )
      ).rejects.toThrow('Insufficient data for forecasting');

      // Cleanup
      await query('DELETE FROM submissions WHERE form_id = $1', [minimalSurveyId]);
      await query('DELETE FROM forms WHERE id = $1', [minimalSurveyId]);
    });

    test('supports different metrics', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'response_count',
        { periods: 3, interval: 'day' }
      );

      expect(result.forecast.length).toBe(3);
      expect(result.historical.length).toBeGreaterThan(0);
    });
  });

  describe('forecastMovingAverage', () => {
    test('calculates moving average forecast', async () => {
      const result = await ForecastingService.forecastMovingAverage(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 5, window: 3, interval: 'day' }
      );

      expect(result).toHaveProperty('historical');
      expect(result).toHaveProperty('movingAverages');
      expect(result).toHaveProperty('forecast');
      expect(result).toHaveProperty('window');

      expect(result.window).toBe(3);
      expect(Array.isArray(result.movingAverages)).toBe(true);
      expect(result.forecast.length).toBe(5);
    });

    test('moving averages smooth the data', async () => {
      const result = await ForecastingService.forecastMovingAverage(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 3, window: 3, interval: 'day' }
      );

      // Moving averages should have fewer data points than historical
      expect(result.movingAverages.length).toBeLessThan(result.historical.length);
    });

    test('uses last moving average for forecast', async () => {
      const result = await ForecastingService.forecastMovingAverage(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 3, window: 3, interval: 'day' }
      );

      if (result.movingAverages.length > 0) {
        const lastMA = result.movingAverages[result.movingAverages.length - 1].value;

        result.forecast.forEach(point => {
          expect(point.predicted).toBe(lastMA);
        });
      }
    });

    test('throws error with insufficient data for window', async () => {
      // Create survey with minimal data
      const minimalSurveyResult = await query(
        `INSERT INTO forms (tenant_id, title, definition, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [testTenantId, 'Minimal MA Survey', '{"pages":[]}', 1]
      );
      const minimalSurveyId = minimalSurveyResult.rows[0].id;

      // Add only 2 data points
      for (let i = 0; i < 2; i++) {
        await query(
          `INSERT INTO submissions (tenant_id, form_id, response_data, created_at)
           VALUES ($1, $2, $3, $4)`,
          [testTenantId, minimalSurveyId, JSON.stringify({ nps_score: 9 }), `2026-02-0${i + 1}`]
        );
      }

      await expect(
        ForecastingService.forecastMovingAverage(
          minimalSurveyId,
          testTenantId,
          'nps',
          { periods: 3, window: 5, interval: 'day' }
        )
      ).rejects.toThrow();

      // Cleanup
      await query('DELETE FROM submissions WHERE form_id = $1', [minimalSurveyId]);
      await query('DELETE FROM forms WHERE id = $1', [minimalSurveyId]);
    });

    test('handles different window sizes', async () => {
      const windows = [3, 5, 7];

      for (const window of windows) {
        const result = await ForecastingService.forecastMovingAverage(
          testSurveyId,
          testTenantId,
          'nps',
          { periods: 3, window, interval: 'day' }
        );

        expect(result.window).toBe(window);
        expect(result.forecast.length).toBe(3);
      }
    });
  });

  describe('detectSeasonality', () => {
    test('detects seasonality in data', async () => {
      const result = await ForecastingService.detectSeasonality(
        testSurveyId,
        testTenantId,
        'nps',
        { interval: 'day' }
      );

      expect(result).toHaveProperty('hasSeasonality');
      expect(result).toHaveProperty('seasonalIndices');
      expect(result).toHaveProperty('strength');

      expect(typeof result.hasSeasonality).toBe('boolean');
      expect(typeof result.seasonalIndices).toBe('object');
    });

    test('calculates seasonal indices', async () => {
      const result = await ForecastingService.detectSeasonality(
        testSurveyId,
        testTenantId,
        'nps',
        { interval: 'day' }
      );

      if (result.hasSeasonality) {
        Object.values(result.seasonalIndices).forEach(index => {
          expect(typeof index).toBe('number');
          expect(index).toBeGreaterThan(0);
        });
      }
    });

    test('requires minimum 12 periods for monthly seasonality', async () => {
      // Create survey with less than 12 months of data
      const shortSurveyResult = await query(
        `INSERT INTO forms (tenant_id, title, definition, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [testTenantId, 'Short Survey', '{"pages":[]}', 1]
      );
      const shortSurveyId = shortSurveyResult.rows[0].id;

      // Add only 6 months of data
      for (let i = 1; i <= 6; i++) {
        await query(
          `INSERT INTO submissions (tenant_id, form_id, response_data, created_at)
           VALUES ($1, $2, $3, $4)`,
          [testTenantId, shortSurveyId, JSON.stringify({ nps_score: 9 }), `2026-0${i}-01`]
        );
      }

      const result = await ForecastingService.detectSeasonality(
        shortSurveyId,
        testTenantId,
        'nps',
        { interval: 'month' }
      );

      expect(result.hasSeasonality).toBe(false);
      expect(result.message).toContain('Insufficient data');

      // Cleanup
      await query('DELETE FROM submissions WHERE form_id = $1', [shortSurveyId]);
      await query('DELETE FROM forms WHERE id = $1', [shortSurveyId]);
    });
  });

  describe('Error Handling', () => {
    test('handles invalid survey ID', async () => {
      await expect(
        ForecastingService.forecastTrend(
          'non-existent',
          testTenantId,
          'nps',
          { periods: 3, interval: 'day' }
        )
      ).rejects.toThrow();
    });

    test('handles invalid tenant ID', async () => {
      await expect(
        ForecastingService.forecastTrend(
          testSurveyId,
          99999,
          'nps',
          { periods: 3, interval: 'day' }
        )
      ).rejects.toThrow();
    });

    test('handles invalid interval', async () => {
      await expect(
        ForecastingService.forecastTrend(
          testSurveyId,
          testTenantId,
          'nps',
          { periods: 3, interval: 'invalid-interval' }
        )
      ).rejects.toThrow();
    });
  });

  describe('Regression Calculations', () => {
    test('calculates positive slope for increasing trend', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 3, interval: 'day' }
      );

      // Data has increasing trend
      expect(result.regression.slope).toBeGreaterThan(0);
      expect(result.trend.direction).toBe('increasing');
    });

    test('R² value indicates good fit for linear data', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 3, interval: 'day' }
      );

      // Data is approximately linear, so R² should be high
      expect(result.regression.r2).toBeGreaterThan(0.7);
    });

    test('MSE is calculated correctly', async () => {
      const result = await ForecastingService.forecastTrend(
        testSurveyId,
        testTenantId,
        'nps',
        { periods: 3, interval: 'day' }
      );

      expect(result.regression.mse).toBeGreaterThan(0);
      expect(typeof result.regression.mse).toBe('number');
    });
  });
});
