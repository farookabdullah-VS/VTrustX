const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const {
    calculateSampleSize,
    calculatePower,
    calculateMDE,
    estimateDuration
} = require('../utils/advancedStatistics');

/**
 * Power Analysis Service
 *
 * Helps plan experiments by calculating:
 * - Required sample size for desired power
 * - Statistical power for given sample size
 * - Minimum detectable effect
 * - Estimated experiment duration
 */
class PowerAnalysisService {
    /**
     * Calculate required sample size per variant
     *
     * @param {number} baselineRate - Expected baseline conversion rate (0-1)
     * @param {number} mde - Minimum detectable effect (absolute, e.g., 0.02 for 2% improvement)
     * @param {number} power - Desired statistical power (default: 0.80)
     * @param {number} alpha - Significance level (default: 0.05)
     * @returns {object} Sample size calculation results
     */
    calculateRequiredSampleSize(baselineRate, mde, power = 0.80, alpha = 0.05) {
        try {
            // Validate inputs
            if (baselineRate <= 0 || baselineRate >= 1) {
                throw new Error('Baseline rate must be between 0 and 1');
            }
            if (mde <= 0 || mde >= 1) {
                throw new Error('MDE must be between 0 and 1');
            }
            if (power <= 0 || power >= 1) {
                throw new Error('Power must be between 0 and 1');
            }

            const sampleSizePerVariant = calculateSampleSize(baselineRate, mde, power, alpha);

            // Calculate relative lift
            const relativeLift = (mde / baselineRate) * 100;

            return {
                baselineRate,
                mde,
                relativeLift: parseFloat(relativeLift.toFixed(1)),
                power,
                alpha,
                sampleSizePerVariant,
                totalSampleSize: sampleSizePerVariant * 2  // For 2 variants
            };
        } catch (error) {
            logger.error('[PowerAnalysis] Failed to calculate sample size', {
                error: error.message,
                baselineRate,
                mde
            });
            throw error;
        }
    }

    /**
     * Create and store power analysis for an experiment
     *
     * @param {object} params - Analysis parameters
     * @param {number} params.tenantId - Tenant ID
     * @param {number} params.experimentId - Experiment ID (optional)
     * @param {number} params.baselineRate - Baseline conversion rate
     * @param {number} params.mde - Minimum detectable effect
     * @param {number} params.power - Desired power
     * @param {number} params.alpha - Significance level
     * @param {number} params.variantCount - Number of variants (default: 2)
     * @param {number} params.dailyVolume - Expected daily volume (optional)
     * @returns {Promise<object>} Created power analysis record
     */
    async createPowerAnalysis(params) {
        try {
            const {
                tenantId,
                experimentId = null,
                baselineRate,
                mde,
                power = 0.80,
                alpha = 0.05,
                variantCount = 2,
                dailyVolume = null
            } = params;

            // Calculate required sample size
            const calculation = this.calculateRequiredSampleSize(
                baselineRate,
                mde,
                power,
                alpha
            );

            const totalRequired = calculation.sampleSizePerVariant * variantCount;

            // Estimate duration if daily volume provided
            let estimatedDuration = null;
            if (dailyVolume && dailyVolume > 0) {
                estimatedDuration = estimateDuration(
                    calculation.sampleSizePerVariant,
                    variantCount,
                    dailyVolume
                );
            }

            // Store in database
            const result = await query(
                `INSERT INTO ab_power_analysis
                (tenant_id, experiment_id, baseline_rate, minimum_detectable_effect,
                 desired_power, significance_level, required_sample_size, total_sample_size,
                 estimated_duration_days, daily_volume, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                RETURNING *`,
                [
                    tenantId,
                    experimentId,
                    baselineRate,
                    mde,
                    power,
                    alpha,
                    calculation.sampleSizePerVariant,
                    totalRequired,
                    estimatedDuration,
                    dailyVolume
                ]
            );

            const record = result.rows[0];

            logger.info('[PowerAnalysis] Created power analysis', {
                id: record.id,
                tenantId,
                experimentId,
                sampleSize: calculation.sampleSizePerVariant
            });

            return {
                ...calculation,
                id: record.id,
                variantCount,
                totalRequired,
                estimatedDuration,
                dailyVolume
            };
        } catch (error) {
            logger.error('[PowerAnalysis] Failed to create power analysis', {
                error: error.message,
                params
            });
            throw error;
        }
    }

