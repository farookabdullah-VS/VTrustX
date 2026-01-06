const express = require('express');
const router = express.Router();
const db = require('../../infrastructure/database/db');

// GET all quotas for a form
// GET all quotas for a form
router.get('/', async (req, res) => {
    try {
        const { formId } = req.query;
        if (!formId) return res.status(400).json({ error: 'formId query required' });

        const result = await db.query(
            'SELECT * FROM quotas WHERE form_id = $1 ORDER BY id ASC',
            [formId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch quotas' });
    }
});

// POST create a quota
router.post('/', async (req, res) => {
    try {
        const { form_id, label, limit_count, criteria, action, reset_period, is_active } = req.body;
        const result = await db.query(
            `INSERT INTO quotas (form_id, label, limit_count, current_count, criteria, action, reset_period, is_active)
             VALUES ($1, $2, $3, 0, $4, $5, $6, $7)
             RETURNING *`,
            [form_id, label, limit_count, criteria, action, reset_period, is_active]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create quota' });
    }
});

// PUT update a quota
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { label, limit_count, criteria, action, reset_period, is_active } = req.body;
        const result = await db.query(
            `UPDATE quotas 
             SET label = $1, limit_count = $2, criteria = $3, action = $4, reset_period = $5, is_active = $6
             WHERE id = $7
             RETURNING *`,
            [label, limit_count, criteria, action, reset_period, is_active, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Quota not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update quota' });
    }
});

// DELETE a quota
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM quotas WHERE id = $1', [id]);
        res.json({ message: 'Quota deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete quota' });
    }
});

module.exports = router;
