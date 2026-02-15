/**
 * Single Sign-On (SSO) Routes
 *
 * Endpoints for SSO configuration and authentication:
 * - GET /api/sso/providers - List SSO providers
 * - POST /api/sso/providers - Create SSO provider (admin only)
 * - GET /api/sso/providers/:id - Get provider details (admin only)
 * - PUT /api/sso/providers/:id - Update provider (admin only)
 * - DELETE /api/sso/providers/:id - Delete provider (admin only)
 * - GET /api/sso/enabled - List enabled providers (public for login page)
 * - GET /api/sso/stats - Get SSO statistics (admin only)
 * - GET /api/sso/sessions - Get user's active SSO sessions
 *
 * Authentication endpoints (implemented in separate auth flow):
 * - GET /api/auth/sso/:providerId/login - Initiate SSO login
 * - POST /api/auth/sso/:providerId/callback - Handle SSO callback
 * - POST /api/auth/sso/logout - SSO logout
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const SSOService = require('../../services/SSOService');
const logger = require('../../infrastructure/logger');

/**
 * GET /api/sso/providers
 * List all SSO providers for tenant (admin only)
 */
router.get('/providers', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const providers = await SSOService.listProviders(tenantId);

        return res.json({
            providers,
            count: providers.length
        });
    } catch (error) {
        logger.error('[SSO API] List providers failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to list SSO providers'
        });
    }
});

/**
 * POST /api/sso/providers
 * Create new SSO provider (admin only)
 */
router.post('/providers', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;

        const provider = await SSOService.createProvider(tenantId, userId, req.body);

        return res.status(201).json({
            success: true,
            provider
        });
    } catch (error) {
        logger.error('[SSO API] Create provider failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(400).json({
            error: error.message || 'Failed to create SSO provider'
        });
    }
});

/**
 * GET /api/sso/providers/:id
 * Get provider details (admin only)
 */
router.get('/providers/:id', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const providerId = parseInt(req.params.id);
        const tenantId = req.user.tenant_id;

        const provider = await SSOService.getProvider(providerId, tenantId);

        // Don't send decrypted secrets to client
        if (provider.oauth_client_secret) {
            provider.oauth_client_secret = '***' + provider.oauth_client_secret.slice(-4);
        }

        return res.json(provider);
    } catch (error) {
        logger.error('[SSO API] Get provider failed', {
            error: error.message,
            providerId: req.params.id,
            tenantId: req.user?.tenant_id
        });
        return res.status(404).json({
            error: error.message || 'SSO provider not found'
        });
    }
});

/**
 * PUT /api/sso/providers/:id
 * Update SSO provider (admin only)
 */
router.put('/providers/:id', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const providerId = parseInt(req.params.id);
        const tenantId = req.user.tenant_id;

        const provider = await SSOService.updateProvider(providerId, tenantId, req.body);

        return res.json({
            success: true,
            provider
        });
    } catch (error) {
        logger.error('[SSO API] Update provider failed', {
            error: error.message,
            providerId: req.params.id,
            tenantId: req.user?.tenant_id
        });
        return res.status(400).json({
            error: error.message || 'Failed to update SSO provider'
        });
    }
});

/**
 * DELETE /api/sso/providers/:id
 * Delete SSO provider (admin only)
 */
router.delete('/providers/:id', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const providerId = parseInt(req.params.id);
        const tenantId = req.user.tenant_id;

        await SSOService.deleteProvider(providerId, tenantId);

        return res.json({
            success: true,
            message: 'SSO provider deleted'
        });
    } catch (error) {
        logger.error('[SSO API] Delete provider failed', {
            error: error.message,
            providerId: req.params.id,
            tenantId: req.user?.tenant_id
        });
        return res.status(400).json({
            error: error.message || 'Failed to delete SSO provider'
        });
    }
});

/**
 * GET /api/sso/enabled
 * List enabled SSO providers (public - for login page)
 */
router.get('/enabled', async (req, res) => {
    try {
        const { domain } = req.query;

        if (!domain) {
            return res.status(400).json({
                error: 'domain parameter is required'
            });
        }

        // Get tenant by domain
        const tenantResult = await require('../../infrastructure/database/db').query(
            `SELECT id FROM tenants WHERE domain = $1 OR custom_domain = $1`,
            [domain]
        );

        if (tenantResult.rows.length === 0) {
            return res.json({
                providers: []
            });
        }

        const tenantId = tenantResult.rows[0].id;
        const providers = await SSOService.getEnabledProviders(tenantId);

        // Only return public information
        const publicProviders = providers.map(p => ({
            id: p.id,
            name: p.name,
            provider_type: p.provider_type
        }));

        return res.json({
            providers: publicProviders,
            count: publicProviders.length
        });
    } catch (error) {
        logger.error('[SSO API] Get enabled providers failed', {
            error: error.message,
            domain: req.query.domain
        });
        return res.status(500).json({
            error: 'Failed to get SSO providers'
        });
    }
});

