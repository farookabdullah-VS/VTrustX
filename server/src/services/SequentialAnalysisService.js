const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const {
    calculateOBrienFlemingBounds,
    calculateInformationFraction,
    shouldStopSequential,
    calculateZStatistic
} = require('../utils/advancedStatistics');

/**
 * Sequential Analysis Service
 *
 * Implements group sequential design with O'Brien-Fleming stopping boundaries.
 * Allows early stopping for efficacy or futility while controlling type I error.
 */
class SequentialAnalysisService {
    /**
     * Initialize sequential analysis plan for an experiment
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} plannedSampleSize - Planned total sample size per variant
     * @param {number} numChecks - Number of interim analyses (default: 5)
     * @returns {Promise<object>} Sequential analysis plan
     */
    async initializeSequential(experimentId, plannedSampleSize, numChecks = 5) {
        try {
            // Store plan in experiment metadata
            await query(
                `UPDATE ab_experiments
                 SET early_stopping_enabled = true,
                     metadata = jsonb_set(
                         COALESCE(metadata, '{}'::jsonb),
                         '{sequential_plan}',
                         $1::jsonb
                     )
                 WHERE id = $2`,
                [
                    JSON.stringify({
                        plannedSampleSize,
                        numChecks,
                        createdAt: new Date().toISOString()
                    }),
                    experimentId
                ]
            );

            logger.info('[SequentialAnalysis] Initialized sequential plan', {
                experimentId,
                plannedSampleSize,
                numChecks
            });

            return {
                experimentId,
                plannedSampleSize,
                numChecks,
                checkPoints: this._calculateCheckPoints(plannedSampleSize, numChecks)
            };
        } catch (error) {
            logger.error('[SequentialAnalysis] Failed to initialize', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Calculate check points (sample sizes) for interim analyses
     *
     * @private
     * @param {number} plannedN - Planned total sample size
     * @param {number} numChecks - Number of checks
     * @returns {Array<number>} Sample sizes at which to perform checks
     */
    _calculateCheckPoints(plannedN, numChecks) {
        const checkPoints = [];
        for (let i = 1; i <= numChecks; i++) {
            checkPoints.push(Math.round((i / numChecks) * plannedN));
        }
        return checkPoints;
    }

    /**
     * Perform interim analysis
     *
     * Checks stopping boundaries and makes decision to continue or stop.
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<object>} Analysis results with decision
     */
    async performInterimAnalysis(experimentId) {
        try {
            // Get experiment and sequential plan
            const expResult = await query(
                'SELECT * FROM ab_experiments WHERE id = $1',
                [experimentId]
            );

            if (expResult.rows.length === 0) {
                throw new Error(`Experiment ${experimentId} not found`);
            }

            const experiment = expResult.rows[0];
            const plan = experiment.metadata?.sequential_plan;

            if (!plan) {
                throw new Error('Sequential plan not found. Call initializeSequential first.');
            }

            // Get current check number
            const checkResult = await query(
                'SELECT COUNT(*) as check_count FROM ab_sequential_analysis WHERE experiment_id = $1',
                [experimentId]
            );
            const checkNumber = parseInt(checkResult.rows[0].check_count) + 1;

            if (checkNumber > plan.numChecks) {
                return {
                    decision: 'stop_planned',
                    reason: 'Reached planned number of analyses',
                    checkNumber
                };
            }

            // Get current sample sizes and results
            const variantsResult = await query(
                `SELECT v.id, v.variant_name,
                        COUNT(a.id) as assignments,
                        COUNT(CASE WHEN se.event_type = 'completed' THEN 1 END) as conversions
                 FROM ab_variants v
                 LEFT JOIN ab_assignments a ON a.variant_id = v.id
                 LEFT JOIN survey_events se ON se.distribution_id = (
                     SELECT distribution_id FROM distributions WHERE experiment_id = $1 LIMIT 1
                 ) AND se.unique_id = a.recipient_id
                 WHERE v.experiment_id = $1
                 GROUP BY v.id, v.variant_name
                 ORDER BY v.variant_name`,
                [experimentId]
            );

            if (variantsResult.rows.length < 2) {
                throw new Error('Need at least 2 variants for sequential analysis');
            }

            // Calculate for first two variants (can extend to multi-arm)
            const [variantA, variantB] = variantsResult.rows;

            const n1 = parseInt(variantA.assignments);
            const n2 = parseInt(variantB.assignments);
            const x1 = parseInt(variantA.conversions);
            const x2 = parseInt(variantB.conversions);

            if (n1 === 0 || n2 === 0) {
                return {
                    decision: 'continue',
                    reason: 'Insufficient data for analysis',
                    checkNumber
                };
            }

            const p1 = x1 / n1;
            const p2 = x2 / n2;

            // Calculate Z-statistic
            const zStat = calculateZStatistic(p1, n1, p2, n2);

            // Calculate information fraction
            const totalN = n1 + n2;
            const plannedN = plan.plannedSampleSize * 2;
            const infoFraction = calculateInformationFraction(totalN, plannedN);

            // Get stopping boundaries
            const bounds = calculateOBrienFlemingBounds(checkNumber, plan.numChecks);

            // Calculate alpha spent (approximate)
            const alphaSpent = this._calculateAlphaSpent(checkNumber, plan.numChecks);

            // Make stopping decision
            const stoppingDecision = shouldStopSequential(zStat, bounds.upper, bounds.lower);

            // Store analysis result
            await query(
                `INSERT INTO ab_sequential_analysis
                (experiment_id, check_number, total_checks, total_assignments,
                 information_fraction, alpha_spent, z_statistic, boundary_upper,
                 boundary_lower, decision, decision_reason, checked_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
                [
                    experimentId,
                    checkNumber,
                    plan.numChecks,
                    totalN,
                    infoFraction,
                    alphaSpent,
                    zStat,
                    bounds.upper,
                    bounds.lower,
                    stoppingDecision.decision,
                    stoppingDecision.reason
                ]
            );

            logger.info('[SequentialAnalysis] Interim analysis complete', {
                experimentId,
                checkNumber,
                decision: stoppingDecision.decision,
                zStatistic: zStat
            });

            return {
                experimentId,
                checkNumber,
                totalChecks: plan.numChecks,
                zStatistic: zStat,
                boundaries: bounds,
                alphaSpent,
                infoFraction,
                decision: stoppingDecision.decision,
                reason: stoppingDecision.reason,
                shouldStop: stoppingDecision.shouldStop,
                data: {
                    variantA: { name: variantA.variant_name, n: n1, conversions: x1, rate: p1 },
                    variantB: { name: variantB.variant_name, n: n2, conversions: x2, rate: p2 }
                }
            };
        } catch (error) {
            logger.error('[SequentialAnalysis] Failed to perform interim analysis', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Calculate cumulative alpha spent (type I error)
     *
     * @private
     * @param {number} checkNumber - Current check number
     * @param {number} totalChecks - Total number of checks
     * @returns {number} Cumulative alpha spent
     */
    _calculateAlphaSpent(checkNumber, totalChecks) {
        // O'Brien-Fleming alpha spending function
        // This is an approximation; exact calculation requires integration
        const t = checkNumber / totalChecks;
        return 0.05 * (2 * (1 - this._normalCDF(1.96 / Math.sqrt(t))));
    }

    /**
     * Normal CDF approximation
     *
     * @private
     * @param {number} z - Z-score
     * @returns {number} Cumulative probability
     */
    _normalCDF(z) {
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp(-z * z / 2);
        const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return z > 0 ? 1 - p : p;
    }

    /**
     * Get next check point (sample size at which to perform next analysis)
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<object>} Next check point info
     */
    async getNextCheckPoint(experimentId) {
        try {
            // Get plan
            const expResult = await query(
                'SELECT metadata FROM ab_experiments WHERE id = $1',
                [experimentId]
            );

            const plan = expResult.rows[0]?.metadata?.sequential_plan;
            if (!plan) {
                throw new Error('Sequential plan not found');
            }

            // Get last check
            const lastCheckResult = await query(
                `SELECT check_number, total_assignments
                 FROM ab_sequential_analysis
                 WHERE experiment_id = $1
                 ORDER BY check_number DESC
                 LIMIT 1`,
                [experimentId]
            );

            const lastCheck = lastCheckResult.rows[0];
            const nextCheckNumber = lastCheck ? lastCheck.check_number + 1 : 1;

            if (nextCheckNumber > plan.numChecks) {
                return {
                    hasNext: false,
                    message: 'All planned checks completed'
                };
            }

            const checkPoints = this._calculateCheckPoints(plan.plannedSampleSize * 2, plan.numChecks);
            const nextCheckPoint = checkPoints[nextCheckNumber - 1];

            return {
                hasNext: true,
                nextCheckNumber,
                nextSampleSize: nextCheckPoint,
                currentSampleSize: lastCheck?.total_assignments || 0,
                remaining: nextCheckPoint - (lastCheck?.total_assignments || 0)
            };
        } catch (error) {
            logger.error('[SequentialAnalysis] Failed to get next check point', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get all interim analyses for an experiment
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<Array>} All interim analyses
     */
    async getAnalysisHistory(experimentId) {
        try {
            const result = await query(
                `SELECT * FROM ab_sequential_analysis
                 WHERE experiment_id = $1
                 ORDER BY check_number ASC`,
                [experimentId]
            );

            return result.rows.map(row => ({
                checkNumber: row.check_number,
                totalAssignments: row.total_assignments,
                informationFraction: row.information_fraction,
                alphaSpent: row.alpha_spent,
                zStatistic: row.z_statistic,
                boundaries: {
                    upper: row.boundary_upper,
                    lower: row.boundary_lower
                },
                decision: row.decision,
                reason: row.decision_reason,
                checkedAt: row.checked_at
            }));
        } catch (error) {
            logger.error('[SequentialAnalysis] Failed to get analysis history', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get sequential analysis results with visualization data
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<object>} Complete sequential analysis results
     */
    async getResults(experimentId) {
        try {
            const [history, nextCheckPoint] = await Promise.all([
                this.getAnalysisHistory(experimentId),
                this.getNextCheckPoint(experimentId)
            ]);

            // Get plan
            const expResult = await query(
                'SELECT metadata FROM ab_experiments WHERE id = $1',
                [experimentId]
            );
            const plan = expResult.rows[0]?.metadata?.sequential_plan;

            // Prepare visualization data
            const boundaryData = [];
            for (let i = 1; i <= plan.numChecks; i++) {
                const bounds = calculateOBrienFlemingBounds(i, plan.numChecks);
                boundaryData.push({
                    checkNumber: i,
                    upper: bounds.upper,
                    lower: bounds.lower
                });
            }

            return {
                plan: {
                    plannedSampleSize: plan.plannedSampleSize,
                    numChecks: plan.numChecks
                },
                history,
                nextCheckPoint,
                boundaryData,
                currentStatus: this._getCurrentStatus(history, nextCheckPoint)
            };
        } catch (error) {
            logger.error('[SequentialAnalysis] Failed to get results', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get current status summary
     *
     * @private
     * @param {Array} history - Analysis history
     * @param {object} nextCheckPoint - Next check point info
     * @returns {object} Status summary
     */
    _getCurrentStatus(history, nextCheckPoint) {
        if (history.length === 0) {
            return {
                status: 'not_started',
                message: 'No interim analyses performed yet'
            };
        }

        const lastAnalysis = history[history.length - 1];

        if (lastAnalysis.decision === 'stop_winner') {
            return {
                status: 'stopped_efficacy',
                message: 'Stopped early: statistically significant difference found'
            };
        }

        if (lastAnalysis.decision === 'stop_futile') {
            return {
                status: 'stopped_futility',
                message: 'Stopped early: unlikely to find significant difference'
            };
        }

        if (!nextCheckPoint.hasNext) {
            return {
                status: 'completed',
                message: 'All planned analyses completed'
            };
        }

        return {
            status: 'ongoing',
            message: `Check ${lastAnalysis.checkNumber} completed. Continue to ${nextCheckPoint.nextSampleSize} total assignments.`
        };
    }

    /**
     * Automatically check if interim analysis should be performed
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<object|null>} Analysis results if check performed, null otherwise
     */
    async autoCheckIfNeeded(experimentId) {
        try {
            const nextCheck = await this.getNextCheckPoint(experimentId);

            if (!nextCheck.hasNext) {
                return null;
            }

            // Get current sample size
            const sampleResult = await query(
                `SELECT COUNT(*) as total
                 FROM ab_assignments
                 WHERE experiment_id = $1`,
                [experimentId]
            );

            const currentTotal = parseInt(sampleResult.rows[0].total);

            // Check if we've reached next check point
            if (currentTotal >= nextCheck.nextSampleSize) {
                logger.info('[SequentialAnalysis] Auto-triggering interim analysis', {
                    experimentId,
                    currentTotal,
                    checkPoint: nextCheck.nextSampleSize
                });

                return await this.performInterimAnalysis(experimentId);
            }

            return null;
        } catch (error) {
            logger.error('[SequentialAnalysis] Failed auto-check', {
                error: error.message,
                experimentId
            });
            return null;
        }
    }
}

// Export singleton instance
const sequentialAnalysisService = new SequentialAnalysisService();
module.exports = sequentialAnalysisService;
