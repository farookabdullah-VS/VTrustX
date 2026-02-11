const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

// 1. Get All Action Plans (Goals)
router.get('/plans', authenticate, async (req, res) => {
    try {
        const sql = `
            SELECT * FROM action_plans 
            WHERE tenant_id = $1 
            ORDER BY created_at DESC
        `;
        // In a real app, tenant_id comes from req.user
        // For MVP, if auth middleware adds user to req:
        const tenantId = req.user?.tenantId || 'default-tenant';

        // Mock data for MVP if no DB table yet
        res.json([
            { id: 1, title: 'Improve Onboarding CSAT', metric: 'CSAT', target: 4.5, current: 3.8, status: 'In Progress', owner: 'Sarah J.', due_date: '2026-06-30' },
            { id: 2, title: 'Reduce Churn in Enterprise', metric: 'Churn Rate', target: 2.0, current: 5.1, status: 'At Risk', owner: 'Mike T.', due_date: '2026-04-15' }
        ]);

        // Real impl when table exists:
        // const result = await query(sql, [tenantId]);
        // res.json(result.rows);

    } catch (err) {
        logger.error('Failed to fetch action plans', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch action plans' });
    }
});

// 2. Create New Action Plan
router.post('/plans', authenticate, async (req, res) => {
    try {
        const { title, metric, target, owner, due_date } = req.body;
        // Insert into DB
        res.json({ id: Math.floor(Math.random() * 1000), title, status: 'New' });
    } catch (err) {
        logger.error('Failed to create action plan', { error: err.message });
        res.status(500).json({ error: 'Failed to create action plan' });
    }
});

// 3. Get Initiatives (Tasks) for a Plan
router.get('/plans/:id/initiatives', authenticate, async (req, res) => {
    try {
        // Mock Initiatives
        res.json([
            { id: 101, plan_id: req.params.id, title: 'Revamp Welcome Email Series', status: 'Completed', impact: 'High' },
            { id: 102, plan_id: req.params.id, title: 'Conduct User Interviews', status: 'In Progress', impact: 'Medium' }
        ]);
    } catch (err) {
        logger.error('Failed to fetch initiatives', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch initiatives' });
    }
});

module.exports = router;
