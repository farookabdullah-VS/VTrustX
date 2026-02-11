const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createDiscountSchema, updateDiscountSchema } = require('../schemas/discounts.schemas');
const logger = require('../../infrastructure/logger');

// Middleware to check admin role
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'global_admin' || req.user.username === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Admin role required." });
    }
};

/**
 * @swagger
 * /api/admin/discounts:
 *   get:
 *     summary: List discounts
 *     description: Retrieve all discounts. Requires admin role.
 *     tags: [AdminDiscounts]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Discount'
 *       403:
 *         description: Access denied - admin role required
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await query('SELECT * FROM discounts ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch discounts', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch discounts' });
    }
});

/**
 * @swagger
 * /api/admin/discounts:
 *   post:
 *     summary: Create discount
 *     description: Create a new discount code. Requires admin role.
 *     tags: [AdminDiscounts]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - type
 *               - value
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: Unique discount code
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 description: Discount type
 *               value:
 *                 type: number
 *                 minimum: 0
 *                 description: Discount value
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 description: Start date for the discount
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 description: End date for the discount
 *               applies_to_plan_id:
 *                 type: integer
 *                 description: Restrict discount to a specific plan
 *               max_redemptions:
 *                 type: integer
 *                 minimum: 0
 *                 description: Maximum number of redemptions
 *               partner_id:
 *                 type: string
 *                 maxLength: 255
 *                 description: Associated partner ID
 *               recurrence_rule:
 *                 type: string
 *                 maxLength: 255
 *                 description: Recurrence rule for the discount
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Discount created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discount'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied - admin role required
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, isAdmin, validate(createDiscountSchema), async (req, res) => {
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
        res.status(500).json({ error: 'Failed to create discount' });
    }
});

/**
 * @swagger
 * /api/admin/discounts/{id}:
 *   patch:
 *     summary: Update discount
 *     description: Update an existing discount. Supports partial updates. Requires admin role.
 *     tags: [AdminDiscounts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Discount ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               value:
 *                 type: number
 *                 minimum: 0
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               applies_to_plan_id:
 *                 type: integer
 *               max_redemptions:
 *                 type: integer
 *                 minimum: 0
 *               partner_id:
 *                 type: string
 *                 maxLength: 255
 *               recurrence_rule:
 *                 type: string
 *                 maxLength: 255
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Discount updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discount'
 *       400:
 *         description: Validation error or no valid fields to update
 *       403:
 *         description: Access denied - admin role required
 *       404:
 *         description: Discount not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id', authenticate, isAdmin, validate(updateDiscountSchema), async (req, res) => {
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
        res.status(500).json({ error: 'Failed to update discount' });
    }
});

module.exports = router;
