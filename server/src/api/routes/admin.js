const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPlanSchema, updatePlanSchema, createTenantSchema, updateTenantSchema } = require('../schemas/admin.schemas');

const { requireRole } = require('../middleware/authorize');
const checkGlobalAdmin = requireRole('global_admin');

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin statistics
 *     description: Returns global usage statistics including total tenants, users, forms, and submissions.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Admin statistics object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_tenants:
 *                   type: integer
 *                 total_users:
 *                   type: integer
 *                 total_forms:
 *                   type: integer
 *                 total_submissions:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch admin stats', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch admin statistics' });
    }
});

/**
 * @swagger
 * /api/admin/tenants:
 *   get:
 *     summary: List tenants
 *     description: Returns all organizations with their user counts. Supports optional search filtering by name.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional search filter for tenant name (case-insensitive)
 *     responses:
 *       200:
 *         description: Array of tenant objects with user counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch tenants', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

// --- PLANS MANAGEMENT ---

/**
 * @swagger
 * /api/admin/plans:
 *   get:
 *     summary: List plans
 *     description: Returns all pricing plans available in the system.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of pricing plan objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
router.get('/plans', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const result = await query('SELECT * FROM pricing_plans');
        res.json(result.rows);
    } catch (e) {
        logger.error("ADMIN PLANS ERROR", { error: e.message });
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

/**
 * @swagger
 * /api/admin/plans:
 *   post:
 *     summary: Create plan
 *     description: Creates a new pricing plan with the specified configuration.
 *     tags: [Admin]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price_monthly:
 *                 type: number
 *               price_yearly:
 *                 type: number
 *               features:
 *                 type: object
 *               max_users:
 *                 type: integer
 *               max_responses:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
router.post('/plans', authenticate, checkGlobalAdmin, validate(createPlanSchema), async (req, res) => {
    try {
        const { name, description, price_monthly, price_yearly, features, max_users, max_responses } = req.body;
        const result = await query(
            `INSERT INTO pricing_plans (name, description, price_monthly, price_yearly, features, max_users, max_responses) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, description || '', price_monthly || 0, price_yearly || 0, JSON.stringify(features || []), max_users || 1, max_responses || 100]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        logger.error('Failed to create plan', { error: e.message });
        res.status(500).json({ error: 'Failed to create plan' });
    }
});

/**
 * @swagger
 * /api/admin/plans/{id}:
 *   put:
 *     summary: Update plan
 *     description: Updates an existing pricing plan's configuration.
 *     tags: [Admin]
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
 *               price_monthly:
 *                 type: number
 *               price_yearly:
 *                 type: number
 *               features:
 *                 type: object
 *               max_users:
 *                 type: integer
 *               max_responses:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
router.put('/plans/:id', authenticate, checkGlobalAdmin, validate(updatePlanSchema), async (req, res) => {
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
        logger.error('Failed to update plan', { error: e.message });
        res.status(500).json({ error: 'Failed to update plan' });
    }
});


// --- TENANT MANAGEMENT ---

/**
 * @swagger
 * /api/admin/tenants:
 *   post:
 *     summary: Create tenant
 *     description: Creates a new organization (tenant) with an optional plan assignment.
 *     tags: [Admin]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *               planId:
 *                 type: integer
 *                 nullable: true
 *                 description: Optional plan ID to assign
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
router.post('/tenants', authenticate, checkGlobalAdmin, validate(createTenantSchema), async (req, res) => {
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
        logger.error('Failed to create tenant', { error: e.message });
        res.status(500).json({ error: 'Failed to create tenant' });
    }
});

/**
 * @swagger
 * /api/admin/tenants/{id}:
 *   put:
 *     summary: Update tenant
 *     description: Updates an existing tenant's details such as name, subscription status, or features.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               subscription_status:
 *                 type: string
 *                 enum: [active, trial, suspended, cancelled]
 *               features:
 *                 type: object
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error or no updates provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
router.put('/tenants/:id', authenticate, checkGlobalAdmin, validate(updateTenantSchema), async (req, res) => {
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
        logger.error('Failed to update tenant', { error: e.message });
        res.status(500).json({ error: 'Failed to update tenant' });
    }
});

/**
 * @swagger
 * /api/admin/tenants/{id}:
 *   delete:
 *     summary: Delete tenant
 *     description: Permanently deletes a tenant organization. Cascade deletion depends on database configuration.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       204:
 *         description: Tenant deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
router.delete('/tenants/:id', authenticate, checkGlobalAdmin, async (req, res) => {
    try {
        const tenantId = req.params.id;
        // Check if it's the only tenant (optionally prevent deleting last one)

        // Cascade delete would be handled by DB if configured, but let's just delete the tenant
        // Note: In real scenarios, we might want to archive it instead.
        await query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        res.status(204).send();
    } catch (e) {
        logger.error('Failed to delete tenant', { error: e.message });
        res.status(500).json({ error: 'Failed to delete tenant' });
    }
});

const moment = require('moment');

/**
 * @swagger
 * /api/admin/tenants/{id}/plan:
 *   put:
 *     summary: Update tenant plan
 *     description: Updates the plan assignment and subscription status for a tenant, with optional duration-based expiration.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: integer
 *                 description: Plan ID to assign
 *               status:
 *                 type: string
 *                 description: Subscription status (defaults to active)
 *               duration:
 *                 type: string
 *                 description: "Duration of the plan (e.g. '1_month', '1_year', 'forever')"
 *     responses:
 *       200:
 *         description: Tenant plan updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to update tenant plan', { error: e.message });
        res.status(500).json({ error: 'Failed to update tenant plan' });
    }
});

const jwt = require('jsonwebtoken');

/**
 * @swagger
 * /api/admin/tenants/{id}/license:
 *   post:
 *     summary: Set tenant license
 *     description: Generates a signed JWT license key for the specified tenant with plan and expiration details.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: string
 *                 description: Plan name or identifier for the license
 *               duration:
 *                 type: string
 *                 description: "License duration (e.g. '1_month', '1_year', 'forever')"
 *     responses:
 *       200:
 *         description: License key generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 licenseKey:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires global_admin role
 *       500:
 *         description: Server error
 */
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

        const secret = process.env.LICENSE_SECRET || process.env.JWT_SECRET || 'rayix_secret_key';
        const licenseKey = jwt.sign(payload, secret);

        res.json({ licenseKey, expiresAt });
    } catch (e) {
        logger.error('Failed to generate license key', { error: e.message });
        res.status(500).json({ error: 'Failed to generate license key' });
    }
});

module.exports = router;
