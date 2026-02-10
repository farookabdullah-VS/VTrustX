const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');

// GET /api/plans - Public
// Returns all plans with active discounts (if any)
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
        console.error("Error fetching plans:", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
