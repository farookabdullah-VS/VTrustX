const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const powerAnalysisService = require('../../../services/PowerAnalysisService');
const logger = require('../../../infrastructure/logger');

/**
 * Power Analysis API Routes
 *
 * Endpoints for experiment planning and sample size calculation
 */

/**
 * @swagger
 * /api/analytics/power-analysis/calculate-sample-size:
 *   post:
 *     tags: [Analytics - Power Analysis]
 *     summary: Calculate required sample size
 *     description: Calculates the minimum sample size per variant needed to detect a given minimum detectable effect (MDE) at the specified statistical power and significance level.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [baselineRate, mde]
 *             properties:
 *               baselineRate:
 *                 type: number
 *                 description: Current baseline conversion/metric rate (0–1)
 *               mde:
 *                 type: number
 *                 description: Minimum detectable effect as a relative change (0–1)
 *               power:
 *                 type: number
 *                 default: 0.80
 *                 description: Statistical power (1 - beta), typically 0.80
 *               alpha:
 *                 type: number
 *                 default: 0.05
 *                 description: Significance level, typically 0.05
 *     responses:
 *       200:
 *         description: Required sample size calculation results
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/calculate-sample-size', authenticate, async (req, res) => {
    try {
        const { baselineRate, mde, power = 0.80, alpha = 0.05 } = req.body;

        // Validate required fields
        if (!baselineRate || !mde) {
            return res.status(400).json({
                error: 'Missing required fields: baselineRate, mde'
            });
        }

        // Calculate sample size
        const results = powerAnalysisService.calculateRequiredSampleSize(
            baselineRate,
            mde,
            power,
            alpha
        );

        res.json(results);
    } catch (error) {
        logger.error('[PowerAnalysisAPI] Calculate sample size failed', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/analytics/power-analysis/power-curve:
 *   post:
 *     tags: [Analytics - Power Analysis]
 *     summary: Generate power curve data
 *     description: Generates a series of (sample-size, power) data points across a range of sample sizes for visualization of the power curve.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [baselineRate, mde]
 *             properties:
 *               baselineRate:
 *                 type: number
 *                 description: Current baseline conversion/metric rate (0–1)
 *               mde:
 *                 type: number
 *                 description: Minimum detectable effect as a relative change (0–1)
 *               alpha:
 *                 type: number
 *                 default: 0.05
 *                 description: Significance level, typically 0.05
 *     responses:
 *       200:
 *         description: Power curve data points
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 points:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/power-curve', authenticate, async (req, res) => {
    try {
        const { baselineRate, mde, alpha = 0.05 } = req.body;

        // Validate required fields
        if (!baselineRate || !mde) {
            return res.status(400).json({
                error: 'Missing required fields: baselineRate, mde'
            });
        }

        // Generate power curve
        const points = powerAnalysisService.generatePowerCurve(
            baselineRate,
            mde,
            alpha
        );

        res.json({ points });
    } catch (error) {
        logger.error('[PowerAnalysisAPI] Generate power curve failed', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/analytics/power-analysis/calculate-mde:
 *   post:
 *     tags: [Analytics - Power Analysis]
 *     summary: Calculate minimum detectable effect
 *     description: Calculates the minimum detectable effect for an existing experiment given a planned sample size, using historical baseline data from the experiment.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [experimentId, plannedSampleSize]
 *             properties:
 *               experimentId:
 *                 type: string
 *                 description: Existing experiment ID to derive baseline from
 *               plannedSampleSize:
 *                 type: integer
 *                 description: Planned sample size per variant
 *               power:
 *                 type: number
 *                 default: 0.80
 *               alpha:
 *                 type: number
 *                 default: 0.05
 *     responses:
 *       200:
 *         description: MDE calculation results
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/calculate-mde', authenticate, async (req, res) => {
    try {
        const { experimentId, plannedSampleSize, power = 0.80, alpha = 0.05 } = req.body;

        // Validate required fields
        if (!experimentId || !plannedSampleSize) {
            return res.status(400).json({
                error: 'Missing required fields: experimentId, plannedSampleSize'
            });
        }

        // Calculate MDE
        const results = await powerAnalysisService.calculateMDEForExperiment(
            experimentId,
            plannedSampleSize,
            power,
            alpha
        );

        res.json(results);
    } catch (error) {
        logger.error('[PowerAnalysisAPI] Calculate MDE failed', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/analytics/power-analysis/estimate-duration:
 *   post:
 *     tags: [Analytics - Power Analysis]
 *     summary: Estimate experiment duration
 *     description: Estimates the number of days needed to reach the required sample size for an experiment, based on the expected daily traffic volume.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [experimentId, dailyVolume]
 *             properties:
 *               experimentId:
 *                 type: string
 *                 description: Experiment ID
 *               dailyVolume:
 *                 type: integer
 *                 description: Expected daily number of participants across all variants
 *     responses:
 *       200:
 *         description: Duration estimate results
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/estimate-duration', authenticate, async (req, res) => {
    try {
        const { experimentId, dailyVolume } = req.body;

        // Validate required fields
        if (!experimentId || !dailyVolume) {
            return res.status(400).json({
                error: 'Missing required fields: experimentId, dailyVolume'
            });
        }

        // Estimate duration
        const results = await powerAnalysisService.estimateDurationForExperiment(
            experimentId,
            dailyVolume
        );

        res.json(results);
    } catch (error) {
        logger.error('[PowerAnalysisAPI] Estimate duration failed', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/analytics/power-analysis/{id}:
 *   get:
 *     tags: [Analytics - Power Analysis]
 *     summary: Get power analysis by ID
 *     description: Retrieves a previously saved power analysis record by its numeric ID.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Power analysis record ID
 *     responses:
 *       200:
 *         description: Power analysis record
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const results = await powerAnalysisService.getPowerAnalysis(parseInt(id));

        res.json(results);
    } catch (error) {
        logger.error('[PowerAnalysisAPI] Get power analysis failed', {
            error: error.message,
            id: req.params.id
        });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
