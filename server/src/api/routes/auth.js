const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../../core/entities/User');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');

// Separate repo for users
const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Check if exists
        // FindAll is inefficient for this check, but sticking to existing logic flow for now.
        // Better: userRepo.findByUsername (if we added it).
        // Using generic findAll to mimic previous behavior exactly.
        const users = await userRepo.findAll();
        if (users.find(u => u.username === username)) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Create
        // TODO: Hash password here
        // Create Tenant
        // Use username's org if not specified
        const tenantName = `${username}'s Organization`;
        const newTenant = await tenantRepo.create({
            name: tenantName,
            plan: 'free',
            subscription_status: 'active',
            created_at: new Date()
        });

        // Create User
        // TODO: Hash password here
        const newUser = {
            username,
            password, // Storing plain text for this demo MVP steps. REPLACE with bcrypt in prod.
            role: role || 'admin', // Default to Tenant Admin
            tenant_id: newTenant.id,
            created_at: new Date()
        };

        const saved = await userRepo.create(newUser);

        // Return without password
        const { password: _, ...safeUser } = saved;
        res.status(201).json(safeUser);

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Inefficient, should be findOne({ where: ... }). 
        // For MVP speed and generic repo limitations, we query all or add custom query later.
        // Let's optimize slightly by adding a specific query if possible, or stick to findAll for verified exact replacement.

        // Let's stick to findAll for now to be safe with the generic repo API we built.
        const users = await userRepo.findAll();

        console.log(`Login Attempt: '${username}' vs ${users.length} users in DB.`);

        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            // Debug: Check if username exists but password wrong
            const exists = users.find(u => u.username === username);
            if (exists) console.log(`User '${username}' exists but password mismatch. Expected '${exists.password}' vs '${password}'`);
            else console.log(`User '${username}' NOT FOUND in DB.`);

            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Return user info (client will store this to "simulate" session)
        const { password: _, ...safeUser } = user;
        res.json({
            user: safeUser,
            token: 'mock-jwt-token-' + user.id // Mock token
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// OAUTH PLACEHOLDERS
// --------------------
// To enable Google/Microsoft Login:
// 1. Install passport: npm install passport passport-google-oauth20 passport-microsoft-oauth
// 2. Configure strategies in a new 'passport.js' config file
// 3. Add routes below

// GOOGLE OAUTH
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=auth_failed' }),
    function (req, res) {
        // Successful authentication
        const user = req.user;
        // create a token
        const token = 'mock-jwt-token-' + user.id; // Consistent with existing mock auth

        // Redirect to frontend with token
        // In a real app, you might set a cookie or redirect to a page that grabs the token from URL
        res.redirect(`/login?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    }
);

router.get('/microsoft', passport.authenticate('microsoft', { session: false }));
router.get('/microsoft/callback',
    passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=auth_failed_ms' }),
    function (req, res) {
        // Successful authentication
        const user = req.user;
        const token = 'mock-jwt-token-' + user.id;
        res.redirect(`/login?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    }
);

module.exports = router;
