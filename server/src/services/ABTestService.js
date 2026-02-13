const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const {
    chiSquareTest,
    confidenceInterval,
    calculateLift,
    determineWinner,
    calculateSampleSize,
    bayesianProbability
} = require('../utils/statistics');

/**
 * A/B Testing Service
 *
 * Handles experiment creation, variant assignment, result calculation,
 * and statistical analysis for campaign optimization.
 */
class ABTestService {
    /**
     * Create a new A/B test experiment with variants
     *
     * @param {number} tenantId - Tenant ID
     * @param {object} experimentData - Experiment configuration
     * @param {array} variants - Array of variant definitions
     * @returns {object} - Created experiment with variants
     */
    async createExperiment(tenantId, experimentData, variants) {
        try {
            const {
                name,
                description,
                formId,
                channel,
                trafficAllocation = {},
                successMetric = 'response_rate',
                minimumSampleSize = 100,
                confidenceLevel = 95.00
            } = experimentData;

            // Validate variants
            if (!variants || variants.length < 2) {
                throw new Error('Need at least 2 variants for A/B test');
            }

            // Validate traffic allocation adds up to 100
            const totalAllocation = Object.values(trafficAllocation).reduce((sum, val) => sum + val, 0);
            if (Math.abs(totalAllocation - 100) > 0.01) {
                throw new Error(`Traffic allocation must sum to 100% (got ${totalAllocation}%)`);
            }

            // Create experiment
            const expResult = await query(
                `INSERT INTO ab_experiments
                (tenant_id, name, description, form_id, channel, status, traffic_allocation,
                 success_metric, minimum_sample_size, confidence_level, created_by)
                VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    tenantId,
                    name,
                    description || null,
                    formId || null,
                    channel,
                    JSON.stringify(trafficAllocation),
                    successMetric,
                    minimumSampleSize,
                    confidenceLevel,
                    null // created_by - TODO: get from req.user
                ]
            );

            const experiment = expResult.rows[0];

            // Create variants
            const createdVariants = [];
            for (const variant of variants) {
                const varResult = await query(
                    `INSERT INTO ab_variants
                    (experiment_id, variant_name, subject, body, media_attachments, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *`,
                    [
                        experiment.id,
                        variant.name,
                        variant.subject || null,
                        variant.body,
                        JSON.stringify(variant.mediaAttachments || []),
                        JSON.stringify(variant.metadata || {})
                    ]
                );
                createdVariants.push(varResult.rows[0]);
            }

            logger.info('[ABTestService] Experiment created', {
                experimentId: experiment.id,
                tenantId,
                variantCount: createdVariants.length
            });

            return {
                experiment,
                variants: createdVariants
            };
        } catch (error) {
            logger.error('[ABTestService] Failed to create experiment', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Assign variant to recipient using weighted random allocation
     *
     * @param {number} experimentId - Experiment ID
     * @param {string} recipientId - Recipient identifier (email or phone)
     * @param {string} recipientName - Recipient name (optional)
     * @returns {object} - Assigned variant
     */
    async assignVariant(experimentId, recipientId, recipientName = null) {
        try {
            // Check if recipient already assigned
            const existingResult = await query(
                'SELECT * FROM ab_assignments WHERE experiment_id = $1 AND recipient_id = $2',
                [experimentId, recipientId]
            );

            if (existingResult.rows.length > 0) {
                // Return existing assignment
                const assignment = existingResult.rows[0];
                const variantResult = await query(
                    'SELECT * FROM ab_variants WHERE id = $1',
                    [assignment.variant_id]
                );
                return variantResult.rows[0];
            }

            // Get experiment and variants
            const expResult = await query(
                `SELECT e.*, json_agg(v.*) as variants
                 FROM ab_experiments e
                 JOIN ab_variants v ON v.experiment_id = e.id
                 WHERE e.id = $1
                 GROUP BY e.id`,
                [experimentId]
            );

            if (expResult.rows.length === 0) {
                throw new Error(`Experiment ${experimentId} not found`);
            }

            const experiment = expResult.rows[0];
            const variants = experiment.variants;

            // Weighted random selection
            const allocation = experiment.traffic_allocation;
            const selectedVariant = this.weightedRandomSelection(variants, allocation);

            // Create assignment
            await query(
                `INSERT INTO ab_assignments
                (experiment_id, variant_id, recipient_id, recipient_name, assigned_at)
                VALUES ($1, $2, $3, $4, NOW())`,
                [experimentId, selectedVariant.id, recipientId, recipientName]
            );

            logger.info('[ABTestService] Variant assigned', {
                experimentId,
                variantId: selectedVariant.id,
                variantName: selectedVariant.variant_name,
                recipientId
            });

            return selectedVariant;
        } catch (error) {
            logger.error('[ABTestService] Failed to assign variant', {
                error: error.message,
                experimentId,
                recipientId
            });
            throw error;
        }
    }

    /**
     * Weighted random selection of variant based on traffic allocation
     *
     * @param {array} variants - Array of variant objects
     * @param {object} allocation - Traffic allocation: {"A": 50, "B": 30, "C": 20}
     * @returns {object} - Selected variant
     */
    weightedRandomSelection(variants, allocation) {
        // Build cumulative weights
        const weights = [];
        let cumulative = 0;

        for (const variant of variants) {
            const weight = allocation[variant.variant_name] || 0;
            cumulative += weight;
            weights.push({ variant, cumulative });
        }

        // Random selection
        const random = Math.random() * cumulative;

        for (const { variant, cumulative } of weights) {
            if (random <= cumulative) {
                return variant;
            }
        }

        // Fallback to first variant
        return variants[0];
    }

    /**
     * Calculate results for experiment
     *
     * @param {number} experimentId - Experiment ID
     * @returns {object} - Results with metrics per variant
     */
    async calculateResults(experimentId) {
        try {
            // Get experiment details
            const expResult = await query(
                'SELECT * FROM ab_experiments WHERE id = $1',
                [experimentId]
            );

            if (expResult.rows.length === 0) {
                throw new Error(`Experiment ${experimentId} not found`);
            }

            const experiment = expResult.rows[0];
            const channel = experiment.channel;
            const successMetric = experiment.success_metric;

            // Get variants with assignment counts
            const variantsResult = await query(
                `SELECT v.*, COUNT(a.id) as assignment_count
                 FROM ab_variants v
                 LEFT JOIN ab_assignments a ON a.variant_id = v.id
                 WHERE v.experiment_id = $1
                 GROUP BY v.id
                 ORDER BY v.variant_name`,
                [experimentId]
            );

            const variants = variantsResult.rows;

            // Calculate metrics per variant
            const variantMetrics = [];

            for (const variant of variants) {
                const metrics = await this.calculateVariantMetrics(
                    variant.id,
                    channel,
                    successMetric
                );

                variantMetrics.push({
                    variantId: variant.id,
                    variantName: variant.variant_name,
                    assignmentCount: parseInt(variant.assignment_count) || 0,
                    ...metrics
                });
            }

            // Calculate statistical significance
            const comparison = this.compareVariants(variantMetrics, successMetric);

            return {
                experimentId,
                experiment: {
                    name: experiment.name,
                    status: experiment.status,
                    channel: experiment.channel,
                    successMetric: experiment.success_metric,
                    confidenceLevel: parseFloat(experiment.confidence_level)
                },
                variants: variantMetrics,
                comparison
            };
        } catch (error) {
            logger.error('[ABTestService] Failed to calculate results', {
                error: error.message,
                experimentId
            });
            throw error;
        }
    }

    /**
     * Calculate metrics for a single variant
     *
     * @param {number} variantId - Variant ID
     * @param {string} channel - Channel type (email, sms, whatsapp)
     * @param {string} successMetric - Success metric to calculate
     * @returns {object} - Metrics for variant
     */
    async calculateVariantMetrics(variantId, channel, successMetric) {
        // Get distribution_id for this variant
        const variantResult = await query(
            'SELECT distribution_id FROM ab_variants WHERE id = $1',
            [variantId]
        );

        const distributionId = variantResult.rows[0]?.distribution_id;

        if (!distributionId) {
            return {
                sent: 0,
                delivered: 0,
                opened: 0,
                clicked: 0,
                responses: 0,
                deliveryRate: 0,
                openRate: 0,
                clickRate: 0,
                responseRate: 0
            };
        }

        // Get message stats based on channel
        let messageStats = {};

        if (channel === 'email') {
            const result = await query(
                `SELECT
                    COUNT(*) as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'opened') as opened,
                    COUNT(*) FILTER (WHERE status = 'clicked') as clicked
                 FROM email_messages
                 WHERE distribution_id = $1`,
                [distributionId]
            );
            messageStats = result.rows[0];
        } else if (channel === 'sms') {
            const result = await query(
                `SELECT
                    COUNT(*) as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered
                 FROM sms_messages
                 WHERE distribution_id = $1`,
                [distributionId]
            );
            messageStats = result.rows[0];
        } else if (channel === 'whatsapp') {
            const result = await query(
                `SELECT
                    COUNT(*) as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'read') as read
                 FROM whatsapp_messages
                 WHERE distribution_id = $1`,
                [distributionId]
            );
            messageStats = result.rows[0];
        }

        // Get response count (survey submissions)
        // Match by unique_id from survey_events or submissions
        const responseResult = await query(
            `SELECT COUNT(DISTINCT unique_id) as response_count
             FROM survey_events
             WHERE distribution_id = $1 AND event_type = 'completed'`,
            [distributionId]
        );

        const responseCount = parseInt(responseResult.rows[0]?.response_count) || 0;

        // Calculate rates
        const sent = parseInt(messageStats.sent) || 0;
        const delivered = parseInt(messageStats.delivered) || 0;
        const opened = parseInt(messageStats.opened) || 0;
        const clicked = parseInt(messageStats.clicked) || 0;

        const deliveryRate = sent > 0 ? (delivered / sent) : 0;
        const openRate = delivered > 0 ? (opened / delivered) : 0;
        const clickRate = opened > 0 ? (clicked / opened) : 0;
        const responseRate = delivered > 0 ? (responseCount / delivered) : 0;

        return {
            sent,
            delivered,
            opened,
            clicked,
            responses: responseCount,
            deliveryRate: parseFloat((deliveryRate * 100).toFixed(2)),
            openRate: parseFloat((openRate * 100).toFixed(2)),
            clickRate: parseFloat((clickRate * 100).toFixed(2)),
            responseRate: parseFloat((responseRate * 100).toFixed(2))
        };
    }

    /**
     * Compare variants and determine statistical significance
     *
     * @param {array} variantMetrics - Array of variant metrics
     * @param {string} successMetric - Metric to compare
     * @returns {object} - Comparison results
     */
    compareVariants(variantMetrics, successMetric) {
        if (variantMetrics.length < 2) {
            return {
                winner: null,
                significant: false,
                message: 'Need at least 2 variants to compare'
            };
        }

        // Map success metric to conversions
        const getConversions = (metrics) => {
            switch (successMetric) {
                case 'delivery_rate':
                    return { conversions: metrics.delivered, total: metrics.sent };
                case 'open_rate':
                    return { conversions: metrics.opened, total: metrics.delivered };
                case 'click_rate':
                    return { conversions: metrics.clicked, total: metrics.opened };
                case 'response_rate':
                default:
                    return { conversions: metrics.responses, total: metrics.delivered };
            }
        };

        // Prepare variants for winner determination
        const variants = variantMetrics.map(v => {
            const conv = getConversions(v);
            return {
                id: v.variantId,
                name: v.variantName,
                conversions: conv.conversions,
                total: conv.total
            };
        });

        // Determine winner
        const result = determineWinner(variants, 0.95);

        // Add additional statistics
        if (variants.length === 2) {
            const [variantA, variantB] = variants;

            // Chi-square test
            const chiTest = chiSquareTest(
                { conversions: variantA.conversions, total: variantA.total },
                { conversions: variantB.conversions, total: variantB.total }
            );

            // Confidence intervals
            const ciA = confidenceInterval(
                variantA.conversions / (variantA.total || 1),
                variantA.total,
                0.95
            );

            const ciB = confidenceInterval(
                variantB.conversions / (variantB.total || 1),
                variantB.total,
                0.95
            );

            // Bayesian probability
            const bayesProb = bayesianProbability(variantA, variantB);

            result.statistics = {
                chiSquare: chiTest.chiSquare,
                pValue: chiTest.pValue,
                confidenceIntervals: {
                    [variantA.name]: {
                        lower: (ciA.lower * 100).toFixed(2) + '%',
                        upper: (ciA.upper * 100).toFixed(2) + '%'
                    },
                    [variantB.name]: {
                        lower: (ciB.lower * 100).toFixed(2) + '%',
                        upper: (ciB.upper * 100).toFixed(2) + '%'
                    }
                },
                bayesianProbability: {
                    message: `${(bayesProb * 100).toFixed(1)}% probability that ${variantA.name} is better than ${variantB.name}`,
                    probability: bayesProb
                }
            };
        }

        return result;
    }

    /**
     * Start experiment (change status to running)
     *
     * @param {number} experimentId - Experiment ID
     * @returns {object} - Updated experiment
     */
    async startExperiment(experimentId) {
        const result = await query(
            `UPDATE ab_experiments
             SET status = 'running', started_at = NOW(), updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [experimentId]
        );

        logger.info('[ABTestService] Experiment started', { experimentId });
        return result.rows[0];
    }

