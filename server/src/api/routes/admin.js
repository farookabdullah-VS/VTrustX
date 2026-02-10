const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// Middleware to check if user is a global admin
const checkGlobalAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'global_admin' || req.user.role === 'admin' || req.user.username === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Global Admin role required.' });
    }
};

// GET /api/admin/stats - Global usage statistics
router.get('/stats', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                (SELECT COUNT(*) FROM tenants) as total_tenants,
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM forms) as total_forms,
                (SELECT COUNT(*) FROM submissions) as total_submissions
        `);
        res.json(stats.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/tenants - List all organizations and their plan/usage
router.get('/tenants', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const { search } = req.query;
        let sql = `
            SELECT t.*, 
            (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count
            FROM tenants t
        `;
        const params = [];
        if (search) {
            sql += ` WHERE t.name ILIKE $1`;
            params.push(`%${search}%`);
        }
        sql += ` ORDER BY t.created_at DESC`;

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- PLANS MANAGEMENT ---

// GET /api/admin/plans - List all pricing plans
router.get('/plans', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const result = await query('SELECT * FROM pricing_plans');
        res.json(result.rows);
    } catch (e) {
        console.error("ADMIN PLANS ERROR:", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/admin/plans - Create new plan
router.post('/plans', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const { name, description, price_monthly, price_yearly, features, max_users, max_responses } = req.body;
        const result = await query(
            `INSERT INTO pricing_plans (name, description, price_monthly, price_yearly, features, max_users, max_responses) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, description || '', price_monthly || 0, price_yearly || 0, JSON.stringify(features || []), max_users || 1, max_responses || 100]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/admin/plans/:id - Update plan
router.put('/plans/:id', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const { name, description, price_monthly, price_yearly, features, max_users, max_responses, is_active } = req.body;
        const id = req.params.id;

        await query(
            `UPDATE pricing_plans 
             SET name=$1, description=$2, price_monthly=$3, price_yearly=$4, features=$5, max_users=$6, max_responses=$7, is_active=$8
             WHERE id=$9`,
            [name, description, price_monthly, price_yearly, JSON.stringify(features), max_users, max_responses, is_active, id]
        );
        res.json({ success: true, message: 'Plan updated' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- TENANT MANAGEMENT ---

// POST /api/admin/tenants - Create new organization
router.post('/tenants', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const { name, planId } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Use random ID or let DB handle if serial (my script used VARCHAR for id)
        // My script: id VARCHAR(50) PRIMARY KEY.
        const crypto = require('crypto');
        const id = crypto.randomUUID();

        const result = await query(
            'INSERT INTO tenants (id, name, plan_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name, planId || null, 'active']
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/admin/tenants/:id - Update tenant details
router.put('/tenants/:id', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const { name, subscription_status, features } = req.body;
        const tenantId = req.params.id;

        const updates = [];
        const params = [];
        let i = 1;

        if (name) {
            updates.push(`name = $${i++}`);
            params.push(name);
        }
        if (subscription_status) {
            updates.push(`subscription_status = $${i++}`);
            params.push(subscription_status);
        }
        if (features) {
            updates.push(`features = $${i++}`);
            params.push(JSON.stringify(features));
        }

        if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

        params.push(tenantId);
        const sql = `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
        const result = await query(sql, params);

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/tenants/:id - Delete organization
router.delete('/tenants/:id', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const tenantId = req.params.id;
        // Check if it's the only tenant (optionally prevent deleting last one)

        // Cascade delete would be handled by DB if configured, but let's just delete the tenant
        // Note: In real scenarios, we might want to archive it instead.
        await query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const moment = require('moment');

// PUT /api/admin/tenants/:id/plan - Update organization plan
router.put('/tenants/:id/plan', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const { plan, status, duration } = req.body; // duration: '1_month', '1_year', 'forever'
        const tenantId = req.params.id;

        let expiresAt = null;
        if (duration && duration !== 'forever') {
            const [amount, unit] = duration.split('_');
            if (amount && unit) {
                // simple mapping: 'year' -> 'years'
                expiresAt = moment().add(parseInt(amount), unit === 'year' ? 'years' : 'months').toDate();
            }
        }

        await query(
            'UPDATE tenants SET plan_id = $1, subscription_status = $2, subscription_expires_at = $3 WHERE id = $4',
            [plan, status || 'active', expiresAt, tenantId]
        );

        res.json({ success: true, message: 'Plan updated successfully', expiresAt });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const jwt = require('jsonwebtoken');

// POST /api/admin/tenants/:id/license - Generate License Key
router.post('/tenants/:id/license', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const { plan, duration } = req.body;
        const tenantId = req.params.id;

        let expiresAt = null;
        if (duration && duration !== 'forever') {
            const [amount, unit] = duration.split('_');
            if (amount && unit) {
                expiresAt = moment().add(parseInt(amount), unit === 'year' ? 'years' : 'months').toDate();
            }
        }

        const payload = {
            tenantId,
            plan,
            expiresAt: expiresAt ? expiresAt.getTime() : null, // epoch for simplicity
            generatedAt: Date.now()
        };

        const secret = process.env.LICENSE_SECRET || process.env.JWT_SECRET || 'vtrustx_secret_key';
        const licenseKey = jwt.sign(payload, secret);

        res.json({ licenseKey, expiresAt });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