    /**
     * Get power analysis by ID
     *
     * @param {number} id - Power analysis ID
     * @returns {Promise<object>} Power analysis record
     */
    async getPowerAnalysis(id) {
        try {
            const result = await query(
                'SELECT * FROM ab_power_analysis WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                throw new Error(`Power analysis ${id} not found`);
            }

            const record = result.rows[0];

            return {
                id: record.id,
                experimentId: record.experiment_id,
                baselineRate: parseFloat(record.baseline_rate),
                mde: parseFloat(record.minimum_detectable_effect),
                relativeLift: (parseFloat(record.minimum_detectable_effect) / parseFloat(record.baseline_rate)) * 100,
                power: parseFloat(record.desired_power),
                alpha: parseFloat(record.significance_level),
                sampleSizePerVariant: parseInt(record.required_sample_size),
                totalSampleSize: parseInt(record.total_sample_size),
                estimatedDuration: record.estimated_duration_days ? parseInt(record.estimated_duration_days) : null,
                dailyVolume: record.daily_volume ? parseInt(record.daily_volume) : null,
                createdAt: record.created_at
            };
        } catch (error) {
            logger.error('[PowerAnalysis] Failed to get power analysis', {
                error: error.message,
                id
            });
            throw error;
        }
    }

    /**
     * Calculate MDE for a given sample size
     *
     * @param {number} experimentId - Experiment ID (to get baseline rate)
     * @param {number} plannedSampleSize - Planned sample size per variant
     * @param {number} power - Desired power (default: 0.80)
     * @param {number} alpha - Significance level (default: 0.05)
     * @returns {Promise<object>} MDE calculation
     */
    async calculateMDEForExperiment(experimentId, plannedSampleSize, power = 0.80, alpha = 0.05) {
        try {
            // Get experiment's power analysis or estimate baseline
            const expResult = await query(
                `SELECT e.*, pa.baseline_rate
                 FROM ab_experiments e
                 LEFT JOIN ab_power_analysis pa ON pa.id = e.power_analysis_id
                 WHERE e.id = $1`,
                [experimentId]
            );

            if (expResult.rows.length === 0) {
                throw new Error(`Experiment ${experimentId} not found`);
            }

            let baselineRate = expResult.rows[0].baseline_rate;

            // If no baseline from power analysis, estimate from current results
            if (!baselineRate) {
                const resultsResult = await query(
                    `SELECT
                        COUNT(*) as total,
                        COUNT(CASE WHEN se.event_type = 'completed' THEN 1 END) as conversions
                     FROM ab_assignments a
                     LEFT JOIN survey_events se ON se.unique_id = a.recipient_id
                     WHERE a.experiment_id = $1`,
                    [experimentId]
                );

                const total = parseInt(resultsResult.rows[0].total);
                const conversions = parseInt(resultsResult.rows[0].conversions);

                if (total === 0) {
                    baselineRate = 0.10;  // Default assumption
                } else {
                    baselineRate = conversions / total;
                }
            }

            const mde = calculateMDE(plannedSampleSize, baselineRate, power, alpha);
            const relativeLift = (mde / baselineRate) * 100;

            logger.info('[PowerAnalysis] Calculated MDE', {
                experimentId,
                plannedSampleSize,
                mde,
                relativeLift
            });

            return {
                baselineRate,
                plannedSampleSize,
                mde,
                relativeLift: parseFloat(relativeLift.toFixed(1)),
                power,
                alpha
            };
        } catch (error) {
            logger.error('[PowerAnalysis] Failed to calculate MDE', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Generate power curve (power vs sample size)
     *
     * @param {number} baselineRate - Baseline conversion rate
     * @param {number} mde - Minimum detectable effect
     * @param {number} alpha - Significance level (default: 0.05)
     * @returns {Array} Power curve data points
     */
    generatePowerCurve(baselineRate, mde, alpha = 0.05) {
        try {
            const points = [];

            // Generate points from n=50 to n=5000
            const sampleSizes = [
                50, 100, 150, 200, 300, 400, 500, 750,
                1000, 1500, 2000, 3000, 4000, 5000
            ];

            for (const n of sampleSizes) {
                const power = calculatePower(n, baselineRate, mde, alpha);
                points.push({
                    sampleSize: n,
                    power: parseFloat(power.toFixed(4))
                });
            }

            return points;
        } catch (error) {
            logger.error('[PowerAnalysis] Failed to generate power curve', {
                error: error.message,
                baselineRate,
                mde
            });
            throw error;
        }
    }

    /**
     * Estimate duration for an experiment
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} dailyVolume - Expected daily volume
     * @returns {Promise<object>} Duration estimate
     */
    async estimateDurationForExperiment(experimentId, dailyVolume) {
        try {
            // Get power analysis
            const expResult = await query(
                `SELECT e.*, pa.*
                 FROM ab_experiments e
                 LEFT JOIN ab_power_analysis pa ON pa.id = e.power_analysis_id
                 WHERE e.id = $1`,
                [experimentId]
            );

            if (expResult.rows.length === 0) {
                throw new Error(`Experiment ${experimentId} not found`);
            }

            const exp = expResult.rows[0];
            const sampleSize = exp.required_sample_size;
            const variantCount = await this._getVariantCount(experimentId);

            if (!sampleSize) {
                throw new Error('Power analysis not found for experiment');
            }

            const duration = estimateDuration(sampleSize, variantCount, dailyVolume);

            // Update power analysis record
            if (exp.power_analysis_id) {
                await query(
                    `UPDATE ab_power_analysis
                     SET daily_volume = $1,
                         estimated_duration_days = $2
                     WHERE id = $3`,
                    [dailyVolume, duration, exp.power_analysis_id]
                );
            }

            logger.info('[PowerAnalysis] Estimated duration', {
                experimentId,
                dailyVolume,
                duration
            });

            return {
                sampleSizePerVariant: sampleSize,
                variantCount,
                totalRequired: sampleSize * variantCount,
                dailyVolume,
                estimatedDays: duration,
                estimatedWeeks: parseFloat((duration / 7).toFixed(1))
            };
        } catch (error) {
            logger.error('[PowerAnalysis] Failed to estimate duration', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Get variant count for experiment
     *
     * @private
     * @param {number} experimentId - Experiment ID
     * @returns {Promise<number>} Variant count
     */
    async _getVariantCount(experimentId) {
        const result = await query(
            'SELECT COUNT(*) as count FROM ab_variants WHERE experiment_id = $1',
            [experimentId]
        );
        return parseInt(result.rows[0].count);
    }

    /**
     * Get recommendations based on power analysis
     *
     * @param {object} analysis - Power analysis results
     * @returns {object} Recommendations
     */
    getRecommendations(analysis) {
        const recommendations = [];

        // Sample size recommendations
        if (analysis.sampleSizePerVariant > 5000) {
            recommendations.push({
                type: 'warning',
                message: 'Large sample size required. Consider increasing MDE or decreasing power.'
            });
        }

        // Duration recommendations
        if (analysis.estimatedDuration && analysis.estimatedDuration > 30) {
            recommendations.push({
                type: 'warning',
                message: `Long experiment duration (${analysis.estimatedDuration} days). Consider increasing daily volume or MDE.`
            });
        }

        // Power recommendations
        if (analysis.power < 0.80) {
            recommendations.push({
                type: 'error',
                message: 'Power below 80%. Increase sample size to reduce false negatives.'
            });
        }

        // MDE recommendations
        if (analysis.relativeLift && analysis.relativeLift < 10) {
            recommendations.push({
                type: 'info',
                message: `Detecting small effect (${analysis.relativeLift}% lift) requires large sample.`
            });
        }

        return {
            recommendations,
            summary: this._generateSummary(analysis, recommendations)
        };
    }

    /**
     * Generate summary text
     *
     * @private
     * @param {object} analysis - Analysis results
     * @param {Array} recommendations - Recommendations
     * @returns {string} Summary
     */
    _generateSummary(analysis, recommendations) {
        const hasWarnings = recommendations.some(r => r.type === 'warning' || r.type === 'error');

        if (hasWarnings) {
            return `Need ${analysis.sampleSizePerVariant} samples per variant. Review warnings before starting.`;
        }

        if (analysis.estimatedDuration) {
            return `Need ${analysis.sampleSizePerVariant} samples per variant (≈${analysis.estimatedDuration} days at ${analysis.dailyVolume}/day). Ready to start!`;
        }

        return `Need ${analysis.sampleSizePerVariant} samples per variant to detect ${analysis.relativeLift}% lift with ${analysis.power * 100}% power.`;
    }
}

// Export singleton instance
const powerAnalysisService = new PowerAnalysisService();
module.exports = powerAnalysisService;
