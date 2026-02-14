const express = require('express');
const router = express.Router();
const passport = require('passport');
const logger = require('../../infrastructure/logger');
const SSOService = require('../../services/SSOService');
const { createSAMLStrategy, generateSAMLMetadata } = require('../strategies/samlStrategy');
const { createOIDCStrategy } = require('../strategies/oidcStrategy');
const { query } = require('../../infrastructure/database/db');

// Helper to get callback URL for a provider
function getCallbackUrl(req, providerId) {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}/api/auth/sso/${providerId}/callback`;
}

// Issue tokens as cookies (reused from auth.js)
const crypto = require('crypto');
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

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

const getAccessCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
});

const getRefreshCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
});

async function issueTokens(res, user) {
    const accessToken = signAccessToken(user);
    let refreshToken;
    try {
        refreshToken = await createRefreshToken(user.id);
    } catch (e) {
        logger.warn('Could not create refresh token', { error: e.message });
    }

    res.cookie('access_token', accessToken, getAccessCookieOptions());
    if (refreshToken) {
        res.cookie('refresh_token', refreshToken, getRefreshCookieOptions());
    }
}

/**
 * @swagger
 * /api/auth/sso/{providerId}:
 *   get:
 *     tags: [SSO]
 *     summary: Initiate SSO login
 *     description: Redirects to the identity provider for authentication
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: SSO provider ID
 */
router.get('/sso/:providerId', async (req, res, next) => {
    try {
        const { providerId } = req.params;

        // Get provider configuration
        const provider = await SSOService.getProviderById(parseInt(providerId));

        if (!provider || !provider.enabled) {
            return res.status(404).json({ error: 'SSO provider not found or disabled' });
        }

        const callbackUrl = getCallbackUrl(req, providerId);

        logger.info('[SSO] Initiating login', {
            providerId: provider.id,
            providerName: provider.name,
            providerType: provider.provider_type
        });

        // Create and register strategy dynamically
        if (provider.provider_type === 'saml') {
            const strategy = createSAMLStrategy(provider, callbackUrl);
            passport.use(`saml-${providerId}`, strategy);

            // Use passport to initiate SAML authentication
            passport.authenticate(`saml-${providerId}`, {
                failureRedirect: '/login?error=sso_failed',
                session: false
            })(req, res, next);
        } else if (provider.provider_type === 'oauth2' || provider.provider_type === 'oidc') {
            const strategy = await createOIDCStrategy(provider, callbackUrl);
            passport.use(`oidc-${providerId}`, strategy);

            // Use passport to initiate OIDC authentication
            passport.authenticate(`oidc-${providerId}`, {
                failureRedirect: '/login?error=sso_failed',
                session: false
            })(req, res, next);
        } else {
            return res.status(400).json({ error: 'Unsupported provider type' });
        }
    } catch (error) {
        logger.error('[SSO] Initiation error', {
            error: error.message,
            stack: error.stack
        });
        res.redirect('/login?error=sso_error');
    }
});

/**
 * @swagger
 * /api/auth/sso/{providerId}/callback:
 *   post:
 *     tags: [SSO]
 *     summary: Handle SSO callback
 *     description: Processes the authentication response from the identity provider
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: SSO provider ID
 */
router.post('/sso/:providerId/callback', async (req, res, next) => {
    try {
        const { providerId } = req.params;

        // Get provider configuration
        const provider = await SSOService.getProviderById(parseInt(providerId));

        if (!provider || !provider.enabled) {
            return res.redirect('/login?error=sso_provider_disabled');
        }

        const callbackUrl = getCallbackUrl(req, providerId);

        logger.info('[SSO] Processing callback', {
            providerId: provider.id,
            providerName: provider.name,
            providerType: provider.provider_type
        });

        // Create and register strategy dynamically
        if (provider.provider_type === 'saml') {
            const strategy = createSAMLStrategy(provider, callbackUrl);
            passport.use(`saml-${providerId}`, strategy);

            // Use passport to process SAML response
            passport.authenticate(`saml-${providerId}`, {
                failureRedirect: '/login?error=sso_authentication_failed',
                session: false
            }, async (err, user, info) => {
                if (err) {
                    logger.error('[SSO] Authentication error', { error: err.message });
                    return res.redirect('/login?error=sso_error');
                }

                if (!user) {
                    logger.warn('[SSO] Authentication failed', { info });
                    return res.redirect('/login?error=sso_no_user');
                }

                try {
                    // Issue tokens
                    await issueTokens(res, user);

                    logger.info('[SSO] Login successful', {
                        userId: user.id,
                        username: user.username,
                        providerId: provider.id,
                        isNewUser: user.isNewUser
                    });

                    // Redirect to dashboard
                    res.redirect('/');
                } catch (tokenError) {
                    logger.error('[SSO] Token issuance error', { error: tokenError.message });
                    res.redirect('/login?error=token_error');
                }
            })(req, res, next);
        } else if (provider.provider_type === 'oauth2' || provider.provider_type === 'oidc') {
            const strategy = await createOIDCStrategy(provider, callbackUrl);
            passport.use(`oidc-${providerId}`, strategy);

            // Use passport to process OIDC response
            passport.authenticate(`oidc-${providerId}`, {
                failureRedirect: '/login?error=sso_authentication_failed',
                session: false
            }, async (err, user, info) => {
                if (err) {
                    logger.error('[SSO] Authentication error', { error: err.message });
                    return res.redirect('/login?error=sso_error');
                }

                if (!user) {
                    logger.warn('[SSO] Authentication failed', { info });
                    return res.redirect('/login?error=sso_no_user');
                }

                try {
                    // Issue tokens
                    await issueTokens(res, user);

                    logger.info('[SSO] Login successful', {
                        userId: user.id,
                        username: user.username,
                        providerId: provider.id,
                        isNewUser: user.isNewUser
                    });

                    // Redirect to dashboard
                    res.redirect('/');
                } catch (tokenError) {
                    logger.error('[SSO] Token issuance error', { error: tokenError.message });
                    res.redirect('/login?error=token_error');
                }
            })(req, res, next);
        } else {
            return res.redirect('/login?error=unsupported_provider');
        }
    } catch (error) {
        logger.error('[SSO] Callback error', {
            error: error.message,
            stack: error.stack
        });
        res.redirect('/login?error=sso_error');
    }
});

/**
 * GET callback for OIDC (some providers use GET instead of POST)
 */
router.get('/sso/:providerId/callback', async (req, res, next) => {
    try {
        const { providerId } = req.params;

        // Get provider configuration
        const provider = await SSOService.getProviderById(parseInt(providerId));

        if (!provider || !provider.enabled) {
            return res.redirect('/login?error=sso_provider_disabled');
        }

        // Only support GET callback for OIDC
        if (provider.provider_type !== 'oauth2' && provider.provider_type !== 'oidc') {
            return res.redirect('/login?error=invalid_callback');
        }

        const callbackUrl = getCallbackUrl(req, providerId);
        const strategy = await createOIDCStrategy(provider, callbackUrl);
        passport.use(`oidc-${providerId}`, strategy);

        passport.authenticate(`oidc-${providerId}`, {
            failureRedirect: '/login?error=sso_authentication_failed',
            session: false
        }, async (err, user, info) => {
            if (err) {
                logger.error('[SSO] Authentication error', { error: err.message });
                return res.redirect('/login?error=sso_error');
            }

            if (!user) {
                logger.warn('[SSO] Authentication failed', { info });
                return res.redirect('/login?error=sso_no_user');
            }

            try {
                // Issue tokens
                await issueTokens(res, user);

                logger.info('[SSO] Login successful', {
                    userId: user.id,
                    username: user.username,
                    providerId: provider.id
                });

                // Redirect to dashboard
                res.redirect('/');
            } catch (tokenError) {
                logger.error('[SSO] Token issuance error', { error: tokenError.message });
                res.redirect('/login?error=token_error');
            }
        })(req, res, next);
    } catch (error) {
        logger.error('[SSO] Callback error', {
            error: error.message,
            stack: error.stack
        });
        res.redirect('/login?error=sso_error');
    }
});

/**
 * @swagger
 * /api/auth/sso/{providerId}/metadata:
 *   get:
 *     tags: [SSO]
 *     summary: Get SAML metadata
 *     description: Returns SAML metadata XML for configuring the identity provider
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: SSO provider ID
 */
router.get('/sso/:providerId/metadata', async (req, res) => {
    try {
        const { providerId } = req.params;

        // Get provider configuration
        const provider = await SSOService.getProviderById(parseInt(providerId));

        if (!provider) {
            return res.status(404).json({ error: 'SSO provider not found' });
        }

        if (provider.provider_type !== 'saml') {
            return res.status(400).json({ error: 'Metadata only available for SAML providers' });
        }

        const callbackUrl = getCallbackUrl(req, providerId);
        const metadata = generateSAMLMetadata(provider, callbackUrl);

        res.set('Content-Type', 'application/xml');
        res.send(metadata);
    } catch (error) {
        logger.error('[SSO] Metadata generation error', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Failed to generate metadata' });
    }
});

/**
 * @swagger
 * /api/auth/sso/{providerId}/logout:
 *   post:
 *     tags: [SSO]
 *     summary: Handle SSO logout
 *     description: Processes Single Logout (SLO) from the identity provider
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: SSO provider ID
 */
router.post('/sso/:providerId/logout', async (req, res) => {
    try {
        const { providerId } = req.params;

        // Get provider configuration
        const provider = await SSOService.getProviderById(parseInt(providerId));

        if (!provider || provider.provider_type !== 'saml') {
            return res.redirect('/login');
        }

        const callbackUrl = getCallbackUrl(req, providerId);
        const strategy = createSAMLStrategy(provider, callbackUrl);
        passport.use(`saml-${providerId}`, strategy);

        // Process logout response
        req.logout(() => {
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            res.redirect('/login');
        });
    } catch (error) {
        logger.error('[SSO] Logout error', {
            error: error.message,
            stack: error.stack
        });
        res.redirect('/login');
    }
});

module.exports = router;
