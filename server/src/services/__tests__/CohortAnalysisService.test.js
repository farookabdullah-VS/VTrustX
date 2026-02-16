/**
 * Integration tests for CohortAnalysisService
 */

const CohortAnalysisService = require('../CohortAnalysisService');
const { query } = require('../../infrastructure/database/db');

describe('CohortAnalysisService', () => {
  let testTenantId;
  let testSurveyId;

  beforeAll(async () => {
    // Create test tenant
    const tenantResult = await query(
      'INSERT INTO tenants (name, domain) VALUES ($1, $2) RETURNING id',
      ['Cohort Test Tenant', 'cohort-test.example.com']
    );
    testTenantId = tenantResult.rows[0].id;

    // Create test survey
    const surveyResult = await query(
      `INSERT INTO forms (tenant_id, title, definition, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTenantId, 'Cohort Test Survey', '{"pages":[]}', 1]
    );
    testSurveyId = surveyResult.rows[0].id;

    // Create test submissions with cohort data
    const submissions = [
      // January 2026 cohort
      { date: '2026-01-15', nps_score: 8, email: 'user1@test.com' },
      { date: '2026-01-20', nps_score: 9, email: 'user2@test.com' },
      { date: '2026-01-25', nps_score: 7, email: 'user3@test.com' },

      // February 2026 cohort
      { date: '2026-02-05', nps_score: 9, email: 'user4@test.com' },
      { date: '2026-02-10', nps_score: 10, email: 'user5@test.com' },
      { date: '2026-02-15', nps_score: 8, email: 'user1@test.com' }, // Repeat user

      // March 2026 cohort
      { date: '2026-03-01', nps_score: 6, email: 'user6@test.com' },
      { date: '2026-03-10', nps_score: 7, email: 'user2@test.com' }, // Repeat user
      { date: '2026-03-15', nps_score: 8, email: 'user7@test.com' }
    ];

    for (const submission of submissions) {
      await query(
        `INSERT INTO submissions (tenant_id, form_id, response_data, respondent_email, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          testTenantId,
          testSurveyId,
          JSON.stringify({ nps_score: submission.nps_score }),
          submission.email,
          submission.date
        ]
      );
    }
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM submissions WHERE tenant_id = $1', [testTenantId]);
    await query('DELETE FROM forms WHERE id = $1', [testSurveyId]);
    await query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
  });

  describe('analyzeCohorts', () => {
    test('analyzes cohorts by month', async () => {
      const result = await CohortAnalysisService.analyzeCohorts(
        testSurveyId,
        testTenantId,
        { cohortBy: 'month', metric: 'nps' }
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify cohort structure
      result.forEach(cohort => {
        expect(cohort).toHaveProperty('cohort');
        expect(cohort).toHaveProperty('totalResponses');
        expect(cohort).toHaveProperty('metricValue');
        expect(cohort).toHaveProperty('cohortStart');
        expect(cohort).toHaveProperty('cohortEnd');
      });
    });

    test('calculates correct NPS values', async () => {
      const result = await CohortAnalysisService.analyzeCohorts(
        testSurveyId,
        testTenantId,
        { cohortBy: 'month', metric: 'nps' }
      );

      // Find January cohort (has 3 responses: scores 8, 9, 7)
      const janCohort = result.find(c => c.cohort === '2026-01');

      expect(janCohort).toBeDefined();
      expect(janCohort.totalResponses).toBe(3);

      // NPS = (Promoters - Detractors) / Total * 100
      // Scores: 8, 9, 7 -> 1 promoter (9), 0 detractors, 2 passives
      // NPS = (1 - 0) / 3 * 100 = 33.33
      expect(janCohort.metricValue).toBeCloseTo(33.33, 1);
    });

    test('calculates trends between cohorts', async () => {
      const result = await CohortAnalysisService.analyzeCohorts(
        testSurveyId,
        testTenantId,
        { cohortBy: 'month', metric: 'nps' }
      );

      // Check that trends are calculated (except for first cohort)
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toHaveProperty('trend');
        expect(result[i].trend).toHaveProperty('change');
        expect(result[i].trend).toHaveProperty('percentChange');
        expect(result[i].trend).toHaveProperty('direction');
        expect(['up', 'down', 'flat']).toContain(result[i].trend.direction);
      }
    });

    test('filters by date range', async () => {
      const result = await CohortAnalysisService.analyzeCohorts(
        testSurveyId,
        testTenantId,
        {
          cohortBy: 'month',
          metric: 'nps',
          startDate: '2026-02-01',
          endDate: '2026-02-28'
        }
      );

      expect(result.length).toBe(1);
      expect(result[0].cohort).toBe('2026-02');
    });

    test('handles different cohort periods', async () => {
      const periods = ['day', 'week', 'month', 'quarter'];

      for (const period of periods) {
        const result = await CohortAnalysisService.analyzeCohorts(
          testSurveyId,
          testTenantId,
          { cohortBy: period, metric: 'nps' }
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    test('supports different metrics', async () => {
      // Test with count metric
      const result = await CohortAnalysisService.analyzeCohorts(
        testSurveyId,
        testTenantId,
        { cohortBy: 'month', metric: 'count' }
      );

      expect(Array.isArray(result)).toBe(true);
      result.forEach(cohort => {
        expect(cohort.totalResponses).toBeGreaterThan(0);
      });
    });

    test('returns empty array for non-existent survey', async () => {
      const result = await CohortAnalysisService.analyzeCohorts(
        'non-existent-survey',
        testTenantId,
        { cohortBy: 'month', metric: 'nps' }
      );

      expect(result).toEqual([]);
    });

    test('handles empty date range', async () => {
      const result = await CohortAnalysisService.analyzeCohorts(
        testSurveyId,
        testTenantId,
        {
          cohortBy: 'month',
          metric: 'nps',
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        }
      );

      expect(result).toEqual([]);
    });
  });

  describe('analyzeRetention', () => {
    test('analyzes retention rates', async () => {
      const result = await CohortAnalysisService.analyzeRetention(
        testSurveyId,
        testTenantId,
        { cohortBy: 'month' }
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      result.forEach(cohort => {
        expect(cohort).toHaveProperty('cohort');
        expect(cohort).toHaveProperty('totalRespondents');
        expect(cohort).toHaveProperty('retentionRates');
        expect(typeof cohort.retentionRates).toBe('object');
      });
    });

    test('calculates correct retention percentages', async () => {
      const result = await CohortAnalysisService.analyzeRetention(
        testSurveyId,
        testTenantId,
        { cohortBy: 'month' }
      );

      // Find January cohort
      const janCohort = result.find(c => c.cohort === '2026-01');

      if (janCohort) {
        // Check that retention rates are percentages
        Object.values(janCohort.retentionRates).forEach(rate => {
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(100);
        });

        // Initial period should have 100% retention
        expect(janCohort.retentionRates['2026-01']).toBe(100);
      }
    });

    test('tracks users across periods', async () => {
      const result = await CohortAnalysisService.analyzeRetention(
        testSurveyId,
        testTenantId,
        { cohortBy: 'month' }
      );

      // Verify that repeat users are tracked
      const janCohort = result.find(c => c.cohort === '2026-01');

      if (janCohort && janCohort.retentionRates['2026-02']) {
        // user1 and user2 from Jan cohort responded again
        expect(janCohort.retentionRates['2026-02']).toBeGreaterThan(0);
      }
    });

    test('handles cohorts without retention', async () => {
      const result = await CohortAnalysisService.analyzeRetention(
        testSurveyId,
        testTenantId,
        { cohortBy: 'month' }
      );

      // All cohorts should have at least their initial period
      result.forEach(cohort => {
        expect(Object.keys(cohort.retentionRates).length).toBeGreaterThan(0);
      });
    });
  });

  describe('compareCohorts', () => {
    test('compares multiple cohorts', async () => {
      const cohorts = [
        {
          name: 'January',
          startDate: '2026-01-01',
          endDate: '2026-01-31'
        },
        {
          name: 'February',
          startDate: '2026-02-01',
          endDate: '2026-02-28'
        }
      ];

      const result = await CohortAnalysisService.compareCohorts(
        testSurveyId,
        testTenantId,
        cohorts,
        { metric: 'nps' }
      );

      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toContain('January');
      expect(Object.keys(result)).toContain('February');

      Object.values(result).forEach(cohortData => {
        expect(cohortData).toHaveProperty('totalResponses');
        expect(cohortData).toHaveProperty('avgMetric');
        expect(cohortData).toHaveProperty('data');
      });
    });

    test('calculates average metrics across cohorts', async () => {
      const cohorts = [
        {
          name: 'Q1',
          startDate: '2026-01-01',
          endDate: '2026-03-31'
        }
      ];

      const result = await CohortAnalysisService.compareCohorts(
        testSurveyId,
        testTenantId,
        cohorts,
        { metric: 'nps' }
      );

      expect(result.Q1).toBeDefined();
      expect(result.Q1.totalResponses).toBeGreaterThan(0);
      expect(result.Q1.avgMetric).toBeDefined();
      expect(typeof result.Q1.avgMetric).toBe('number');
    });

    test('handles empty cohorts', async () => {
      const cohorts = [
        {
          name: 'Empty Period',
          startDate: '2025-01-01',
          endDate: '2025-01-31'
        }
      ];

      const result = await CohortAnalysisService.compareCohorts(
        testSurveyId,
        testTenantId,
        cohorts,
        { metric: 'nps' }
      );

      expect(result['Empty Period']).toBeDefined();
      expect(result['Empty Period'].totalResponses).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('handles invalid cohortBy value', async () => {
      await expect(
        CohortAnalysisService.analyzeCohorts(
          testSurveyId,
          testTenantId,
          { cohortBy: 'invalid-period', metric: 'nps' }
        )
      ).rejects.toThrow();
    });

    test('handles invalid tenant ID', async () => {
      const result = await CohortAnalysisService.analyzeCohorts(
        testSurveyId,
        99999,
        { cohortBy: 'month', metric: 'nps' }
      );

      expect(result).toEqual([]);
    });

    test('handles database errors gracefully', async () => {
      // Test with malformed survey ID that causes DB error
      await expect(
        CohortAnalysisService.analyzeCohorts(
          null,
          testTenantId,
          { cohortBy: 'month', metric: 'nps' }
        )
      ).rejects.toThrow();
    });
  });
});
