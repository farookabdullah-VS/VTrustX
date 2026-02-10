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
        const existingUser = await userRepo.findBy('username', username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

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
        const newUser = {
            username,
            password: passwordHash, // Store Hash
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
        const user = await userRepo.findBy('username', username);

        if (!user) {
            console.log(`User '${username}' NOT FOUND in DB.`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify Password (Bcrypt)
        const bcrypt = require('bcryptjs');
        let isMatch = false;

        // Handle migration: Check if password is hash (starts with $2a$ or $2b$) or plain
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // Legacy plain text check (can update to hash here automatically if we wanted)
            isMatch = (user.password === password);
            if (isMatch) {
                // Auto-upgrade to hash
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(password, salt);
                await userRepo.update(user.id, { password: hash });
                console.log(`Migrated user ${user.username} to hashed password.`);
            }
        }

        if (!isMatch) {
            console.log(`User '${username}' found but match failed.`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Return user info (client will store this to "simulate" session)
        const jwt = require('jsonwebtoken');

        // Return user info
        const { password: _, ...safeUser } = user;

        // Generate real JWT
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                tenant_id: user.tenant_id
            },
            process.env.JWT_SECRET || 'vtrustx_secret_key_2024',
            { expiresIn: '24h' }
        );

        res.json({
            user: safeUser,
            token: token
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

router.post('/change-password', async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;

        if (!username || !currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await userRepo.findBy('username', username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify Current Password
        const bcrypt = require('bcryptjs');
        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(currentPassword, user.password);
        } else {
            isMatch = (user.password === currentPassword);
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        // Hash New Password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await userRepo.update(user.id, { password: hash });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
