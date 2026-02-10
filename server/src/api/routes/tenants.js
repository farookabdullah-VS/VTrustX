const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../../infrastructure/database/db');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');

const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

// POST /api/tenants/register
router.post('/register', async (req, res) => {
    try {
        const { companyName, email, password, phone, name, planId } = req.body;

        if (!companyName || !email || !password) {
            return res.status(400).json({ error: "Company name, email, and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Check if user already exists
        const userExists = await query('SELECT id FROM users WHERE username = $1 OR email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ error: "User with this email already exists" });
        }

        // Create Tenant
        const tenantRes = await query(`
            INSERT INTO tenants (name, plan, subscription_status, contact_email, contact_phone, created_at, updated_at)
            VALUES ($1, 'free', 'active', $2, $3, NOW(), NOW())
            RETURNING *
        `, [companyName, email, phone || null]);
        const tenant = tenantRes.rows[0];

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create Admin User
        const newUser = {
            username: email,
            password: hashedPassword,
            role: 'admin',
            tenant_id: tenant.id,
            name: name || null,
            email: email,
            phone: phone || null,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
        };
        await userRepo.create(newUser);

        // If planId provided, create initial subscription
        if (planId) {
            await query(`
                INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, next_billing_at)
                VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '1 month', NOW() + INTERVAL '1 month')
            `, [tenant.id, planId]);
            await query('UPDATE tenants SET plan_id = $1 WHERE id = $2', [planId, tenant.id]);
        }

        res.status(201).json({ message: "Registration successful", tenantId: tenant.id });

    } catch (e) {
        console.error("Registration failed:", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
