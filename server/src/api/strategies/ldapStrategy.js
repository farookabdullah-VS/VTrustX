const LdapStrategy = require('passport-ldapauth');
const logger = require('../../infrastructure/logger');
const SSOService = require('../../services/SSOService');

/**
 * Create a dynamic LDAP strategy for a specific provider
 * @param {Object} provider - SSO provider configuration
 * @returns {LdapStrategy}
 */
function createLDAPStrategy(provider) {
    const ldapConfig = {
        server: {
            url: provider.ldap_url,
            bindDN: provider.ldap_bind_dn,
            bindCredentials: provider.ldap_bind_password,
            searchBase: provider.ldap_search_base,
            searchFilter: provider.ldap_search_filter || '(uid={{username}})',

            // TLS/SSL options
            tlsOptions: {
                rejectUnauthorized: provider.ldap_verify_cert !== false
            },

            // Search options
            searchAttributes: ['uid', 'mail', 'cn', 'sn', 'givenName', 'displayName', 'memberOf'],

            // Reconnect settings
            reconnect: true,

            // Timeout settings
            timeout: 5000,
            connectTimeout: 10000
        },

        // Username field from login form
        usernameField: 'username',
        passwordField: 'password',

        // Pass req to verify callback
        passReqToCallback: false
    };

    return new LdapStrategy(
        ldapConfig,
        async (ldapUser, done) => {
            try {
                logger.info('[LDAP] User authenticated', {
                    providerId: provider.id,
                    providerName: provider.name,
                    username: ldapUser.uid || ldapUser.sAMAccountName
                });

                // Extract user attributes from LDAP response
                const idpProfile = {
                    idp_user_id: ldapUser.uid || ldapUser.sAMAccountName || ldapUser.dn,
                    email: extractLdapAttribute(ldapUser, provider.claim_mappings?.email || 'mail'),
                    name: extractLdapAttribute(ldapUser, provider.claim_mappings?.name || 'cn') ||
                          extractLdapAttribute(ldapUser, 'displayName') ||
                          `${ldapUser.givenName || ''} ${ldapUser.sn || ''}`.trim() ||
                          'LDAP User',
                    role: extractLdapRole(ldapUser, provider.claim_mappings?.role),
                    attributes: ldapUser
                };

                logger.debug('[LDAP] Extracted profile', { idpProfile });

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
                logger.error('[LDAP] Authentication error', {
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
                    logger.error('[LDAP] Failed to log error', { error: logError.message });
                }

                done(error);
            }
        }
    );
}

/**
 * Extract attribute from LDAP user object
 * Handles both single values and arrays
 */
function extractLdapAttribute(ldapUser, attributeName) {
    if (!attributeName || !ldapUser) return null;

    const value = ldapUser[attributeName];

    if (Array.isArray(value)) {
        return value[0] || null;
    }

    return value || null;
}

/**
 * Extract role from LDAP user object
 * Supports memberOf attribute (Active Directory groups)
 */
function extractLdapRole(ldapUser, roleMapping) {
    if (!roleMapping) return null;

    // If explicit role attribute is specified
    if (ldapUser[roleMapping]) {
        return extractLdapAttribute(ldapUser, roleMapping);
    }

    // Check memberOf groups (Active Directory)
    if (ldapUser.memberOf) {
        const groups = Array.isArray(ldapUser.memberOf) ? ldapUser.memberOf : [ldapUser.memberOf];

        // Extract CN from DN format (e.g., "CN=Admins,OU=Groups,DC=example,DC=com" -> "Admins")
        const groupNames = groups.map(dn => {
            const match = dn.match(/CN=([^,]+)/i);
            return match ? match[1] : dn;
        });

        // Map common AD groups to platform roles
        const roleMap = {
            'Domain Admins': 'admin',
            'Administrators': 'admin',
            'Admins': 'admin',
            'Users': 'user',
            'Managers': 'manager',
            'Editors': 'editor',
            'Viewers': 'viewer'
        };

        for (const group of groupNames) {
            if (roleMap[group]) {
                return roleMap[group];
            }
        }

        // Return first group name if no mapping found
        return groupNames[0] || null;
    }

    return null;
}

/**
 * Test LDAP connection
 * @param {Object} config - LDAP configuration
 * @returns {Promise<Object>}
 */
async function testLDAPConnection(config) {
    const ldap = require('ldapjs');

    return new Promise((resolve, reject) => {
        const client = ldap.createClient({
            url: config.ldap_url,
            timeout: 5000,
            connectTimeout: 10000,
            tlsOptions: {
                rejectUnauthorized: config.ldap_verify_cert !== false
            }
        });

        client.on('error', (err) => {
            logger.error('[LDAP] Connection error', { error: err.message });
            client.unbind();
            reject(new Error(`LDAP connection failed: ${err.message}`));
        });

        // Test bind with service account
        client.bind(config.ldap_bind_dn, config.ldap_bind_password, (err) => {
            if (err) {
                logger.error('[LDAP] Bind failed', { error: err.message });
                client.unbind();
                return reject(new Error(`LDAP bind failed: ${err.message}`));
            }

            logger.info('[LDAP] Bind successful');

            // Test search
            const searchFilter = config.ldap_search_filter?.replace('{{username}}', '*') || '(objectClass=*)';
            const searchOptions = {
                filter: searchFilter,
                scope: 'sub',
                sizeLimit: 1,
                attributes: ['dn', 'cn', 'mail']
            };

            client.search(config.ldap_search_base, searchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    logger.error('[LDAP] Search failed', { error: searchErr.message });
                    client.unbind();
                    return reject(new Error(`LDAP search failed: ${searchErr.message}`));
                }

                let entryFound = false;

                searchRes.on('searchEntry', (entry) => {
                    entryFound = true;
                    logger.info('[LDAP] Search successful', { dn: entry.objectName });
                });

                searchRes.on('error', (err) => {
                    logger.error('[LDAP] Search error', { error: err.message });
                    client.unbind();
                    reject(new Error(`LDAP search error: ${err.message}`));
                });

                searchRes.on('end', (result) => {
                    client.unbind();

                    if (result.status === 0) {
                        resolve({
                            success: true,
                            message: 'LDAP connection and search successful',
                            entryFound
                        });
                    } else {
                        reject(new Error(`LDAP search returned status: ${result.status}`));
                    }
                });
            });
        });
    });
}

module.exports = {
    createLDAPStrategy,
    testLDAPConnection
};
