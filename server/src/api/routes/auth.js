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
        const { username, password } = req.body; // Remove role from body

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
            password: passwordHash,
            role: 'admin', // Always default to Admin for first user
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

// Helper to sign JWT
const signToken = (user) => {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'vtrustx_secret_key_2024';
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
            tenant_id: user.tenant_id
        },
        secret,
        { expiresIn: '24h' }
    );
};

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await userRepo.findBy('username', username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify Password (Bcrypt)
        const bcrypt = require('bcryptjs');
        let isMatch = false;

        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // Legacy plain text check
            isMatch = (user.password === password);
            if (isMatch) {
                // Auto-upgrade to hash
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(password, salt);
                await userRepo.update(user.id, { password: hash });
            }
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login timestamp
        await userRepo.update(user.id, { last_login_at: new Date() });

        const token = signToken(user);
        const { password: _, ...safeUser } = user;

        res.json({
            user: safeUser,
            token: token
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// OAUTH ROUTES
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=auth_failed' }),
    function (req, res) {
        const user = req.user;
        const token = signToken(user); // REAL JWT

        res.redirect(`/login?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    }
);

router.get('/microsoft', passport.authenticate('microsoft', { session: false }));
router.get('/microsoft/callback',
    passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=auth_failed_ms' }),
    function (req, res) {
        const user = req.user;
        const token = signToken(user); // REAL JWT
        res.redirect(`/login?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    }
);

const authenticate = require('../middleware/auth');

router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Use authenticated user's ID, not username from body
        const user = await userRepo.findById(req.user.id);
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

        await userRepo.update(user.id, { password: hash, updated_at: new Date() });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
