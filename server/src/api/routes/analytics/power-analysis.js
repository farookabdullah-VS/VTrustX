const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const powerAnalysisService = require('../../../services/PowerAnalysisService');
const logger = require('../../../infrastructure/logger');

/**
 * Power Analysis API Routes
 *
 * Endpoints for experiment planning and sample size calculation
 */

/**
 * POST /api/analytics/power-analysis/calculate-sample-size
 * Calculate required sample size for experiment
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
 * POST /api/analytics/power-analysis/power-curve
 * Generate power curve data for visualization
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
 * POST /api/analytics/power-analysis/calculate-mde
 * Calculate minimum detectable effect for given sample size
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
 * POST /api/analytics/power-analysis/estimate-duration
 * Estimate experiment duration based on daily volume
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
 * GET /api/analytics/power-analysis/:id
 * Get power analysis by ID
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
