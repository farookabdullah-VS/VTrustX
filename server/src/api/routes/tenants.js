const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../../infrastructure/database/db');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const logger = require('../../infrastructure/logger');
const validate = require('../middleware/validate');
const { registerTenantSchema } = require('../schemas/tenants.schemas');

const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

/**
 * @swagger
 * /api/tenants/register:
 *   post:
 *     tags: [Tenants]
 *     summary: Register new tenant
 *     description: Registers a new tenant with an admin user account. Creates the tenant, admin user, and optional subscription in a single atomic transaction. Password must be at least 10 characters with uppercase, lowercase, and a number.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyName, email, password]
 *             properties:
 *               companyName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 10
 *               phone:
 *                 type: string
 *               name:
 *                 type: string
 *               planId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tenantId:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       409:
 *         description: User with this email already exists
 *       500:
 *         description: Server error
 */
router.post('/register', validate(registerTenantSchema), async (req, res) => {
    try {
        const { companyName, email, password, phone, name, planId } = req.body;

        // Check if user already exists (outside transaction — read-only check)
        const userExists = await query('SELECT id FROM users WHERE username = $1 OR email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ error: "User with this email already exists" });
        }

        // Hash password before entering transaction (CPU-bound work)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Wrap tenant + user + subscription creation in a single transaction
        const tenantId = await transaction(async (client) => {
            // Create Tenant
            const tenantRes = await client.query(`
                INSERT INTO tenants (name, plan, subscription_status, contact_email, contact_phone, created_at, updated_at)
                VALUES ($1, 'free', 'active', $2, $3, NOW(), NOW())
                RETURNING *
            `, [companyName, email, phone || null]);
            const tenant = tenantRes.rows[0];

            // Create Admin User
            const now = new Date();
            await client.query(`
                INSERT INTO users (username, password, role, tenant_id, name, email, phone, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [email, hashedPassword, 'admin', tenant.id, name || null, email, phone || null, 'active', now, now]);

            // If planId provided, create initial subscription
            if (planId) {
                await client.query(`
                    INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, next_billing_at)
                    VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '1 month', NOW() + INTERVAL '1 month')
                `, [tenant.id, planId]);
                await client.query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [planId, tenant.id]);
            }

            return tenant.id;
        });

        res.status(201).json({ message: "Registration successful", tenantId });

    } catch (e) {
        logger.error('Registration failed', { error: e.message });
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
