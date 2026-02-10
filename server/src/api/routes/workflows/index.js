const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');

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

// GET /workflows - List all
router.get('/', (req, res) => {
    res.json(workflows);
});

// POST /workflows - Create new
router.post('/', (req, res) => {
    const newWf = { id: `wf-${Date.now()}`, ...req.body, stats: { runs: 0, lastRun: null }, active: true };
    workflows.push(newWf);
    res.json(newWf);
});

const workflowEngine = require('../../../core/workflowEngine');

// POST /workflows/:id/run - Manual Trigger (Test)
router.post('/:id/run', async (req, res) => {
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

    console.log(`[Workflow API] Manually triggering ${wf.name}...`);

    // In a real app we'd filter actions, but here we'll let core engine handle it 
    // or simulate the custom actions locally.
    if (wf.actions[0].type === 'ticket') {
        // Force the engine to see the formId this workflow belongs to (mocking form-1)
        await workflowEngine.processSubmission('form-1', mockSubmission);
    }

    res.json({ status: 'Triggered', workflow: wf });
});

module.exports = router;
