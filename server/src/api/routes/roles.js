const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// GET all roles for the tenant
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query('SELECT * FROM roles WHERE tenant_id = $1 ORDER BY created_at', [tenantId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// CREATE a new role
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { name, description, permissions } = req.body;

        const result = await query(
            'INSERT INTO roles (tenant_id, name, description, permissions) VALUES ($1, $2, $3, $4) RETURNING *',
            [tenantId, name, description, permissions || {}]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// UPDATE a role
router.put('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { name, description, permissions } = req.body;
        const id = req.params.id;

        const result = await query(
            'UPDATE roles SET name = $1, description = $2, permissions = $3, updated_at = NOW() WHERE id = $4 AND tenant_id = $5 RETURNING *',
            [name, description, permissions, id, tenantId]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: 'Role not found' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE a role
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const id = req.params.id;

        await query('DELETE FROM roles WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Role deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
