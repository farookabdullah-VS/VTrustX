const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

/**
 * PersonaAnalyticsService
 *
 * Provides persona performance analytics including:
 * - Match scoring (how well responses match persona attributes)
 * - Coverage analysis (% of customers represented by persona)
 * - Evolution tracking (persona metrics over time)
 * - Daily snapshots for historical data
 */
class PersonaAnalyticsService {
  /**
   * Calculate persona match score for a survey response
   *
   * Compares response data against persona mapping rules to determine
   * how well the response matches the persona profile.
   *
   * @param {number} personaId - ID of the persona
   * @param {number} responseId - ID of the form response
   * @returns {Promise<{score: number, matchedAttributes: object}>}
   */
  async calculateMatchScore(personaId, responseId) {
    try {
      // Get persona mapping rules
      const personaRes = await query(
        'SELECT mapping_rules, name FROM cx_personas WHERE id = $1',
        [personaId]
      );

      if (personaRes.rows.length === 0) {
        throw new Error('Persona not found');
      }

      const persona = personaRes.rows[0];
      const mappingRules = persona.mapping_rules || {};

      // Get response data
      const responseRes = await query(
        'SELECT response_data, tenant_id FROM submissions WHERE id = $1',
        [responseId]
      );

      if (responseRes.rows.length === 0) {
        throw new Error('Response not found');
      }

      const responseData = responseRes.rows[0].response_data;

      // Calculate match score
      let totalRules = 0;
      let matchedRules = 0;
      const matchedAttributes = {};

      // Age matching
      if (mappingRules.age && mappingRules.age.min && mappingRules.age.max) {
        totalRules++;
        const age = parseInt(responseData.age);
        if (!isNaN(age) && age >= mappingRules.age.min && age <= mappingRules.age.max) {
          matchedRules++;
          matchedAttributes.age = {
            expected: mappingRules.age,
            actual: age,
            match: true
          };
        } else if (!isNaN(age)) {
          matchedAttributes.age = {
            expected: mappingRules.age,
            actual: age,
            match: false
          };
        }
      }

      // Location matching
      if (mappingRules.location && Array.isArray(mappingRules.location) && mappingRules.location.length > 0) {
        totalRules++;
        const location = responseData.location;
        if (location && mappingRules.location.includes(location)) {
          matchedRules++;
          matchedAttributes.location = {
            expected: mappingRules.location,
            actual: location,
            match: true
          };
        } else if (location) {
          matchedAttributes.location = {
            expected: mappingRules.location,
            actual: location,
            match: false
          };
        }
      }

      // Occupation matching
      if (mappingRules.occupation && Array.isArray(mappingRules.occupation) && mappingRules.occupation.length > 0) {
        totalRules++;
        const occupation = responseData.occupation;
        if (occupation && mappingRules.occupation.includes(occupation)) {
          matchedRules++;
          matchedAttributes.occupation = {
            expected: mappingRules.occupation,
            actual: occupation,
            match: true
          };
        } else if (occupation) {
          matchedAttributes.occupation = {
            expected: mappingRules.occupation,
            actual: occupation,
            match: false
          };
        }
      }

      // Gender matching
      if (mappingRules.gender && Array.isArray(mappingRules.gender) && mappingRules.gender.length > 0) {
        totalRules++;
        const gender = responseData.gender;
        if (gender && mappingRules.gender.includes(gender)) {
          matchedRules++;
          matchedAttributes.gender = {
            expected: mappingRules.gender,
            actual: gender,
            match: true
          };
        } else if (gender) {
          matchedAttributes.gender = {
            expected: mappingRules.gender,
            actual: gender,
            match: false
          };
        }
      }

      // Behavioral matching - Goals
      if (mappingRules.goals && Array.isArray(mappingRules.goals) && mappingRules.goals.length > 0) {
        totalRules++;
        const goals = Array.isArray(responseData.goals) ? responseData.goals : [];
        const matchedGoals = goals.filter(g => mappingRules.goals.includes(g));
        if (matchedGoals.length > 0) {
          matchedRules++;
          matchedAttributes.goals = {
            expected: mappingRules.goals,
            actual: goals,
            matched: matchedGoals,
            match: true
          };
        } else if (goals.length > 0) {
          matchedAttributes.goals = {
            expected: mappingRules.goals,
            actual: goals,
            matched: [],
            match: false
          };
        }
      }

      // Behavioral matching - Frustrations
      if (mappingRules.frustrations && Array.isArray(mappingRules.frustrations) && mappingRules.frustrations.length > 0) {
        totalRules++;
        const frustrations = Array.isArray(responseData.frustrations) ? responseData.frustrations : [];
        const matchedFrustrations = frustrations.filter(f => mappingRules.frustrations.includes(f));
        if (matchedFrustrations.length > 0) {
          matchedRules++;
          matchedAttributes.frustrations = {
            expected: mappingRules.frustrations,
            actual: frustrations,
            matched: matchedFrustrations,
            match: true
          };
        } else if (frustrations.length > 0) {
          matchedAttributes.frustrations = {
            expected: mappingRules.frustrations,
            actual: frustrations,
            matched: [],
            match: false
          };
        }
      }

      // Calculate percentage score
      const score = totalRules > 0 ? (matchedRules / totalRules) * 100 : 0;

      // Save match record
      await query(
        `INSERT INTO persona_matches (persona_id, response_id, match_score, matched_attributes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (persona_id, response_id) DO UPDATE
         SET match_score = $3, matched_attributes = $4, created_at = NOW()`,
        [personaId, responseId, score.toFixed(2), JSON.stringify(matchedAttributes)]
      );

      logger.info('Persona match score calculated', {
        personaId,
        personaName: persona.name,
        responseId,
        score: score.toFixed(2),
        matchedRules,
        totalRules
      });

      return {
        score: parseFloat(score.toFixed(2)),
        matchedAttributes,
        totalRules,
        matchedRules
      };

    } catch (error) {
      logger.error('PersonaAnalyticsService.calculateMatchScore failed', {
        error: error.message,
        stack: error.stack,
        personaId,
        responseId
      });
      throw error;
    }
  }

