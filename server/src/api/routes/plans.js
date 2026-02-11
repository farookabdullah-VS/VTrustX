const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

/**
 * @swagger
 * /api/plans:
 *   get:
 *     tags: [Plans]
 *     summary: List available plans
 *     description: Returns all plans with their base prices and any active discounts applied. This is a public endpoint that does not require authentication.
 *     responses:
 *       200:
 *         description: List of plans with discount information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       base_price:
 *                         type: number
 *                         format: float
 *                       discounted_price:
 *                         type: number
 *                         format: float
 *                       features:
 *                         type: object
 *                       discount:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           code:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [PERCENTAGE, FIXED_AMOUNT]
 *                           value:
 *                             type: number
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    try {
        // Fetch all plans
        const plansResult = await query('SELECT * FROM plans ORDER BY base_price ASC');
        const plans = plansResult.rows;

        // Fetch all active discounts that are currently valid
        const now = new Date();
        const discountsResult = await query(`
            SELECT * FROM discounts 
            WHERE is_active = TRUE 
            AND (start_date IS NULL OR start_date <= $1)
            AND (end_date IS NULL OR end_date >= $1)
        `, [now]);
        const discounts = discountsResult.rows;

        // Map plans to include discount info
        const plansWithDiscounts = plans.map(plan => {
            // Find applicable discounts for this plan
            // (applies_to_plan_id is null/empty for ALL plans, or contains specific UUID)
            const applicableDiscounts = discounts.filter(d => {
                if (!d.applies_to_plan_id || d.applies_to_plan_id.length === 0) return true;
                return d.applies_to_plan_id.includes(plan.id);
            });

            // Select best/first discount (Non-stackable rule)
            let activeDiscount = null;
            if (applicableDiscounts.length > 0) {
                // For now, pick the first one. 
                // Future enhancement: Pick the one with highest savings.
                activeDiscount = applicableDiscounts[0];
            }

            let discountedPrice = parseFloat(plan.base_price);

            if (activeDiscount) {
                if (activeDiscount.type === 'PERCENTAGE') {
                    discountedPrice = discountedPrice * (1 - parseFloat(activeDiscount.value) / 100);
                } else { // FIXED_AMOUNT
                    discountedPrice = discountedPrice - parseFloat(activeDiscount.value);
                }
                // Enforce minimum price of 0.01
                discountedPrice = Math.max(discountedPrice, 0.01);
            }

            return {
                ...plan,
                base_price: parseFloat(plan.base_price),
                discounted_price: parseFloat(discountedPrice.toFixed(2)),
                discount: activeDiscount ? {
                    code: activeDiscount.code,
                    type: activeDiscount.type,
                    value: parseFloat(activeDiscount.value)
                } : null
            };
        });

        res.json({ plans: plansWithDiscounts });
    } catch (e) {
        logger.error('Error fetching plans', { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
