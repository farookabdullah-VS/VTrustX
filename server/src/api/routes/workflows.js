const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// Init Repo
const workflowRepo = new PostgresRepository('workflows');

// Helper
const toEntity = (row) => ({
    id: row.id,
    formId: row.form_id,
    name: row.name,
    description: row.description,
    trigger_event: row.trigger_event,
    conditions: row.conditions,
    actions: row.actions,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// GET /api/workflows?formId=...
// GET /api/workflows
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const formId = req.query.formId;

        let queryStr = 'SELECT * FROM workflows WHERE tenant_id = $1';
        const params = [tenantId];

        if (formId) {
            queryStr += ' AND form_id = $2';
            params.push(formId);
        }

        const result = await query(queryStr, params);
        res.json(result.rows.map(toEntity));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/workflows/:id
router.get('/:id', async (req, res) => {
    try {
        const row = await workflowRepo.findById(req.params.id);
        if (!row) return res.status(404).json({ error: 'Workflow not found' });
        res.json(toEntity(row));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/workflows
router.post('/', authenticate, async (req, res) => {
    try {
        const newWorkflow = {
            tenant_id: req.user.tenant_id,
            form_id: req.body.formId || null,
            name: req.body.name,
            description: req.body.description || null,
            trigger_event: req.body.trigger_event || 'submission_completed',
            conditions: JSON.stringify(req.body.conditions || []),
            actions: JSON.stringify(req.body.actions || []),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        };
        const saved = await workflowRepo.create(newWorkflow);
        res.status(201).json(toEntity(saved));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/workflows/:id
router.put('/:id', async (req, res) => {
    try {
        const existing = await workflowRepo.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: "Not found" });

        const updateData = {
            name: req.body.name || existing.name,
            description: req.body.description || existing.description,
            conditions: JSON.stringify(req.body.conditions || existing.conditions),
            actions: JSON.stringify(req.body.actions || existing.actions),
            updated_at: new Date()
        };
        const updated = await workflowRepo.update(req.params.id, updateData);
        res.json(toEntity(updated));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
    try {
        await workflowRepo.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
