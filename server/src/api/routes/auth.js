const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const passport = require('passport');
const logger = require('../../infrastructure/logger');
const User = require('../../core/entities/User');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const { query, transaction } = require('../../infrastructure/database/db');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, changePasswordSchema } = require('../schemas/auth.schemas');
const { loginAttemptCache } = require('../../infrastructure/cache');

const MAX_LOGIN_ATTEMPTS = 5;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Separate repo for users
const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

// Helper to sign short-lived access JWT
const signAccessToken = (user) => {
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
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

// Generate a secure random refresh token and store its hash in DB
async function createRefreshToken(userId) {
    const token = crypto.randomBytes(48).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );

    return token;
}

// Cookie options helpers
const getAccessCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15min
    path: '/',
});

const getRefreshCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth', // Only sent to auth endpoints
});

// Issue both tokens as cookies
async function issueTokens(res, user) {
    const accessToken = signAccessToken(user);
    let refreshToken;
    try {
        refreshToken = await createRefreshToken(user.id);
    } catch (e) {
        // refresh_tokens table may not exist yet — log and continue without refresh
        logger.warn('Could not create refresh token (table may not exist)', { error: e.message });
    }

    res.cookie('access_token', accessToken, getAccessCookieOptions());
    if (refreshToken) {
        res.cookie('refresh_token', refreshToken, getRefreshCookieOptions());
    }
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new tenant and admin user. The tenant and user are created atomically within a database transaction.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 role:
 *                   type: string
 *                 tenant_id:
 *                   type: integer
 *       409:
 *         description: Username already exists
 *       500:
 *         description: Server error
 */
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

        // Create Tenant + User atomically in a transaction
        const saved = await transaction(async (client) => {
            const txTenantRepo = tenantRepo.withClient(client);
            const txUserRepo = userRepo.withClient(client);

            const tenantName = `${username}'s Organization`;
            const newTenant = await txTenantRepo.create({
                name: tenantName,
                plan: 'free',
                subscription_status: 'active',
                created_at: new Date()
            });

            const newUser = {
                username,
                password: passwordHash,
                role: 'admin',
                tenant_id: newTenant.id,
                created_at: new Date()
            };

            return await txUserRepo.create(newUser);
        });

        // Return without password
        const { password: _, ...safeUser } = saved;
        res.status(201).json(safeUser);

    } catch (error) {
        logger.error("Register Error", { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     description: Authenticates a user with username and password. Sets httpOnly cookies for access and refresh tokens. Implements account lockout after 5 failed attempts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                     tenant_id:
 *                       type: integer
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Account temporarily locked due to too many failed attempts
 *       500:
 *         description: Server error
 */
router.post('/login', validate(loginSchema), async (req, res) => {
    try {
        const { username, password } = req.body;

        // Account lockout check
        const lockoutKey = `login_attempts:${username}`;
        const attempts = loginAttemptCache.get(lockoutKey) || 0;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            return res.status(429).json({
                error: 'Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.'
            });
        }

        const user = await userRepo.findBy('username', username);

        if (!user) {
            loginAttemptCache.set(lockoutKey, attempts + 1, 900);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify Password (Bcrypt)
        const bcrypt = require('bcryptjs');
        let isMatch = false;

        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            return res.status(401).json({
                error: 'Password requires reset. Please use the password reset flow.',
                requiresReset: true
            });
        }

        if (!isMatch) {
            loginAttemptCache.set(lockoutKey, attempts + 1, 900);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Reset lockout counter on successful login
        loginAttemptCache.del(lockoutKey);

        // Update last login timestamp
        await userRepo.update(user.id, { last_login_at: new Date() });

        const { password: _, ...safeUser } = user;

        // Issue access + refresh token cookies
        await issueTokens(res, user);

        res.json({ user: safeUser });

    } catch (error) {
        logger.error("Login Error", { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Rotates the refresh token and issues a new access token. The old refresh token is revoked. Requires a valid refresh_token cookie.
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                     tenant_id:
 *                       type: integer
 *       401:
 *         description: No refresh token, or token is invalid/expired
 *       500:
 *         description: Server error
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) {
            return res.status(401).json({ error: 'No refresh token' });
        }

        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        // Find the token in DB
        const result = await query(
            `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            // Potential token reuse attack — revoke all tokens for this family
            res.clearCookie('access_token', { path: '/' });
            res.clearCookie('refresh_token', { path: '/api/auth' });
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        const storedToken = result.rows[0];

        // Revoke old refresh token (rotation)
        await query(
            `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
            [storedToken.id]
        );

        // Look up user
        const user = await userRepo.findById(storedToken.user_id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const { password: _, ...safeUser } = user;

        // Issue new token pair
        await issueTokens(res, user);

        res.json({ user: safeUser });
    } catch (error) {
        logger.error("Refresh Error", { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     description: Clears access and refresh token cookies. Revokes the refresh token in the database on a best-effort basis.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/logout', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (refreshToken) {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await query(
                `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
                [tokenHash]
            ).catch(() => {}); // Best-effort revocation
        }
    } catch (e) {
        // Best effort
    }

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.json({ success: true, message: 'Logged out successfully' });
});

// OAUTH ROUTES

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth redirect
 *     description: Initiates Google OAuth2 flow. Redirects the user to Google's consent screen requesting profile and email scopes.
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth consent screen
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback
 *     description: Handles the callback from Google OAuth. On success, issues access and refresh token cookies and redirects to the app. On failure, redirects to login with an error.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *     responses:
 *       302:
 *         description: Redirects to /login?oauth=success on success, or /login?error=auth_failed on failure
 */
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=auth_failed' }),
    async function (req, res) {
        const user = req.user;
        await issueTokens(res, user);
        res.redirect(`/login?oauth=success`);
    }
);

/**
 * @swagger
 * /api/auth/microsoft:
 *   get:
 *     tags: [Auth]
 *     summary: Microsoft OAuth redirect
 *     description: Initiates Microsoft OAuth2 flow. Redirects the user to Microsoft's consent screen.
 *     responses:
 *       302:
 *         description: Redirects to Microsoft OAuth consent screen
 */
router.get('/microsoft', passport.authenticate('microsoft', { session: false }));

/**
 * @swagger
 * /api/auth/microsoft/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Microsoft OAuth callback
 *     description: Handles the callback from Microsoft OAuth. On success, issues access and refresh token cookies and redirects to the app. On failure, redirects to login with an error.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Microsoft
 *     responses:
 *       302:
 *         description: Redirects to /login?oauth=success on success, or /login?error=auth_failed_ms on failure
 */
router.get('/microsoft/callback',
    passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=auth_failed_ms' }),
    async function (req, res) {
        const user = req.user;
        await issueTokens(res, user);
        res.redirect(`/login?oauth=success`);
    }
);

const authenticate = require('../middleware/auth');

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     description: Returns the currently authenticated user's profile by reading the httpOnly access_token cookie and verifying the JWT.
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                     tenant_id:
 *                       type: integer
 *       401:
 *         description: No auth cookie, user not found, or invalid/expired token
 *       500:
 *         description: JWT_SECRET not configured
 */
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies?.access_token;
        if (!token) return res.status(401).json({ error: 'No auth cookie' });

        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET;
        if (!secret) return res.status(500).json({ error: 'JWT_SECRET not configured' });

        const decoded = jwt.verify(token, secret);
        const user = await userRepo.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const { password: _, ...safeUser } = user;
        res.json({ user: safeUser });
    } catch (e) {
        res.status(401).json({ error: 'Invalid or expired auth cookie' });
    }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password
 *     description: Changes the authenticated user's password. Requires the current password for verification. The new password is bcrypt-hashed before storage.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Incorrect current password or not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

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
        logger.error("Change Password Error", { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