  /**
   * Get persona performance metrics
   *
   * Returns comprehensive analytics including match statistics,
   * coverage analysis, and latest snapshot data.
   *
   * @param {number} personaId - ID of the persona
   * @param {object} options - Optional filters (startDate, endDate)
   * @returns {Promise<object>}
   */
  async getPersonaMetrics(personaId, options = {}) {
    try {
      const { startDate, endDate } = options;

      let dateFilter = '';
      const params = [personaId];

      if (startDate && endDate) {
        dateFilter = 'AND pm.created_at BETWEEN $2 AND $3';
        params.push(startDate, endDate);
      }

      // Get match statistics
      const statsRes = await query(
        `SELECT
           COUNT(*) as total_responses,
           AVG(match_score) as avg_match_score,
           MAX(match_score) as best_match_score,
           MIN(match_score) as worst_match_score,
           COUNT(CASE WHEN match_score >= 70 THEN 1 END) as strong_matches,
           COUNT(CASE WHEN match_score >= 50 AND match_score < 70 THEN 1 END) as moderate_matches,
           COUNT(CASE WHEN match_score < 50 THEN 1 END) as weak_matches
         FROM persona_matches pm
         WHERE pm.persona_id = $1 ${dateFilter}`,
        params
      );

      const stats = statsRes.rows[0];

      // Get coverage (% of total customers represented by this persona)
      const coverageRes = await query(
        `SELECT
           (SELECT COUNT(*) FROM persona_matches WHERE persona_id = $1 AND match_score >= 50) as persona_customers,
           (SELECT COUNT(DISTINCT id) FROM submissions WHERE tenant_id = (SELECT tenant_id FROM cx_personas WHERE id = $1)) as total_customers`,
        [personaId]
      );

      const coverage = coverageRes.rows[0];
      const coveragePercentage = parseInt(coverage.total_customers) > 0
        ? (parseInt(coverage.persona_customers) / parseInt(coverage.total_customers)) * 100
        : 0;

      // Get latest snapshot data
      const snapshotRes = await query(
        `SELECT metrics, demographics, behavioral_data, snapshot_date, response_count
         FROM persona_data_snapshots
         WHERE persona_id = $1
         ORDER BY snapshot_date DESC
         LIMIT 1`,
        [personaId]
      );

      const latestSnapshot = snapshotRes.rows[0] || null;

      // Get persona name
      const personaRes = await query('SELECT name FROM cx_personas WHERE id = $1', [personaId]);
      const personaName = personaRes.rows[0]?.name || 'Unknown';

      return {
        persona_name: personaName,
        match_statistics: {
          total_responses: parseInt(stats.total_responses || 0),
          avg_match_score: parseFloat(stats.avg_match_score || 0).toFixed(2),
          best_match_score: parseFloat(stats.best_match_score || 0).toFixed(2),
          worst_match_score: parseFloat(stats.worst_match_score || 0).toFixed(2),
          distribution: {
            strong: parseInt(stats.strong_matches || 0), // >= 70%
            moderate: parseInt(stats.moderate_matches || 0), // 50-69%
            weak: parseInt(stats.weak_matches || 0) // < 50%
          }
        },
        coverage: {
          persona_customers: parseInt(coverage.persona_customers || 0),
          total_customers: parseInt(coverage.total_customers || 0),
          percentage: parseFloat(coveragePercentage).toFixed(2)
        },
        latest_data: latestSnapshot
      };

    } catch (error) {
      logger.error('PersonaAnalyticsService.getPersonaMetrics failed', {
        error: error.message,
        stack: error.stack,
        personaId
      });
      throw error;
    }
  }

