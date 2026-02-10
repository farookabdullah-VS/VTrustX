const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// Middleware to check admin role
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'global_admin' || req.user.username === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Admin role required." });
    }
};

// GET /api/admin/config/plans
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await query('SELECT * FROM plans ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/config/plans
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, interval, base_price, currency, pricing_by_region } = req.body;

        if (!name || !interval || !base_price || !currency) {
            return res.status(400).json({ error: "Missing required fields: name, interval, base_price, currency" });
        }

        const result = await query(`
            INSERT INTO plans (name, interval, base_price, currency, pricing_by_region)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, interval, base_price, currency, pricing_by_region ? JSON.stringify(pricing_by_region) : null]);

        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/admin/config/plans/:id
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, interval, base_price, currency, pricing_by_region } = req.body;

        const result = await query(`
            UPDATE plans 
            SET name = $1, interval = $2, base_price = $3, currency = $4, pricing_by_region = $5, updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [name, interval, base_price, currency, pricing_by_region ? JSON.stringify(pricing_by_region) : null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/config/plans/:id
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM plans WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
