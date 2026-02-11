const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'global_admin' || req.user.username === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Admin role required." });
    }
};

/**
 * @swagger
 * /api/admin/config/plans:
 *   get:
 *     summary: List all plan configurations
 *     tags: [AdminPlans]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of plan configurations sorted by sort_order and price
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   interval:
 *                     type: string
 *                   base_price:
 *                     type: number
 *                   currency:
 *                     type: string
 *                   features:
 *                     type: object
 *                   pricing_by_region:
 *                     type: object
 *                     nullable: true
 *                   sort_order:
 *                     type: integer
 *                   is_active:
 *                     type: boolean
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin role required
 *       500:
 *         description: Server error
 */
// GET /api/admin/config/plans
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await query('SELECT * FROM plans ORDER BY sort_order ASC, base_price ASC');
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch plans config', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

/**
 * @swagger
 * /api/admin/config/plans:
 *   post:
 *     summary: Create a new plan configuration
 *     tags: [AdminPlans]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - interval
 *               - base_price
 *               - currency
 *             properties:
 *               name:
 *                 type: string
 *                 description: Plan name
 *               description:
 *                 type: string
 *               interval:
 *                 type: string
 *                 description: Billing interval (e.g. monthly, yearly)
 *               base_price:
 *                 type: number
 *                 description: Base price amount
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g. USD, EUR)
 *               features:
 *                 type: object
 *                 description: Feature flags and limits
 *                 properties:
 *                   max_users:
 *                     type: integer
 *                   max_forms:
 *                     type: integer
 *                   max_submissions:
 *                     type: integer
 *                   max_ai_calls:
 *                     type: integer
 *                   voice_agent:
 *                     type: boolean
 *                   custom_branding:
 *                     type: boolean
 *                   api_access:
 *                     type: boolean
 *                   priority_support:
 *                     type: boolean
 *               pricing_by_region:
 *                 type: object
 *                 nullable: true
 *                 description: Regional pricing overrides
 *               sort_order:
 *                 type: integer
 *                 default: 0
 *     responses:
 *       201:
 *         description: Plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 interval:
 *                   type: string
 *                 base_price:
 *                   type: number
 *                 currency:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin role required
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to create plan config', { error: e.message });
        res.status(500).json({ error: 'Failed to create plan' });
    }
});

/**
 * @swagger
 * /api/admin/config/plans/{id}:
 *   put:
 *     summary: Update an existing plan configuration
 *     tags: [AdminPlans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               interval:
 *                 type: string
 *               base_price:
 *                 type: number
 *               currency:
 *                 type: string
 *               features:
 *                 type: object
 *               pricing_by_region:
 *                 type: object
 *                 nullable: true
 *               sort_order:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 is_active:
 *                   type: boolean
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to update plan config', { error: e.message });
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

/**
 * @swagger
 * /api/admin/config/plans/{id}:
 *   delete:
 *     summary: Delete a plan configuration
 *     tags: [AdminPlans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Plan ID
 *     responses:
 *       204:
 *         description: Plan deleted successfully
 *       400:
 *         description: Cannot delete plan with active subscriptions
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin role required
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to delete plan config', { error: e.message });
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

module.exports = router;
