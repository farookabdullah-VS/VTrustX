const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// Helper: generate invoice number
function generateInvoiceNumber() {
    const date = new Date();
    const prefix = 'INV';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}${month}-${rand}`;
}

// GET /api/subscriptions/me - Current tenant subscription
router.get('/me', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(`
            SELECT s.*, p.name as plan_name, p.interval as billing_interval, p.base_price, p.features
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.tenant_id = $1
            AND s.status IN ('ACTIVE', 'PAUSED')
            ORDER BY s.created_at DESC
            LIMIT 1
        `, [tenantId]);

        if (result.rows.length === 0) {
            return res.json({ subscription: null });
        }
        res.json({ subscription: result.rows[0] });
    } catch (e) {
        console.error("Error fetching subscription:", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/subscriptions/history - Subscription history
router.get('/history', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query(`
            SELECT s.*, p.name as plan_name, p.interval as billing_interval
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.tenant_id = $1
            ORDER BY s.created_at DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/subscriptions/invoices - Billing history
router.get('/invoices', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query(`
            SELECT i.*, p.name as plan_name
            FROM invoices i
            LEFT JOIN subscriptions s ON i.subscription_id = s.id
            LEFT JOIN plans p ON s.plan_id = p.id
            WHERE i.tenant_id = $1
            ORDER BY i.created_at DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/subscriptions - Create new subscription
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;
        const { plan_id, discount_code, payment_method } = req.body;

        if (!plan_id) {
            return res.status(400).json({ error: "Plan ID is required" });
        }

        // 1. Fetch Plan
        const planResult = await query('SELECT * FROM plans WHERE id = $1', [plan_id]);
        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: "Plan not found" });
        }
        const plan = planResult.rows[0];

        // 2. Cancel any existing active subscription
        await query(`
            UPDATE subscriptions SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
            WHERE tenant_id = $1 AND status = 'ACTIVE'
        `, [tenantId]);

        // 3. Validate Discount
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
                const d = discountRes.rows[0];
                if (!d.applies_to_plan_id || d.applies_to_plan_id.length === 0 || d.applies_to_plan_id.includes(plan.id)) {
                    discount = d;
                } else {
                    return res.status(400).json({ error: "Discount code does not apply to this plan" });
                }
            } else {
                return res.status(400).json({ error: "Invalid or expired discount code" });
            }
        }

        // 4. Calculate Final Amount
        let amount = parseFloat(plan.base_price);
        if (discount) {
            if (discount.type === 'PERCENTAGE') {
                amount = amount * (1 - parseFloat(discount.value) / 100);
            } else {
                amount = amount - parseFloat(discount.value);
            }
            amount = Math.max(amount, 0);
        }

        // 5. Determine period based on plan interval
        const intervalSql = plan.interval === 'ANNUAL' ? '1 year' : '1 month';

        // 6. Create Subscription
        const subResult = await query(`
            INSERT INTO subscriptions (
                tenant_id, user_id, plan_id, discount_id, status,
                current_period_start, current_period_end,
                next_billing_at, amount_paid
            ) VALUES (
                $1, $2, $3, $4, 'ACTIVE',
                NOW(), NOW() + INTERVAL '${intervalSql}',
                NOW() + INTERVAL '${intervalSql}', $5
            ) RETURNING *
        `, [tenantId, userId, plan.id, discount ? discount.id : null, amount.toFixed(2)]);

        const subscription = subResult.rows[0];

        // 7. Update tenant plan
        await query('UPDATE tenants SET plan_id = $1, plan = $2, subscription_status = $3, updated_at = NOW() WHERE id = $4',
            [plan.id, plan.name.toLowerCase().replace(/\s+/g, '_'), 'active', tenantId]);

        // 8. Create Invoice
        await query(`
            INSERT INTO invoices (
                tenant_id, subscription_id, invoice_number, amount, currency,
                status, description, billing_period_start, billing_period_end,
                paid_at, payment_method
            ) VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8, NOW(), $9)
        `, [
            tenantId, subscription.id, generateInvoiceNumber(),
            amount.toFixed(2), plan.currency || 'USD',
            `${plan.name} - ${plan.interval} subscription`,
            subscription.current_period_start, subscription.current_period_end,
            payment_method || 'card'
        ]);

        res.status(201).json({ subscription, message: "Subscription created successfully" });

    } catch (e) {
        console.error("Error creating subscription:", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/subscriptions/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const { reason } = req.body;

        const result = await query(`
            UPDATE subscriptions
            SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = $1, updated_at = NOW()
            WHERE id = $2 AND tenant_id = $3 AND status = 'ACTIVE'
            RETURNING *
        `, [reason || null, id, tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Active subscription not found" });
        }

        // Downgrade tenant to free
        await query("UPDATE tenants SET plan = 'free', plan_id = NULL, subscription_status = 'cancelled', updated_at = NOW() WHERE id = $1", [tenantId]);

        res.json({ subscription: result.rows[0], message: "Subscription cancelled" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/subscriptions/:id/pause
router.post('/:id/pause', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        // Pause for up to 30 days
        const result = await query(`
            UPDATE subscriptions
            SET status = 'PAUSED', pause_expires_at = NOW() + INTERVAL '30 days', updated_at = NOW()
            WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
            RETURNING *
        `, [id, tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Active subscription not found" });
        }

        await query("UPDATE tenants SET subscription_status = 'paused', updated_at = NOW() WHERE id = $1", [tenantId]);

        res.json({ subscription: result.rows[0], message: "Subscription paused for 30 days" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/subscriptions/:id/resume
router.post('/:id/resume', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(`
            UPDATE subscriptions
            SET status = 'ACTIVE', pause_expires_at = NULL, updated_at = NOW()
            WHERE id = $1 AND tenant_id = $2 AND status = 'PAUSED'
            RETURNING *
        `, [id, tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Paused subscription not found" });
        }

        await query("UPDATE tenants SET subscription_status = 'active', updated_at = NOW() WHERE id = $1", [tenantId]);

        res.json({ subscription: result.rows[0], message: "Subscription resumed" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/subscriptions/:id/upgrade - Change plan
router.put('/:id/upgrade', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const { plan_id } = req.body;

        if (!plan_id) return res.status(400).json({ error: "New plan_id is required" });

        // Fetch new plan
        const planRes = await query('SELECT * FROM plans WHERE id = $1', [plan_id]);
        if (planRes.rows.length === 0) return res.status(404).json({ error: "Plan not found" });
        const plan = planRes.rows[0];

        const intervalSql = plan.interval === 'ANNUAL' ? '1 year' : '1 month';
        const amount = parseFloat(plan.base_price);

        // Update subscription
        const result = await query(`
            UPDATE subscriptions
            SET plan_id = $1, amount_paid = $2, status = 'ACTIVE',
                current_period_start = NOW(), current_period_end = NOW() + INTERVAL '${intervalSql}',
                next_billing_at = NOW() + INTERVAL '${intervalSql}', updated_at = NOW()
            WHERE id = $3 AND tenant_id = $4
            RETURNING *
        `, [plan_id, amount.toFixed(2), id, tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Subscription not found" });
        }

        // Update tenant
        await query('UPDATE tenants SET plan_id = $1, plan = $2, subscription_status = $3, updated_at = NOW() WHERE id = $4',
            [plan.id, plan.name.toLowerCase().replace(/\s+/g, '_'), 'active', tenantId]);

        // Create upgrade invoice
        await query(`
            INSERT INTO invoices (
                tenant_id, subscription_id, invoice_number, amount, currency,
                status, description, billing_period_start, billing_period_end,
                paid_at, payment_method
            ) VALUES ($1, $2, $3, $4, $5, 'paid', $6, NOW(), NOW() + INTERVAL '${intervalSql}', NOW(), 'card')
        `, [
            tenantId, result.rows[0].id, generateInvoiceNumber(),
            amount.toFixed(2), plan.currency || 'USD',
            `Plan upgrade to ${plan.name}`
        ]);

        res.json({ subscription: result.rows[0], message: `Upgraded to ${plan.name}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
