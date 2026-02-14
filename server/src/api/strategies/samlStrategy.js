const { Strategy: SamlStrategy } = require('@node-saml/passport-saml');
const logger = require('../../infrastructure/logger');
const SSOService = require('../../services/SSOService');

/**
 * Create a dynamic SAML strategy for a specific provider
 * @param {Object} provider - SSO provider configuration
 * @param {string} callbackUrl - Callback URL for this provider
 * @returns {SamlStrategy}
 */
function createSAMLStrategy(provider, callbackUrl) {
    const strategyConfig = {
        // Identity Provider (IdP) settings
        entryPoint: provider.saml_sso_url,
        issuer: provider.saml_entity_id || `vtrust-sp-${provider.id}`,
        cert: provider.saml_x509_cert,

        // Service Provider (SP) settings
        callbackUrl,
        audience: provider.saml_entity_id || `vtrust-sp-${provider.id}`,

        // Signature settings
        wantAssertionsSigned: provider.saml_signed_assertions || false,
        signatureAlgorithm: 'sha256',

        // Attribute mapping
        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',

        // Additional settings
        disableRequestedAuthnContext: true,
        forceAuthn: false,

        // Logout settings (if configured)
        logoutUrl: provider.saml_slo_url || null,
        logoutCallbackUrl: provider.saml_slo_url ? `${callbackUrl}/logout` : null,
    };

    return new SamlStrategy(
        strategyConfig,
        async (profile, done) => {
            try {
                logger.info('[SAML] User authenticated', {
                    providerId: provider.id,
                    providerName: provider.name,
                    nameID: profile.nameID
                });

                // Extract user attributes from SAML response
                const idpProfile = {
                    idp_user_id: profile.nameID,
                    email: profile[provider.claim_mappings?.email || 'email'] ||
                           profile.email ||
                           profile.nameID,
                    name: profile[provider.claim_mappings?.name || 'displayName'] ||
                          profile.displayName ||
                          profile.name ||
                          'SAML User',
                    role: profile[provider.claim_mappings?.role || 'role'] || null,
                    attributes: profile
                };

                logger.debug('[SAML] Extracted profile', { idpProfile });

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
                logger.error('[SAML] Authentication error', {
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
                    logger.error('[SAML] Failed to log error', { error: logError.message });
                }

                done(error);
            }
        }
    );
}

/**
 * Generate SAML metadata XML for a provider
 * @param {Object} provider - SSO provider configuration
 * @param {string} callbackUrl - Callback URL for this provider
 * @returns {string} - SAML metadata XML
 */
function generateSAMLMetadata(provider, callbackUrl) {
    const entityId = provider.saml_entity_id || `vtrust-sp-${provider.id}`;

    const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false"
                   WantAssertionsSigned="${provider.saml_signed_assertions || false}"
                   protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                              Location="${callbackUrl}"
                              index="0"
                              isDefault="true"/>
    ${provider.saml_slo_url ? `
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                         Location="${callbackUrl}/logout"/>
    ` : ''}
  </SPSSODescriptor>
</EntityDescriptor>`;

    return metadata;
}

module.exports = {
    createSAMLStrategy,
    generateSAMLMetadata
};