    /**
     * Pause experiment
     *
     * @param {number} experimentId - Experiment ID
     * @returns {object} - Updated experiment
     */
    async pauseExperiment(experimentId) {
        const result = await query(
            `UPDATE ab_experiments
             SET status = 'paused', updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [experimentId]
        );

        logger.info('[ABTestService] Experiment paused', { experimentId });
        return result.rows[0];
    }

    /**
     * Complete experiment and set winner
     *
     * @param {number} experimentId - Experiment ID
     * @param {number} winningVariantId - Winning variant ID (optional)
     * @returns {object} - Updated experiment
     */
    async completeExperiment(experimentId, winningVariantId = null) {
        const result = await query(
            `UPDATE ab_experiments
             SET status = 'completed', ended_at = NOW(), winning_variant_id = $2, updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [experimentId, winningVariantId]
        );

        logger.info('[ABTestService] Experiment completed', {
            experimentId,
            winningVariantId
        });

        return result.rows[0];
    }

    /**
     * Check if experiment should auto-stop (winner determined with confidence)
     *
     * @param {number} experimentId - Experiment ID
     * @returns {object} - { shouldStop, winner, reason }
     */
    async checkAndStopExperiment(experimentId) {
        const results = await this.calculateResults(experimentId);

        if (results.comparison.significant && results.comparison.winner) {
            // Auto-complete experiment
            await this.completeExperiment(experimentId, results.comparison.winner);

            return {
                shouldStop: true,
                winner: results.comparison.winner,
                reason: results.comparison.reason
            };
        }

        return {
            shouldStop: false,
            winner: null,
            reason: 'No statistically significant winner yet'
        };
    }

