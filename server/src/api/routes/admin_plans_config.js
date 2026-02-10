const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

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
        const result = await query('SELECT * FROM plans ORDER BY sort_order ASC, base_price ASC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/config/plans
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, description, interval, base_price, currency, features, pricing_by_region, sort_order } = req.body;

        if (!name || !interval || base_price === undefined || !currency) {
            return res.status(400).json({ error: "Missing required fields: name, interval, base_price, currency" });
        }

        const result = await query(`
            INSERT INTO plans (name, description, interval, base_price, currency, features, pricing_by_region, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            name, description || null, interval, base_price, currency,
            features ? JSON.stringify(features) : '{"max_users": 2, "max_forms": 5, "max_submissions": 500, "max_ai_calls": 100, "voice_agent": false, "custom_branding": false, "api_access": false, "priority_support": false}',
            pricing_by_region ? JSON.stringify(pricing_by_region) : null,
            sort_order || 0
        ]);

        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/admin/config/plans/:id
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, interval, base_price, currency, features, pricing_by_region, sort_order, is_active } = req.body;

        const result = await query(`
            UPDATE plans
            SET name = $1, description = $2, interval = $3, base_price = $4, currency = $5,
                features = $6, pricing_by_region = $7, sort_order = $8, is_active = $9, updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `, [
            name, description || null, interval, base_price, currency,
            features ? JSON.stringify(features) : null,
            pricing_by_region ? JSON.stringify(pricing_by_region) : null,
            sort_order || 0, is_active !== false, id
        ]);

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
        // Check if any active subscriptions use this plan
        const subCheck = await query("SELECT COUNT(*) FROM subscriptions WHERE plan_id = $1 AND status = 'ACTIVE'", [id]);
        if (parseInt(subCheck.rows[0].count) > 0) {
            return res.status(400).json({ error: "Cannot delete plan with active subscriptions" });
        }
        await query('DELETE FROM plans WHERE id = $1', [id]);
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