  /**
   * Create daily snapshot of persona data
   *
   * Aggregates metrics from matched responses and stores a daily snapshot
   * for historical tracking and trend analysis.
   *
   * @param {number} personaId - ID of the persona
   * @param {string} date - Date for snapshot (YYYY-MM-DD), defaults to today
   * @returns {Promise<object>}
   */
  async createDailySnapshot(personaId, date = null) {
    try {
      const persona = await query('SELECT * FROM cx_personas WHERE id = $1', [personaId]);
      if (persona.rows.length === 0) {
        logger.warn('Persona not found for snapshot', { personaId });
        return null;
      }

      const tenantId = persona.rows[0].tenant_id;
      const snapshotDate = date || new Date().toISOString().split('T')[0];

      // Calculate metrics from matched responses (score >= 50)
      const metricsRes = await query(
        `SELECT
           AVG(CAST(fr.response_data->>'satisfaction' AS DECIMAL)) as avg_satisfaction,
           AVG(CAST(fr.response_data->>'nps_score' AS DECIMAL)) as avg_loyalty,
           AVG(CAST(fr.response_data->>'trust_rating' AS DECIMAL)) as avg_trust,
           AVG(CAST(fr.response_data->>'effort_score' AS DECIMAL)) as avg_effort,
           COUNT(*) as response_count
         FROM submissions fr
         JOIN persona_matches pm ON fr.id = pm.response_id
         WHERE pm.persona_id = $1
         AND pm.match_score >= 50
         AND DATE(fr.created_at) = $2`,
        [personaId, snapshotDate]
      );

      const metrics = metricsRes.rows[0];

      // If no responses for this day, skip snapshot
      if (parseInt(metrics.response_count) === 0) {
        logger.info('No responses for persona on this day, skipping snapshot', {
          personaId,
          snapshotDate
        });
        return null;
      }

      // Calculate demographics distribution
      const demoRes = await query(
        `SELECT
           fr.response_data->>'age' as age,
           fr.response_data->>'gender' as gender,
           fr.response_data->>'location' as location,
           COUNT(*) as count
         FROM submissions fr
         JOIN persona_matches pm ON fr.id = pm.response_id
         WHERE pm.persona_id = $1
         AND pm.match_score >= 50
         AND DATE(fr.created_at) = $2
         GROUP BY age, gender, location`,
        [personaId, snapshotDate]
      );

      const demographics = {
        age_distribution: {},
        gender_distribution: {},
        location_distribution: {}
      };

      demoRes.rows.forEach(row => {
        if (row.age) {
          demographics.age_distribution[row.age] = parseInt(row.count);
        }
        if (row.gender) {
          demographics.gender_distribution[row.gender] = parseInt(row.count);
        }
        if (row.location) {
          demographics.location_distribution[row.location] = parseInt(row.count);
        }
      });

      // Insert or update snapshot
      const snapshot = await query(
        `INSERT INTO persona_data_snapshots
         (persona_id, tenant_id, snapshot_date, metrics, demographics, response_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (persona_id, snapshot_date) DO UPDATE
         SET metrics = $4, demographics = $5, response_count = $6, created_at = NOW()
         RETURNING *`,
        [
          personaId,
          tenantId,
          snapshotDate,
          JSON.stringify({
            satisfaction: parseFloat(metrics.avg_satisfaction || 0).toFixed(2),
            loyalty: parseFloat(metrics.avg_loyalty || 0).toFixed(2),
            trust: parseFloat(metrics.avg_trust || 0).toFixed(2),
            effort: parseFloat(metrics.avg_effort || 0).toFixed(2)
          }),
          JSON.stringify(demographics),
          parseInt(metrics.response_count || 0)
        ]
      );

      // Update persona's last_synced_at
      await query(
        'UPDATE cx_personas SET last_synced_at = NOW() WHERE id = $1',
        [personaId]
      );

      logger.info('Daily snapshot created', {
        personaId,
        snapshotDate,
        responseCount: metrics.response_count
      });

      return snapshot.rows[0];

    } catch (error) {
      logger.error('PersonaAnalyticsService.createDailySnapshot failed', {
        error: error.message,
        stack: error.stack,
        personaId,
        date
      });
      throw error;
    }
  }

