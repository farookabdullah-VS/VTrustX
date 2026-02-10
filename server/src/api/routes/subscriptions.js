const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// GET /api/subscriptions/me - User's current subscription
router.get('/me', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // Fetch active subscription
        const result = await query(`
            SELECT s.*, p.name as plan_name, p.interval 
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = $1 
            AND s.status IN ('ACTIVE', 'PAUSED')
            ORDER BY s.created_at DESC 
            LIMIT 1
        `, [userId]); // userId is Integer

        if (result.rows.length === 0) {
            return res.json({ subscription: null });
        }
        res.json({ subscription: result.rows[0] });
    } catch (e) {
        console.error("Error fetching subscription:", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/subscriptions - Create new subscription
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { plan_id, discount_code } = req.body; // plan_id is UUID

        if (!plan_id) {
            return res.status(400).json({ error: "Plan ID is required" });
        }

        // 1. Fetch Plan
        const planResult = await query('SELECT * FROM plans WHERE id = $1', [plan_id]); // plan_id is UUID
        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }
        const plan = planResult.rows[0];

        // 2. Validate Discount (if provided)
        let discount = null;
        if (discount_code) {
            const now = new Date();
            const discountRes = await query(`
                SELECT * FROM discounts 
                WHERE code = $1 
                AND is_active = TRUE 
                AND (start_date IS NULL OR start_date <= $2)
                AND (end_date IS NULL OR end_date >= $2)
            `, [discount_code, now]);

            if (discountRes.rows.length > 0) {
                const potentialDiscount = discountRes.rows[0];
                // Check if applies to this plan
                if (!potentialDiscount.applies_to_plan_id || potentialDiscount.applies_to_plan_id.length === 0 || potentialDiscount.applies_to_plan_id.includes(plan.id)) {
                    discount = potentialDiscount;
                } else {
                    return res.status(400).json({ error: "Discount code does not apply to this plan" });
                }
            } else {
                return res.status(400).json({ error: "Invalid or expired discount code" });
            }
        }

        // 3. Calculate Final Amount
        let amount = parseFloat(plan.base_price);
        if (discount) {
            if (discount.type === 'PERCENTAGE') {
                amount = amount * (1 - parseFloat(discount.value) / 100);
            } else {
                amount = amount - parseFloat(discount.value);
            }
            amount = Math.max(amount, 0.01);
        }

        // 4. Create Subscription record (MOCK PAYMENT for now)
        // In real flow, we'd call Stripe here.

        const subResult = await query(`
            INSERT INTO subscriptions (
                user_id, plan_id, discount_id, status, 
                current_period_start, current_period_end, 
                next_billing_at, amount_paid
            ) VALUES (
                $1, $2, $3, 'ACTIVE', 
                NOW(), NOW() + INTERVAL '1 month', 
                NOW() + INTERVAL '1 month', $4
            ) RETURNING *
        `, [
            userId,
            plan.id,
            discount ? discount.id : null,
            amount.toFixed(2)
        ]);

        res.status(201).json({ subscription: subResult.rows[0], message: "Subscription created successfully" });

    } catch (e) {
        console.error("Error creating subscription:", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
