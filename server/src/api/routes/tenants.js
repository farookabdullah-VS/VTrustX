const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const crypto = require('crypto');

const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

// POST /api/tenants/register
router.post('/register', async (req, res) => {
    try {
        const { companyName, email, password, phone, name, planId } = req.body;

        if (!companyName || !email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if user already exists (using email as username)
        const userExists = await query('SELECT id FROM users WHERE username = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ error: "User with this email already exists" });
        }

        // Generate Tenant ID
        const tenantId = crypto.randomUUID();

        // Create Tenant
        const newTenant = {
            id: tenantId,
            name: companyName,
            plan_id: planId || null,
            contact_email: email,
            contact_phone: phone,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
        };
        await tenantRepo.create(newTenant);

        // Create Admin User
        // Note: Password should be hashed in production using bcrypt
        const newUser = {
            username: email, // Email is the username
            password: password,
            role: 'admin',
            tenant_id: tenantId,
            name: name,
            email: email,
            phone: phone,
            created_at: new Date()
        };
        await userRepo.create(newUser);

        res.status(201).json({ message: "Registration successful", tenantId });

    } catch (e) {
        console.error("Registration failed:", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
