const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const authenticate = require('../../middleware/auth');
const logger = require('../../../infrastructure/logger');
const validate = require('../../middleware/validate');
const { createWorkflowSchema } = require('../../schemas/workflows.schemas');

// In-Memory Workflow Store (Mock DB)
let workflows = [
    {
        id: 'wf-1',
        name: 'Detractor Alert',
        trigger: { type: 'survey_response', condition: 'nps <= 6' },
        actions: [
            { type: 'email', target: 'manager@company.com', subject: 'Detractor Alert', body: 'A customer just gave a low score.' },
            { type: 'ticket', priority: 'high', subject: 'Follow up with Detractor' }
        ],
        active: true,
        stats: { runs: 45, lastRun: new Date() }
    },
    {
        id: 'wf-2',
        name: 'Auto-Thank Promoter',
        trigger: { type: 'survey_response', condition: 'nps >= 9' },
        actions: [
            { type: 'email_respondent', subject: 'Thanks for the love!', body: 'We are thrilled you are happy...' }
        ],
        active: true,
        stats: { runs: 120, lastRun: new Date() }
    }
];

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     summary: List workflows
 *     description: Returns all configured workflows including their triggers, actions, and run statistics.
 *     tags: [Workflows]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of workflows
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   trigger:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       condition:
 *                         type: string
 *                   actions:
 *                     type: array
 *                     items:
 *                       type: object
 *                   active:
 *                     type: boolean
 *                   stats:
 *                     type: object
 *                     properties:
 *                       runs:
 *                         type: integer
 *                       lastRun:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, (req, res) => {
    res.json(workflows);
});

/**
 * @swagger
 * /api/workflows:
 *   post:
 *     summary: Create workflow
 *     description: Creates a new workflow with the specified trigger, actions, and configuration. Validates input against the workflow schema.
 *     tags: [Workflows]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, trigger_event, actions]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               trigger_event:
 *                 type: string
 *               conditions:
 *                 type: array
 *                 items:
 *                   type: object
 *                 nullable: true
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *                 minItems: 1
 *               formId:
 *                 type: integer
 *                 nullable: true
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Workflow created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 active:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, validate(createWorkflowSchema), (req, res) => {
    const newWf = { id: `wf-${Date.now()}`, ...req.body, stats: { runs: 0, lastRun: null }, active: true };
    workflows.push(newWf);
    res.json(newWf);
});

const workflowEngine = require('../../../core/workflowEngine');

/**
 * @swagger
 * /api/workflows/{id}/run:
 *   post:
 *     summary: Run workflow manually
 *     description: Manually triggers a workflow by ID using a mock submission for testing purposes. Increments the workflow run counter.
 *     tags: [Workflows]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The workflow ID to trigger
 *     responses:
 *       200:
 *         description: Workflow triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Triggered
 *                 workflow:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workflow not found
 */
router.post('/:id/run', authenticate, async (req, res) => {
    const wf = workflows.find(w => w.id === req.params.id);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });

    // Update stats
    wf.stats.runs++;
    wf.stats.lastRun = new Date();

    // Trigger Core Engine (Mocked Submission)
    const mockSubmission = {
        id: 'test-' + Date.now(),
        data: { nps: 5, email: 'test_customer@example.com', name: 'Test Customer' },
        metadata: { tenant_id: 'default' }
    };

    logger.info(`Manually triggering workflow`, { name: wf.name, id: wf.id });

    // In a real app we'd filter actions, but here we'll let core engine handle it 
    // or simulate the custom actions locally.
    if (wf.actions[0].type === 'ticket') {
        // Force the engine to see the formId this workflow belongs to (mocking form-1)
        await workflowEngine.processSubmission('form-1', mockSubmission);
    }

    res.json({ status: 'Triggered', workflow: wf });
});

module.exports = router;
