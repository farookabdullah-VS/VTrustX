const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../../core/entities/User');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, changePasswordSchema } = require('../schemas/auth.schemas');

// Separate repo for users
const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

// Register
router.post('/register', validate(registerSchema), async (req, res) => {
    try {
        const { username, password } = req.body;

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
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required.');
    }
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
router.post('/login', validate(loginSchema), async (req, res) => {
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
            // Force password reset for legacy plaintext passwords
            return res.status(401).json({
                error: 'Password requires reset. Please use the password reset flow.',
                requiresReset: true
            });
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

        // Set token in a secure httpOnly cookie instead of URL query params
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24h
        });
        res.redirect(`/login?oauth=success`);
    }
);

router.get('/microsoft', passport.authenticate('microsoft', { session: false }));
router.get('/microsoft/callback',
    passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=auth_failed_ms' }),
    function (req, res) {
        const user = req.user;
        const token = signToken(user); // REAL JWT
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.redirect(`/login?oauth=success`);
    }
);

const authenticate = require('../middleware/auth');

// OAuth cookie-based auth: returns current user from httpOnly cookie
router.get('/me', async (req, res) => {
    try {
        // Parse cookie manually to avoid cookie-parser dependency
        const cookieHeader = req.headers.cookie || '';
        const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim())));
        const token = cookies.auth_token;
        if (!token) return res.status(401).json({ error: 'No auth cookie' });

        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET;
        if (!secret) return res.status(500).json({ error: 'JWT_SECRET not configured' });

        const decoded = jwt.verify(token, secret);
        const user = await userRepo.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const { password: _, ...safeUser } = user;
        // Clear the cookie after reading (token handed off to client localStorage via response)
        res.clearCookie('auth_token');
        res.json({ user: safeUser, token });
    } catch (e) {
        res.status(401).json({ error: 'Invalid or expired auth cookie' });
    }
});

router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

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
            // Legacy plaintext: still allow change-password to upgrade
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
