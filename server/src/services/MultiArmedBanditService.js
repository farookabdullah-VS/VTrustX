const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const {
    thompsonSampling,
    upperConfidenceBound,
    epsilonGreedy,
    calculateBanditRegret
} = require('../utils/advancedStatistics');

/**
 * Multi-Armed Bandit Service
 *
 * Implements adaptive traffic allocation using bandit algorithms:
 * - Thompson Sampling (Bayesian)
 * - Upper Confidence Bound (UCB1)
 * - Epsilon-Greedy
 *
 * Dynamically shifts traffic to better-performing variants while learning.
 */
class MultiArmedBanditService {
    /**
     * Initialize bandit for an experiment
     *
     * @param {number} experimentId - Experiment ID
     * @param {Array<{id: number, name: string, initialAllocation: number}>} variants
     * @param {string} algorithm - Algorithm: 'thompson', 'ucb', 'epsilon_greedy'
     * @returns {Promise<Array>} Created bandit state records
     */
    async initializeBandit(experimentId, variants, algorithm = 'thompson') {
        try {
            const records = [];

            for (const variant of variants) {
                const result = await query(
                    `INSERT INTO ab_bandit_state
                    (experiment_id, variant_id, algorithm, success_count, failure_count,
                     mean_reward, current_allocation, initial_allocation, pulls, cumulative_reward)
                    VALUES ($1, $2, $3, 0, 0, 0, $4, $4, 0, 0)
                    RETURNING *`,
                    [
                        experimentId,
                        variant.id,
                        algorithm,
                        variant.initialAllocation
                    ]
                );

                records.push(result.rows[0]);
            }

            // Update experiment
            await query(
                `UPDATE ab_experiments
                 SET bandit_algorithm = $1
                 WHERE id = $2`,
                [algorithm, experimentId]
            );

            logger.info('[MultiArmedBandit] Initialized bandit', {
                experimentId,
                algorithm,
                variantCount: variants.length
            });

            return records;
        } catch (error) {
            logger.error('[MultiArmedBandit] Failed to initialize', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Select next variant to show using bandit algorithm
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<{variantId: number, variantName: string, algorithm: string}>}
     */
    async selectVariant(experimentId) {
        try {
            // Get bandit state for all variants
            const stateResult = await query(
                `SELECT bs.*, v.variant_name
                 FROM ab_bandit_state bs
                 JOIN ab_variants v ON v.id = bs.variant_id
                 WHERE bs.experiment_id = $1
                 ORDER BY v.variant_name`,
                [experimentId]
            );

            if (stateResult.rows.length === 0) {
                throw new Error(`Bandit state not found for experiment ${experimentId}`);
            }

            const arms = stateResult.rows;
            const algorithm = arms[0].algorithm;

            let selectedVariantId;

            // Select based on algorithm
            switch (algorithm) {
                case 'thompson':
                    selectedVariantId = await this._thompsonSamplingSelect(arms);
                    break;

                case 'ucb':
                    selectedVariantId = await this._ucbSelect(arms);
                    break;

                case 'epsilon_greedy':
                    selectedVariantId = await this._epsilonGreedySelect(arms);
                    break;

                default:
                    throw new Error(`Unknown bandit algorithm: ${algorithm}`);
            }

            // Increment pulls counter
            await query(
                `UPDATE ab_bandit_state
                 SET pulls = pulls + 1,
                     updated_at = NOW()
                 WHERE experiment_id = $1 AND variant_id = $2`,
                [experimentId, selectedVariantId]
            );

            const selectedArm = arms.find(a => a.variant_id === selectedVariantId);

            logger.debug('[MultiArmedBandit] Variant selected', {
                experimentId,
                variantId: selectedVariantId,
                variantName: selectedArm.variant_name,
                algorithm
            });

            return {
                variantId: selectedVariantId,
                variantName: selectedArm.variant_name,
                algorithm
            };
        } catch (error) {
            logger.error('[MultiArmedBandit] Failed to select variant', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Thompson Sampling selection
     *
     * @private
     * @param {Array} arms - Bandit state for all arms
     * @returns {number} Selected variant ID
     */
    async _thompsonSamplingSelect(arms) {
        const armsForSampling = arms.map(arm => ({
            id: arm.variant_id,
            // Beta distribution parameters
            alphaPost: arm.success_count + 1,  // +1 for prior
            betaPost: arm.failure_count + 1
        }));

        return thompsonSampling(armsForSampling);
    }

    /**
     * UCB selection
     *
     * @private
     * @param {Array} arms - Bandit state for all arms
     * @returns {number} Selected variant ID
     */
    async _ucbSelect(arms) {
        const totalPulls = arms.reduce((sum, arm) => sum + parseInt(arm.pulls), 0);

        const armsForUCB = arms.map(arm => ({
            id: arm.variant_id,
            meanReward: parseFloat(arm.mean_reward) || 0,
            pulls: parseInt(arm.pulls)
        }));

        return upperConfidenceBound(armsForUCB, totalPulls, 2);
    }

    /**
     * Epsilon-Greedy selection
     *
     * @private
     * @param {Array} arms - Bandit state for all arms
     * @returns {number} Selected variant ID
     */
    async _epsilonGreedySelect(arms) {
        const armsForEG = arms.map(arm => ({
            id: arm.variant_id,
            meanReward: parseFloat(arm.mean_reward) || 0
        }));

        return epsilonGreedy(armsForEG, 0.1);
    }

    /**
     * Update bandit after observing reward
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} variantId - Variant ID that was shown
     * @param {number} reward - Reward received (1 for conversion, 0 for no conversion)
     * @returns {Promise<object>} Updated bandit state
     */
    async updateBandit(experimentId, variantId, reward) {
        try {
            // Update success/failure counts and mean reward
            const updateQuery = reward === 1
                ? `UPDATE ab_bandit_state
                   SET success_count = success_count + 1,
                       cumulative_reward = cumulative_reward + 1,
                       mean_reward = (cumulative_reward + 1.0) / NULLIF(pulls, 0),
                       updated_at = NOW()
                   WHERE experiment_id = $1 AND variant_id = $2
                   RETURNING *`
                : `UPDATE ab_bandit_state
                   SET failure_count = failure_count + 1,
                       mean_reward = cumulative_reward / NULLIF(pulls, 0),
                       updated_at = NOW()
                   WHERE experiment_id = $1 AND variant_id = $2
                   RETURNING *`;

            const result = await query(updateQuery, [experimentId, variantId]);

            if (result.rows.length === 0) {
                throw new Error(`Bandit state not found for experiment ${experimentId}, variant ${variantId}`);
            }

            // Recalculate allocations (every N updates)
            const totalPulls = await this._getTotalPulls(experimentId);
            if (totalPulls % 10 === 0) {  // Recalculate every 10 pulls
                await this._recalculateAllocations(experimentId);
            }

            // Track regret periodically
            if (totalPulls % 50 === 0) {  // Track every 50 pulls
                await this._trackRegret(experimentId);
            }

            logger.debug('[MultiArmedBandit] Updated after reward', {
                experimentId,
                variantId,
                reward,
                newMeanReward: result.rows[0].mean_reward
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[MultiArmedBandit] Failed to update bandit', {
                error: error.message,
                experimentId,
                variantId
            });
            throw error;
        }
    }

    /**
     * Get total pulls across all arms
     *
     * @private
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<number>} Total pulls
     */
    async _getTotalPulls(experimentId) {
        const result = await query(
            'SELECT SUM(pulls) as total FROM ab_bandit_state WHERE experiment_id = $1',
            [experimentId]
        );
        return parseInt(result.rows[0].total) || 0;
    }

    /**
     * Recalculate traffic allocations based on current performance
     *
     * @private
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<void>}
     */
    async _recalculateAllocations(experimentId) {
        try {
            const stateResult = await query(
                'SELECT * FROM ab_bandit_state WHERE experiment_id = $1',
                [experimentId]
            );

            const arms = stateResult.rows;
            const totalPulls = arms.reduce((sum, arm) => sum + parseInt(arm.pulls), 0);

            if (totalPulls === 0) return;

            // Calculate new allocations proportional to empirical performance
            const allocations = arms.map(arm => {
                const pulls = parseInt(arm.pulls);
                return {
                    variant_id: arm.variant_id,
                    allocation: (pulls / totalPulls) * 100
                };
            });

            // Update allocations in database
            for (const alloc of allocations) {
                await query(
                    `UPDATE ab_bandit_state
                     SET current_allocation = $1
                     WHERE experiment_id = $2 AND variant_id = $3`,
                    [alloc.allocation, experimentId, alloc.variant_id]
                );
            }

            logger.debug('[MultiArmedBandit] Recalculated allocations', {
                experimentId,
                allocations
            });
        } catch (error) {
            logger.error('[MultiArmedBandit] Failed to recalculate allocations', {
                error: error.message,
                experimentId
            });
        }
    }

    /**
     * Track cumulative regret
     *
     * @private
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<void>}
     */
    async _trackRegret(experimentId) {
        try {
            const stateResult = await query(
                'SELECT * FROM ab_bandit_state WHERE experiment_id = $1',
                [experimentId]
            );

            const arms = stateResult.rows.map(arm => ({
                id: arm.variant_id,
                meanReward: parseFloat(arm.mean_reward) || 0,
                pulls: parseInt(arm.pulls),
                cumulativeReward: parseFloat(arm.cumulative_reward)
            }));

            const regret = calculateBanditRegret(arms);
            const totalPulls = arms.reduce((sum, arm) => sum + arm.pulls, 0);
            const optimalVariantId = arms.reduce((max, arm) =>
                arm.meanReward > max.meanReward ? arm : max
            ).id;

            // Store regret snapshot
            await query(
                `INSERT INTO ab_bandit_regret
                (experiment_id, timestamp, total_pulls, cumulative_regret, optimal_variant_id)
                VALUES ($1, NOW(), $2, $3, $4)`,
                [experimentId, totalPulls, regret, optimalVariantId]
            );

            logger.debug('[MultiArmedBandit] Tracked regret', {
                experimentId,
                totalPulls,
                regret
            });
        } catch (error) {
            logger.error('[MultiArmedBandit] Failed to track regret', {
                error: error.message,
                experimentId
            });
        }
    }

    /**
     * Get current allocations
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<Array>} Current allocations per variant
     */
    async getCurrentAllocation(experimentId) {
        try {
            const result = await query(
                `SELECT bs.*, v.variant_name
                 FROM ab_bandit_state bs
                 JOIN ab_variants v ON v.id = bs.variant_id
                 WHERE bs.experiment_id = $1
                 ORDER BY v.variant_name`,
                [experimentId]
            );

            return result.rows.map(row => ({
                variantId: row.variant_id,
                variantName: row.variant_name,
                currentAllocation: parseFloat(row.current_allocation),
                initialAllocation: parseFloat(row.initial_allocation),
                meanReward: parseFloat(row.mean_reward) || 0,
                pulls: parseInt(row.pulls),
                successCount: parseInt(row.success_count),
                failureCount: parseInt(row.failure_count)
            }));
        } catch (error) {
            logger.error('[MultiArmedBandit] Failed to get allocations', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get regret history
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<Array>} Regret history over time
     */
    async getRegretHistory(experimentId) {
        try {
            const result = await query(
                `SELECT * FROM ab_bandit_regret
                 WHERE experiment_id = $1
                 ORDER BY timestamp ASC`,
                [experimentId]
            );

            return result.rows.map(row => ({
                timestamp: row.timestamp,
                totalPulls: parseInt(row.total_pulls),
                cumulativeRegret: parseFloat(row.cumulative_regret),
                optimalVariantId: row.optimal_variant_id
            }));
        } catch (error) {
            logger.error('[MultiArmedBandit] Failed to get regret history', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get complete bandit results
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<object>} Complete bandit analysis
     */
    async getResults(experimentId) {
        try {
            const [allocations, regretHistory] = await Promise.all([
                this.getCurrentAllocation(experimentId),
                this.getRegretHistory(experimentId)
            ]);

            // Calculate total regret
            const totalRegret = regretHistory.length > 0
                ? regretHistory[regretHistory.length - 1].cumulativeRegret
                : 0;

            // Find current best performer
            const bestPerformer = allocations.reduce((max, current) =>
                current.meanReward > max.meanReward ? current : max
            );

            return {
                algorithm: allocations[0]?.algorithm || 'unknown',
                allocations,
                regretHistory,
                totalRegret,
                bestPerformer: {
                    variantId: bestPerformer.variantId,
                    variantName: bestPerformer.variantName,
                    meanReward: bestPerformer.meanReward
                },
                summary: this._generateSummary(allocations, totalRegret)
            };
        } catch (error) {
            logger.error('[MultiArmedBandit] Failed to get results', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Generate summary of bandit performance
     *
     * @private
     * @param {Array} allocations - Current allocations
     * @param {number} totalRegret - Total cumulative regret
     * @returns {object} Summary
     */
    _generateSummary(allocations, totalRegret) {
        const totalPulls = allocations.reduce((sum, a) => sum + a.pulls, 0);
        const avgRegretPerPull = totalPulls > 0 ? totalRegret / totalPulls : 0;

        const allocationShift = allocations.map(a => ({
            variant: a.variantName,
            shift: a.currentAllocation - a.initialAllocation
        }));

        return {
            totalPulls,
            totalRegret: totalRegret.toFixed(4),
            avgRegretPerPull: avgRegretPerPull.toFixed(6),
            allocationShifts: allocationShift,
            message: `Performed ${totalPulls} pulls with ${totalRegret.toFixed(2)} cumulative regret. Traffic dynamically allocated based on performance.`
        };
    }
}

// Export singleton instance
const multiArmedBanditService = new MultiArmedBanditService();
module.exports = multiArmedBanditService;