    /**
     * Get experiment by ID
     *
     * @param {number} experimentId - Experiment ID
     * @returns {object} - Experiment with variants
     */
    async getExperiment(experimentId) {
        const expResult = await query(
            'SELECT * FROM ab_experiments WHERE id = $1',
            [experimentId]
        );

        if (expResult.rows.length === 0) {
            return null;
        }

        const experiment = expResult.rows[0];

        const variantsResult = await query(
            'SELECT * FROM ab_variants WHERE experiment_id = $1 ORDER BY variant_name',
            [experimentId]
        );

        return {
            ...experiment,
            variants: variantsResult.rows
        };
    }

    /**
     * List experiments for tenant
     *
     * @param {number} tenantId - Tenant ID
     * @param {object} filters - Filters (status, channel)
     * @returns {array} - Array of experiments
     */
    async listExperiments(tenantId, filters = {}) {
        let queryText = `
            SELECT e.*, COUNT(DISTINCT a.id) as total_assignments
            FROM ab_experiments e
            LEFT JOIN ab_assignments a ON a.experiment_id = e.id
            WHERE e.tenant_id = $1
        `;

        const params = [tenantId];
        let paramIndex = 2;

        if (filters.status) {
            queryText += ` AND e.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.channel) {
            queryText += ` AND e.channel = $${paramIndex}`;
            params.push(filters.channel);
            paramIndex++;
        }

        queryText += ' GROUP BY e.id ORDER BY e.created_at DESC';

        const result = await query(queryText, params);
        return result.rows;
    }
}

// Export singleton instance
const abTestService = new ABTestService();
module.exports = abTestService;
