const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

// Middleware to check admin role
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'global_admin' || req.user.username === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Admin role required." });
    }
};

// GET /api/admin/discounts - List Discounts
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await query('SELECT * FROM discounts ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/discounts - Create Discount
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const {
            code, type, value, start_date, end_date,
            applies_to_plan_id, max_redemptions, partner_id, recurrence_rule
        } = req.body;

        // Validation
        if (!type || !value) {
            return res.status(400).json({ error: "Type and Value are required" });
        }
        if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(type)) {
            return res.status(400).json({ error: "Invalid discount type" });
        }

        const result = await query(`
            INSERT INTO discounts (
                code, type, value, start_date, end_date, 
                applies_to_plan_id, max_redemptions, partner_id, 
                recurrence_rule, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, 
                $9, $10
            ) RETURNING *
        `, [
            code, type, value, start_date || null, end_date || null,
            applies_to_plan_id || null, max_redemptions || null, partner_id || null,
            recurrence_rule || null, req.user.id
        ]);

        res.status(201).json(result.rows[0]);
    } catch (e) {
        logger.error("Error creating discount", { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

// PATCH /api/admin/discounts/:id - Update Discount
router.patch('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Dynamic update query builder
        const fields = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (['code', 'type', 'value', 'start_date', 'end_date', 'is_active', 'max_redemptions'].includes(key)) {
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }
        fields.push(`updated_at = NOW()`);

        if (fields.length === 1) { // only updated_at
            return res.status(400).json({ error: "No valid fields to update" });
        }

        values.push(id);
        const queryText = `UPDATE discounts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

        const result = await query(queryText, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Discount not found" });
        }

        res.json(result.rows[0]);

    } catch (e) {
        logger.error("Error updating discount", { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
