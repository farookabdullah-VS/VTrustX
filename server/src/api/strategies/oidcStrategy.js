const { Issuer, Strategy } = require('openid-client');
const logger = require('../../infrastructure/logger');
const SSOService = require('../../services/SSOService');

/**
 * Create a dynamic OIDC strategy for a specific provider
 * @param {Object} provider - SSO provider configuration
 * @param {string} callbackUrl - Callback URL for this provider
 * @returns {Promise<Strategy>}
 */
async function createOIDCStrategy(provider, callbackUrl) {
    try {
        // Try to discover OIDC configuration
        let client;

        if (provider.oauth_discovery_url) {
            // Use OIDC Discovery
            const issuer = await Issuer.discover(provider.oauth_discovery_url);
            logger.info('[OIDC] Discovered issuer', {
                providerId: provider.id,
                issuerName: issuer.issuer
            });

            client = new issuer.Client({
                client_id: provider.oauth_client_id,
                client_secret: provider.oauth_client_secret,
                redirect_uris: [callbackUrl],
                response_types: ['code']
            });
        } else {
            // Manual configuration
            const issuer = new Issuer({
                issuer: provider.name,
                authorization_endpoint: provider.oauth_authorization_url,
                token_endpoint: provider.oauth_token_url,
                userinfo_endpoint: provider.oauth_userinfo_url
            });

            client = new issuer.Client({
                client_id: provider.oauth_client_id,
                client_secret: provider.oauth_client_secret,
                redirect_uris: [callbackUrl],
                response_types: ['code']
            });
        }

        const params = {
            scope: provider.oauth_scopes || 'openid profile email',
            response_type: 'code'
        };

        return new Strategy(
            { client, params },
            async (tokenSet, userinfo, done) => {
                try {
                    logger.info('[OIDC] User authenticated', {
                        providerId: provider.id,
                        providerName: provider.name,
                        sub: userinfo.sub
                    });

                    // Extract user attributes from OIDC userinfo
                    const idpProfile = {
                        idp_user_id: userinfo.sub,
                        email: userinfo[provider.claim_mappings?.email || 'email'] ||
                               userinfo.email,
                        name: userinfo[provider.claim_mappings?.name || 'name'] ||
                              userinfo.name ||
                              userinfo.preferred_username ||
                              'OIDC User',
                        role: userinfo[provider.claim_mappings?.role || 'role'] ||
                              userinfo.role ||
                              null,
                        attributes: userinfo
                    };

                    logger.debug('[OIDC] Extracted profile', { idpProfile });

                    // Find or create user connection
                    const result = await SSOService.findOrCreateConnection(
                        provider.tenant_id,
                        provider.id,
                        idpProfile
                    );

                    if (!result.user) {
                        return done(null, false, { message: 'User not found and JIT provisioning is disabled' });
                    }

                    // Log successful SSO login
                    await SSOService.logSSOLogin(
                        provider.id,
                        result.user.id,
                        true,
                        null
                    );

                    // Return user object with provider info
                    done(null, {
                        ...result.user,
                        isNewUser: result.isNewUser,
                        providerId: provider.id,
                        providerName: provider.name
                    });
                } catch (error) {
                    logger.error('[OIDC] Authentication error', {
                        providerId: provider.id,
                        error: error.message,
                        stack: error.stack
                    });

                    // Log failed attempt
                    try {
                        await SSOService.logSSOLogin(
                            provider.id,
                            null,
                            false,
                            error.message
                        );
                    } catch (logError) {
                        logger.error('[OIDC] Failed to log error', { error: logError.message });
                    }

                    done(error);
                }
            }
        );
    } catch (error) {
        logger.error('[OIDC] Failed to create strategy', {
            providerId: provider.id,
            error: error.message
        });
        throw error;
    }
}

module.exports = {
    createOIDCStrategy
};