  /**
   * Get persona evolution over time
   *
   * Returns historical snapshot data showing how persona metrics
   * have evolved over the specified time period.
   *
   * @param {number} personaId - ID of the persona
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Promise<array>}
   */
  async getPersonaEvolution(personaId, days = 30) {
    try {
      const result = await query(
        `SELECT snapshot_date, metrics, demographics, response_count
         FROM persona_data_snapshots
         WHERE persona_id = $1
         AND snapshot_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY snapshot_date ASC`,
        [personaId]
      );

      return result.rows;

    } catch (error) {
      logger.error('PersonaAnalyticsService.getPersonaEvolution failed', {
        error: error.message,
        stack: error.stack,
        personaId,
        days
      });
      throw error;
    }
  }

  /**
   * Get top matching responses for a persona
   *
   * Returns the responses that best match the persona profile,
   * useful for validation and persona refinement.
   *
   * @param {number} personaId - ID of the persona
   * @param {number} limit - Number of results to return (default: 10)
   * @returns {Promise<array>}
   */
  async getTopMatches(personaId, limit = 10) {
    try {
      const result = await query(
        `SELECT
           pm.response_id,
           pm.match_score,
           pm.matched_attributes,
           pm.created_at,
           fr.response_data
         FROM persona_matches pm
         JOIN submissions fr ON pm.response_id = fr.id
         WHERE pm.persona_id = $1
         ORDER BY pm.match_score DESC
         LIMIT $2`,
        [personaId, limit]
      );

      return result.rows;

    } catch (error) {
      logger.error('PersonaAnalyticsService.getTopMatches failed', {
        error: error.message,
        stack: error.stack,
        personaId
      });
      throw error;
    }
  }

  /**
   * Batch calculate match scores for all responses
   *
   * Useful for initial setup or recalculating matches after
   * updating persona mapping rules.
   *
   * @param {number} personaId - ID of the persona
   * @param {number} tenantId - Tenant ID for filtering responses
   * @returns {Promise<{processed: number, matched: number}>}
   */
  async batchCalculateMatches(personaId, tenantId) {
    try {
      // Get all responses for this tenant
      const responsesRes = await query(
        'SELECT id FROM submissions WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
      );

      const responses = responsesRes.rows;
      let processed = 0;
      let matched = 0;

      logger.info('Starting batch match calculation', {
        personaId,
        totalResponses: responses.length
      });

      for (const response of responses) {
        try {
          const result = await this.calculateMatchScore(personaId, response.id);
          processed++;
          if (result.score >= 50) {
            matched++;
          }

          // Log progress every 100 responses
          if (processed % 100 === 0) {
            logger.info('Batch processing progress', {
              personaId,
              processed,
              matched,
              total: responses.length
            });
          }
        } catch (error) {
          logger.error('Failed to calculate match for response', {
            personaId,
            responseId: response.id,
            error: error.message
          });
        }
      }

      logger.info('Batch match calculation completed', {
        personaId,
        processed,
        matched,
        matchRate: responses.length > 0 ? ((matched / responses.length) * 100).toFixed(2) : 0
      });

      return { processed, matched };

    } catch (error) {
      logger.error('PersonaAnalyticsService.batchCalculateMatches failed', {
        error: error.message,
        stack: error.stack,
        personaId,
        tenantId
      });
      throw error;
    }
  }
}

module.exports = new PersonaAnalyticsService();