/**
 * GET /api/sso/stats
 * Get SSO statistics (admin only)
 */
router.get('/stats', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const days = parseInt(req.query.days) || 30;

        const stats = await SSOService.getStats(tenantId, days);

        return res.json({
            stats,
            period: `${days} days`
        });
    } catch (error) {
        logger.error('[SSO API] Get stats failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to get SSO statistics'
        });
    }
});

/**
 * GET /api/sso/sessions
 * Get user's active SSO sessions
 */
router.get('/sessions', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;

        const sessions = await SSOService.getUserSessions(userId, tenantId);

        return res.json({
            sessions,
            count: sessions.length
        });
    } catch (error) {
        logger.error('[SSO API] Get sessions failed', {
            error: error.message,
            userId: req.user?.id
        });
        return res.status(500).json({
            error: 'Failed to get SSO sessions'
        });
    }
});

/**
 * POST /api/sso/sessions/:id/logout
 * Logout specific SSO session
 */
router.post('/sessions/:id/logout', authenticate, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);

        // Verify session belongs to user
        const { query: dbQuery } = require('../../infrastructure/database/db');
        const sessionCheck = await dbQuery(
            `SELECT * FROM sso_login_sessions WHERE id = $1 AND user_id = $2`,
            [sessionId, req.user.id]
        );

        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found'
            });
        }

        const session = await SSOService.logoutSession(sessionId);

        return res.json({
            success: true,
            session
        });
    } catch (error) {
        logger.error('[SSO API] Logout session failed', {
            error: error.message,
            sessionId: req.params.id,
            userId: req.user?.id
        });
        return res.status(500).json({
            error: 'Failed to logout SSO session'
        });
    }
});

/**
 * POST /api/sso/test-connection
 * Test SSO provider configuration (admin only)
 * Returns validation errors without actually authenticating
 */
router.post('/test-connection', authenticate, requireRole('admin', 'tenant_admin'), async (req, res) => {
    try {
        const {
            provider_type,
            saml_entity_id,
            saml_sso_url,
            oauth_client_id,
            oauth_authorization_url,
            oauth_token_url,
            ldap_url,
            ldap_bind_dn,
            ldap_bind_password,
            ldap_search_base
        } = req.body;

        const errors = [];

        if (provider_type === 'saml') {
            if (!saml_entity_id) errors.push('SAML Entity ID is required');
            if (!saml_sso_url) errors.push('SAML SSO URL is required');

            // Validate URL format
            if (saml_sso_url && !saml_sso_url.startsWith('https://')) {
                errors.push('SAML SSO URL must use HTTPS');
            }
        }

        if (provider_type === 'oauth2' || provider_type === 'oidc') {
            if (!oauth_client_id) errors.push('OAuth Client ID is required');
            if (!oauth_authorization_url) errors.push('OAuth Authorization URL is required');
            if (!oauth_token_url) errors.push('OAuth Token URL is required');

            // Validate URL formats
            if (oauth_authorization_url && !oauth_authorization_url.startsWith('https://')) {
                errors.push('OAuth Authorization URL must use HTTPS');
            }
            if (oauth_token_url && !oauth_token_url.startsWith('https://')) {
                errors.push('OAuth Token URL must use HTTPS');
            }
        }

        if (provider_type === 'ldap') {
            if (!ldap_url) errors.push('LDAP Server URL is required');
            if (!ldap_bind_dn) errors.push('LDAP Bind DN is required');
            if (!ldap_bind_password) errors.push('LDAP Bind Password is required');
            if (!ldap_search_base) errors.push('LDAP Search Base is required');

            // Validate URL format
            if (ldap_url && !ldap_url.match(/^ldaps?:\/\//)) {
                errors.push('LDAP URL must start with ldap:// or ldaps://');
            }

            // If no validation errors, test actual LDAP connection
            if (errors.length === 0) {
                try {
                    const { testLDAPConnection } = require('../strategies/ldapStrategy');
                    const testResult = await testLDAPConnection(req.body);

                    return res.json({
                        valid: true,
                        message: 'LDAP connection successful',
                        details: testResult
                    });
                } catch (ldapError) {
                    return res.status(400).json({
                        valid: false,
                        errors: [ldapError.message]
                    });
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                valid: false,
                errors
            });
        }

        return res.json({
            valid: true,
            message: 'Configuration appears valid. Complete setup to test authentication.'
        });
    } catch (error) {
        logger.error('[SSO API] Test connection failed', {
            error: error.message,
            tenantId: req.user?.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to test connection'
        });
    }
});

module.exports = router;
