/**
 * Add LDAP Support to SSO
 *
 * Adds LDAP/Active Directory protocol support to the SSO providers table.
 * Enables direct bind authentication against LDAP servers and Active Directory.
 *
 * Features:
 * - LDAP connection configuration (URL, bind credentials, search base)
 * - Flexible search filters with username substitution
 * - TLS/SSL support with certificate validation options
 * - Group-based role mapping (memberOf attribute)
 */

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // Add 'ldap' to the provider_type check constraint
    pgm.sql(`
        ALTER TABLE sso_providers
        DROP CONSTRAINT IF EXISTS sso_providers_provider_type_check;
    `);

    pgm.sql(`
        ALTER TABLE sso_providers
        ADD CONSTRAINT sso_providers_provider_type_check
        CHECK (provider_type IN ('saml', 'oauth2', 'oidc', 'ldap'));
    `);

    // Add LDAP-specific configuration columns
    pgm.addColumns('sso_providers', {
        ldap_url: {
            type: 'text',
            comment: 'LDAP server URL (e.g., ldap://ldap.example.com:389 or ldaps://ldap.example.com:636)'
        },
        ldap_bind_dn: {
            type: 'text',
            comment: 'Service account DN for LDAP bind (e.g., cn=admin,dc=example,dc=com)'
        },
        ldap_bind_password: {
            type: 'text',
            comment: 'Service account password (encrypted)'
        },
        ldap_search_base: {
            type: 'text',
            comment: 'Base DN for user search (e.g., ou=users,dc=example,dc=com)'
        },
        ldap_search_filter: {
            type: 'text',
            default: '(uid={{username}})',
            comment: 'LDAP search filter with {{username}} placeholder (e.g., (sAMAccountName={{username}}))'
        },
        ldap_verify_cert: {
            type: 'boolean',
            default: true,
            comment: 'Verify TLS/SSL certificate for ldaps:// connections'
        },
        ldap_group_search_base: {
            type: 'text',
            comment: 'Base DN for group search (optional, for group-based role mapping)'
        },
        ldap_group_search_filter: {
            type: 'text',
            comment: 'Group search filter (optional, e.g., (member={{dn}}))'
        }
    });

    // Add comment to the table
    pgm.sql(`
        COMMENT ON TABLE sso_providers IS 'SSO provider configurations supporting SAML 2.0, OAuth2/OIDC, and LDAP protocols';
    `);

    // Create index on provider_type for faster lookups
    pgm.createIndex('sso_providers', 'provider_type');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop LDAP columns
    pgm.dropColumns('sso_providers', [
        'ldap_url',
        'ldap_bind_dn',
        'ldap_bind_password',
        'ldap_search_base',
        'ldap_search_filter',
        'ldap_verify_cert',
        'ldap_group_search_base',
        'ldap_group_search_filter'
    ]);

    // Drop index
    pgm.dropIndex('sso_providers', 'provider_type');

    // Restore original constraint
    pgm.sql(`
        ALTER TABLE sso_providers
        DROP CONSTRAINT IF EXISTS sso_providers_provider_type_check;
    `);

    pgm.sql(`
        ALTER TABLE sso_providers
        ADD CONSTRAINT sso_providers_provider_type_check
        CHECK (provider_type IN ('saml', 'oauth2', 'oidc'));
    `);
};
