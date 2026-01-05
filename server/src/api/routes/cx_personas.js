const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// GET /api/cx-personas - List all
router.get('/', authenticate, async (req, res) => {
    try {
        // Return summary
        const result = await query('SELECT id, name, title, photo_url, updated_at FROM cx_personas ORDER BY updated_at DESC');
        res.json(result.rows);
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/cx-personas/:id - Get full details (including layout)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM cx_personas WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Persona not found' });
        res.json(result.rows[0]);
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/cx-personas - Create
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, title, layout_config } = req.body;
        // Default layout if not provided
        const initialLayout = layout_config || { left: [], right: [] };

        const result = await query(
            'INSERT INTO cx_personas (name, title, layout_config) VALUES ($1, $2, $3) RETURNING *',
            [name, title, JSON.stringify(initialLayout)]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/cx-personas/:id - Update (Auto-save)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, title, photo_url, layout_config } = req.body;

        const updates = [];
        const params = [];
        let i = 1;

        if (name) { updates.push(`name=$${i++}`); params.push(name); }
        if (title) { updates.push(`title=$${i++}`); params.push(title); }
        if (photo_url) { updates.push(`photo_url=$${i++}`); params.push(photo_url); }
        if (layout_config) { updates.push(`layout_config=$${i++}`); params.push(JSON.stringify(layout_config)); }

        updates.push(`updated_at=NOW()`);

        if (updates.length > 1) { // At least one update + updated_at
            params.push(id);
            await query(`UPDATE cx_personas SET ${updates.join(', ')} WHERE id=$${i}`, params);
        }

        res.json({ success: true });
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/cx-personas/:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await query('DELETE FROM cx_personas WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
