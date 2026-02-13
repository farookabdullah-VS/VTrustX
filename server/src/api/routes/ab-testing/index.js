const express = require('express');
const router = express.Router();
const ABTestService = require('../../../services/ABTestService');
const logger = require('../../../infrastructure/logger');

/**
 * @swagger
 * /api/ab-tests:
 *   post:
 *     summary: Create a new A/B test experiment
 *     tags: [A/B Testing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - channel
 *               - trafficAllocation
 *               - variants
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               formId:
 *                 type: integer
 *               channel:
 *                 type: string
 *                 enum: [email, sms, whatsapp]
 *               trafficAllocation:
 *                 type: object
 *                 example: {"A": 50, "B": 50}
 *               successMetric:
 *                 type: string
 *                 enum: [delivery_rate, open_rate, click_rate, response_rate]
 *                 default: response_rate
 *               minimumSampleSize:
 *                 type: integer
 *                 default: 100
 *               confidenceLevel:
 *                 type: number
 *                 default: 95.00
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     body:
 *                       type: string
 *                     mediaAttachments:
 *                       type: array
 *     responses:
 *       201:
 *         description: Experiment created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 1;
        const { name, description, formId, channel, trafficAllocation, successMetric, minimumSampleSize, confidenceLevel, variants } = req.body;

        // Validation
        if (!name || !channel || !trafficAllocation || !variants) {
            return res.status(400).json({
                error: 'Missing required fields: name, channel, trafficAllocation, variants'
            });
        }

        if (variants.length < 2) {
            return res.status(400).json({
                error: 'Need at least 2 variants for A/B test'
            });
        }

        // Create experiment
        const result = await ABTestService.createExperiment(
            tenantId,
            { name, description, formId, channel, trafficAllocation, successMetric, minimumSampleSize, confidenceLevel },
            variants
        );

        res.status(201).json(result);
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to create experiment', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/ab-tests:
 *   get:
 *     summary: List all experiments for tenant
 *     tags: [A/B Testing]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, running, paused, completed]
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [email, sms, whatsapp]
 *     responses:
 *       200:
 *         description: List of experiments
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || 1;
        const { status, channel } = req.query;

        const experiments = await ABTestService.listExperiments(tenantId, { status, channel });

        res.json(experiments);
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to list experiments', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/ab-tests/{id}:
 *   get:
 *     summary: Get experiment by ID
 *     tags: [A/B Testing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Experiment details
 *       404:
 *         description: Experiment not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const experiment = await ABTestService.getExperiment(id);

        if (!experiment) {
            return res.status(404).json({ error: 'Experiment not found' });
        }

        res.json(experiment);
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to get experiment', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/ab-tests/{id}/results:
 *   get:
 *     summary: Get experiment results with statistical analysis
 *     tags: [A/B Testing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Experiment results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 experimentId:
 *                   type: integer
 *                 experiment:
 *                   type: object
 *                 variants:
 *                   type: array
 *                 comparison:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get('/:id/results', async (req, res) => {
    try {
        const { id } = req.params;

        const results = await ABTestService.calculateResults(id);

        res.json(results);
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to get results', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/ab-tests/{id}/start:
 *   post:
 *     summary: Start experiment (change status to running)
 *     tags: [A/B Testing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Experiment started
 *       500:
 *         description: Server error
 */
router.post('/:id/start', async (req, res) => {
    try {
        const { id } = req.params;

        const experiment = await ABTestService.startExperiment(id);

        res.json({
            message: 'Experiment started successfully',
            experiment
        });
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to start experiment', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/ab-tests/{id}/pause:
 *   post:
 *     summary: Pause experiment
 *     tags: [A/B Testing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Experiment paused
 *       500:
 *         description: Server error
 */
router.post('/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;

        const experiment = await ABTestService.pauseExperiment(id);

        res.json({
            message: 'Experiment paused successfully',
            experiment
        });
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to pause experiment', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/ab-tests/{id}/complete:
 *   post:
 *     summary: Complete experiment and optionally set winner
 *     tags: [A/B Testing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               winningVariantId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Experiment completed
 *       500:
 *         description: Server error
 */
router.post('/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { winningVariantId } = req.body;

        const experiment = await ABTestService.completeExperiment(id, winningVariantId);

        res.json({
            message: 'Experiment completed successfully',
            experiment
        });
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to complete experiment', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/ab-tests/{id}/apply-winner:
 *   post:
 *     summary: Apply winning variant (create distribution with winning content)
 *     tags: [A/B Testing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Winner applied
 *       404:
 *         description: Experiment or winner not found
 *       500:
 *         description: Server error
 */
router.post('/:id/apply-winner', async (req, res) => {
    try {
        const { id } = req.params;

        const experiment = await ABTestService.getExperiment(id);

        if (!experiment) {
            return res.status(404).json({ error: 'Experiment not found' });
        }

        if (!experiment.winning_variant_id) {
            return res.status(400).json({ error: 'No winning variant set' });
        }

        // Get winning variant
        const winningVariant = experiment.variants.find(v => v.id === experiment.winning_variant_id);

        if (!winningVariant) {
            return res.status(404).json({ error: 'Winning variant not found' });
        }

        // Return winning variant details for manual distribution creation
        // (Or automatically create distribution - depending on requirements)
        res.json({
            message: 'Use this winning variant for future distributions',
            experiment: {
                id: experiment.id,
                name: experiment.name
            },
            winningVariant: {
                id: winningVariant.id,
                name: winningVariant.variant_name,
                subject: winningVariant.subject,
                body: winningVariant.body,
                mediaAttachments: winningVariant.media_attachments
            }
        });
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to apply winner', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/ab-tests/{id}/check-winner:
 *   post:
 *     summary: Check if experiment has a statistically significant winner
 *     tags: [A/B Testing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Winner check result
 *       500:
 *         description: Server error
 */
router.post('/:id/check-winner', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await ABTestService.checkAndStopExperiment(id);

        res.json(result);
    } catch (error) {
        logger.error('[ABTestRoutes] Failed to check winner', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
