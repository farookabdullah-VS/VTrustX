const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const {
    calculateBayesianPosterior,
    calculateProbabilityBest,
    calculateCredibleInterval,
    calculateExpectedLoss
} = require('../utils/advancedStatistics');

/**
 * Bayesian A/B Testing Service
 *
 * Provides Bayesian inference for A/B tests using Beta-Binomial conjugate priors.
 * Returns probabilities that each variant is best, credible intervals, and expected loss.
 */
class BayesianABTestService {
    /**
     * Initialize Bayesian analysis for an experiment
     *
     * Sets up priors for each variant. Default is uniform prior (alpha=1, beta=1).
     *
     * @param {number} experimentId - Experiment ID
     * @param {Array<{id: number, name: string}>} variants - Array of variants
     * @param {object} priors - Optional custom priors per variant: {A: {alpha: 2, beta: 2}, B: {alpha: 1, beta: 1}}
     * @returns {Promise<Array>} Created Bayesian stats records
     */
    async initializeBayesian(experimentId, variants, priors = null) {
        try {
            const records = [];

            for (const variant of variants) {
                // Get priors for this variant (default: uninformative prior)
                const prior = priors?.[variant.name] || { alpha: 1, beta: 1 };

                const result = await query(
                    `INSERT INTO ab_bayesian_stats
                    (experiment_id, variant_id, alpha_prior, beta_prior, alpha_posterior, beta_posterior)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *`,
                    [experimentId, variant.id, prior.alpha, prior.beta, prior.alpha, prior.beta]
                );

                records.push(result.rows[0]);
            }

            logger.info('[BayesianABTest] Initialized Bayesian analysis', {
                experimentId,
                variantCount: variants.length
            });

            return records;
        } catch (error) {
            logger.error('[BayesianABTest] Failed to initialize', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Update posterior distribution after observing a result
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} variantId - Variant ID
     * @param {boolean} success - True if conversion, false if not
     * @returns {Promise<object>} Updated Bayesian stats
     */
    async updatePosterior(experimentId, variantId, success) {
        try {
            // Get current posterior (which becomes the new prior)
            const currentResult = await query(
                `SELECT * FROM ab_bayesian_stats
                 WHERE experiment_id = $1 AND variant_id = $2`,
                [experimentId, variantId]
            );

            if (currentResult.rows.length === 0) {
                throw new Error(`Bayesian stats not found for experiment ${experimentId}, variant ${variantId}`);
            }

            const current = currentResult.rows[0];

            // Update posterior using Bayesian update rule
            const successes = success ? 1 : 0;
            const failures = success ? 0 : 1;

            const { alphaPost, betaPost } = calculateBayesianPosterior(
                successes,
                failures,
                current.alpha_posterior || current.alpha_prior,
                current.beta_posterior || current.beta_prior
            );

            // Save updated posterior
            const updateResult = await query(
                `UPDATE ab_bayesian_stats
                 SET alpha_posterior = $1,
                     beta_posterior = $2,
                     updated_at = NOW()
                 WHERE experiment_id = $3 AND variant_id = $4
                 RETURNING *`,
                [alphaPost, betaPost, experimentId, variantId]
            );

            logger.debug('[BayesianABTest] Updated posterior', {
                experimentId,
                variantId,
                success,
                alphaPost,
                betaPost
            });

            return updateResult.rows[0];
        } catch (error) {
            logger.error('[BayesianABTest] Failed to update posterior', {
                error: error.message,
                experimentId,
                variantId
            });
            throw error;
        }
    }

    /**
     * Calculate probability that each variant is the best
     *
     * Uses Monte Carlo simulation with Beta distribution sampling.
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} samples - Number of Monte Carlo samples (default: 10000)
     * @returns {Promise<Array<{variantId: number, variantName: string, probability: number}>>}
     */
    async calculateProbabilities(experimentId, samples = 10000) {
        try {
            // Get all variants with their posteriors
            const result = await query(
                `SELECT bs.*, v.variant_name
                 FROM ab_bayesian_stats bs
                 JOIN ab_variants v ON v.id = bs.variant_id
                 WHERE bs.experiment_id = $1
                 ORDER BY v.variant_name`,
                [experimentId]
            );

            if (result.rows.length < 2) {
                throw new Error('Need at least 2 variants for Bayesian analysis');
            }

            // Prepare data for probability calculation
            const variants = result.rows.map(row => ({
                id: row.variant_id,
                alphaPost: row.alpha_posterior,
                betaPost: row.beta_posterior
            }));

            // Calculate probabilities
            const probabilities = calculateProbabilityBest(variants, samples);

            // Update database with probabilities
            for (const prob of probabilities) {
                await query(
                    `UPDATE ab_bayesian_stats
                     SET probability_best = $1,
                         updated_at = NOW()
                     WHERE experiment_id = $2 AND variant_id = $3`,
                    [prob.probability, experimentId, prob.id]
                );
            }

            // Return formatted results
            return result.rows.map((row, idx) => ({
                variantId: row.variant_id,
                variantName: row.variant_name,
                probability: probabilities[idx].probability,
                alphaPost: row.alpha_posterior,
                betaPost: row.beta_posterior
            }));
        } catch (error) {
            logger.error('[BayesianABTest] Failed to calculate probabilities', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get credible intervals for all variants
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} confidence - Confidence level (default: 0.95)
     * @returns {Promise<Array>} Credible intervals per variant
     */
    async getCredibleIntervals(experimentId, confidence = 0.95) {
        try {
            const result = await query(
                `SELECT bs.*, v.variant_name
                 FROM ab_bayesian_stats bs
                 JOIN ab_variants v ON v.id = bs.variant_id
                 WHERE bs.experiment_id = $1`,
                [experimentId]
            );

            const intervals = result.rows.map(row => {
                const ci = calculateCredibleInterval(
                    row.alpha_posterior,
                    row.beta_posterior,
                    confidence
                );

                return {
                    variantId: row.variant_id,
                    variantName: row.variant_name,
                    mean: ci.mean,
                    lower: ci.lower,
                    upper: ci.upper,
                    confidence: confidence * 100
                };
            });

            // Update database with credible intervals
            for (const interval of intervals) {
                await query(
                    `UPDATE ab_bayesian_stats
                     SET credible_interval_lower = $1,
                         credible_interval_upper = $2,
                         updated_at = NOW()
                     WHERE experiment_id = $3 AND variant_id = $4`,
                    [interval.lower, interval.upper, experimentId, interval.variantId]
                );
            }

            return intervals;
        } catch (error) {
            logger.error('[BayesianABTest] Failed to get credible intervals', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Calculate expected loss if choosing each variant
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} samples - Monte Carlo samples (default: 10000)
     * @returns {Promise<Array>} Expected loss per variant
     */
    async getExpectedLoss(experimentId, samples = 10000) {
        try {
            const result = await query(
                `SELECT bs.*, v.variant_name
                 FROM ab_bayesian_stats bs
                 JOIN ab_variants v ON v.id = bs.variant_id
                 WHERE bs.experiment_id = $1`,
                [experimentId]
            );

            const variants = result.rows.map(row => ({
                id: row.variant_id,
                alphaPost: row.alpha_posterior,
                betaPost: row.beta_posterior
            }));

            const losses = calculateExpectedLoss(variants, samples);

            // Update database
            for (const loss of losses) {
                await query(
                    `UPDATE ab_bayesian_stats
                     SET expected_loss = $1,
                         updated_at = NOW()
                     WHERE experiment_id = $2 AND variant_id = $3`,
                    [loss.expectedLoss, experimentId, loss.id]
                );
            }

            return result.rows.map((row, idx) => ({
                variantId: row.variant_id,
                variantName: row.variant_name,
                expectedLoss: losses[idx].expectedLoss
            }));
        } catch (error) {
            logger.error('[BayesianABTest] Failed to calculate expected loss', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Determine if experiment should stop based on Bayesian probability threshold
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} threshold - Probability threshold to declare winner (default: 0.95)
     * @param {number} minimumSampleSize - Minimum sample size per variant (default: 100)
     * @returns {Promise<{shouldStop: boolean, winner: number|null, probabilities: Array}>}
     */
    async shouldStopBayesian(experimentId, threshold = 0.95, minimumSampleSize = 100) {
        try {
            // Get current sample sizes
            const sampleResult = await query(
                `SELECT v.id, v.variant_name, COUNT(a.id) as assignment_count
                 FROM ab_variants v
                 LEFT JOIN ab_assignments a ON a.variant_id = v.id
                 WHERE v.experiment_id = $1
                 GROUP BY v.id, v.variant_name`,
                [experimentId]
            );

            // Check minimum sample size
            const minSample = Math.min(...sampleResult.rows.map(r => parseInt(r.assignment_count)));
            if (minSample < minimumSampleSize) {
                return {
                    shouldStop: false,
                    winner: null,
                    reason: `Minimum sample size not met (${minSample} < ${minimumSampleSize})`,
                    probabilities: []
                };
            }

            // Calculate probabilities
            const probabilities = await this.calculateProbabilities(experimentId);

            // Find highest probability
            const maxProb = Math.max(...probabilities.map(p => p.probability));
            const winner = probabilities.find(p => p.probability === maxProb);

            if (maxProb >= threshold) {
                return {
                    shouldStop: true,
                    winner: winner.variantId,
                    reason: `Variant ${winner.variantName} has ${(maxProb * 100).toFixed(1)}% probability of being best (threshold: ${threshold * 100}%)`,
                    probabilities
                };
            }

            return {
                shouldStop: false,
                winner: null,
                reason: `Highest probability is ${(maxProb * 100).toFixed(1)}% (threshold: ${threshold * 100}%)`,
                probabilities
            };
        } catch (error) {
            logger.error('[BayesianABTest] Failed to check stopping condition', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get complete Bayesian analysis results
     *
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<object>} Complete Bayesian analysis
     */
    async getResults(experimentId) {
        try {
            const [probabilities, intervals, losses] = await Promise.all([
                this.calculateProbabilities(experimentId),
                this.getCredibleIntervals(experimentId),
                this.getExpectedLoss(experimentId)
            ]);

            // Combine results
            const results = probabilities.map(prob => {
                const interval = intervals.find(i => i.variantId === prob.variantId);
                const loss = losses.find(l => l.variantId === prob.variantId);

                return {
                    variantId: prob.variantId,
                    variantName: prob.variantName,
                    probabilityBest: prob.probability,
                    credibleInterval: {
                        lower: interval.lower,
                        upper: interval.upper,
                        mean: interval.mean
                    },
                    expectedLoss: loss.expectedLoss,
                    posterior: {
                        alpha: prob.alphaPost,
                        beta: prob.betaPost
                    }
                };
            });

            return {
                variants: results,
                recommendation: this._getRecommendation(results)
            };
        } catch (error) {
            logger.error('[BayesianABTest] Failed to get results', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get recommendation based on Bayesian analysis
     *
     * @private
     * @param {Array} results - Results from getResults
     * @returns {object} Recommendation
     */
    _getRecommendation(results) {
        const best = results.reduce((max, current) =>
            current.probabilityBest > max.probabilityBest ? current : max
        );

        if (best.probabilityBest >= 0.95) {
            return {
                decision: 'declare_winner',
                variant: best.variantName,
                confidence: best.probabilityBest,
                message: `${best.variantName} has ${(best.probabilityBest * 100).toFixed(1)}% probability of being best. Strong evidence to declare winner.`
            };
        } else if (best.probabilityBest >= 0.80) {
            return {
                decision: 'likely_winner',
                variant: best.variantName,
                confidence: best.probabilityBest,
                message: `${best.variantName} has ${(best.probabilityBest * 100).toFixed(1)}% probability of being best. Moderate evidence, consider continuing.`
            };
        } else {
            return {
                decision: 'continue',
                variant: null,
                confidence: best.probabilityBest,
                message: `No clear winner yet (highest probability: ${(best.probabilityBest * 100).toFixed(1)}%). Continue experiment.`
            };
        }
    }
}

// Export singleton instance
const bayesianABTestService = new BayesianABTestService();
module.exports = bayesianABTestService;
