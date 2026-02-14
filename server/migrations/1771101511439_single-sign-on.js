/**
 * Single Sign-On (SSO) Migration
 *
 * Enables enterprise SSO integration via SAML 2.0 and OAuth2/OIDC protocols.
 * Supports multiple identity providers: Okta, Azure AD, Google Workspace, OneLogin, Auth0, etc.
 *
 * Features:
 * - SAML 2.0 (Service Provider initiated and IdP initiated flows)
 * - OAuth2/OIDC (Authorization Code flow)
 * - Multi-provider support per tenant
 * - Just-in-Time (JIT) user provisioning
 * - Automatic role mapping from IdP claims
 * - Session management and Single Logout (SLO)
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
    // SSO providers configuration table
    pgm.createTable('sso_providers', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE',
            comment: 'Tenant that owns this SSO provider'
        },
        name: {
            type: 'varchar(255)',
            notNull: true,
            comment: 'Display name (e.g., "Company Okta", "Azure AD")'
        },
        provider_type: {
            type: 'varchar(20)',
            notNull: true,
            comment: 'Protocol type: saml, oauth2, oidc'
        },
        enabled: {
            type: 'boolean',
            notNull: true,
            default: true,
            comment: 'Whether this provider is active'
        },

        // SAML 2.0 Configuration
        saml_entity_id: {
            type: 'text',
            comment: 'SAML Entity ID / Issuer'
        },
        saml_sso_url: {
            type: 'text',
            comment: 'SAML Single Sign-On URL'
        },
        saml_slo_url: {
            type: 'text',
            comment: 'SAML Single Logout URL (optional)'
        },
        saml_certificate: {
            type: 'text',
            comment: 'X.509 certificate for SAML signature verification'
        },
        saml_want_assertions_signed: {
            type: 'boolean',
            default: true,
            comment: 'Require signed assertions'
        },

        // OAuth2/OIDC Configuration
        oauth_client_id: {
            type: 'text',
            comment: 'OAuth2 Client ID'
        },
        oauth_client_secret: {
            type: 'text',
            comment: 'OAuth2 Client Secret (encrypted)'
        },
        oauth_authorization_url: {
            type: 'text',
            comment: 'OAuth2 Authorization endpoint'
        },
        oauth_token_url: {
            type: 'text',
            comment: 'OAuth2 Token endpoint'
        },
        oauth_userinfo_url: {
            type: 'text',
            comment: 'OAuth2 UserInfo endpoint (OIDC)'
        },
        oauth_scopes: {
            type: 'jsonb',
            default: '["openid", "email", "profile"]',
            comment: 'OAuth2 scopes to request'
        },

        // User Provisioning & Mapping
        jit_provisioning: {
            type: 'boolean',
            default: true,
            comment: 'Just-in-Time user provisioning (auto-create users)'
        },
        email_claim: {
            type: 'varchar(100)',
            default: 'email',
            comment: 'Claim/attribute name for email'
        },
        name_claim: {
            type: 'varchar(100)',
            default: 'name',
            comment: 'Claim/attribute name for full name'
        },
        role_claim: {
            type: 'varchar(100)',
            comment: 'Claim/attribute name for role mapping'
        },
        role_mapping: {
            type: 'jsonb',
            default: '{}',
            comment: 'Map IdP roles to platform roles: {"admin": "admin", "user": "user"}'
        },
        default_role: {
            type: 'varchar(50)',
            default: 'user',
            comment: 'Default role for JIT provisioned users'
        },

        // Security & Session
        require_encrypted_assertions: {
            type: 'boolean',
            default: false,
            comment: 'Require encrypted SAML assertions'
        },
        session_duration_minutes: {
            type: 'integer',
            default: 480,
            comment: 'SSO session duration (8 hours default)'
        },

        // Metadata
        metadata: {
            type: 'jsonb',
            default: '{}',
            comment: 'Additional provider-specific configuration'
        },
        created_by: {
            type: 'integer',
            references: 'users',
            onDelete: 'SET NULL'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // SSO user connections (links users to SSO identities)
    pgm.createTable('sso_connections', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            notNull: true,
            references: 'tenants',
            onDelete: 'CASCADE'
        },
        user_id: {
            type: 'integer',
            notNull: true,
            references: 'users',
            onDelete: 'CASCADE',
            comment: 'Local user account'
        },
        provider_id: {
            type: 'integer',
            notNull: true,
            references: 'sso_providers',
            onDelete: 'CASCADE',
            comment: 'SSO provider used'
        },
        idp_user_id: {
            type: 'text',
            notNull: true,
            comment: 'User ID from identity provider (NameID for SAML, sub for OIDC)'
        },
        idp_email: {
            type: 'varchar(255)',
            comment: 'Email from IdP'
        },
        idp_display_name: {
            type: 'varchar(255)',
            comment: 'Display name from IdP'
        },
        last_login_at: {
            type: 'timestamp',
            comment: 'Last successful SSO login'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // SSO login sessions (for audit and Single Logout)
    pgm.createTable('sso_login_sessions', {
        id: 'id',
        tenant_id: {
            type: 'integer',
            references: 'tenants',
            onDelete: 'CASCADE'
        },
        user_id: {
            type: 'integer',
            references: 'users',
            onDelete: 'CASCADE'
        },
        provider_id: {
            type: 'integer',
            notNull: true,
            references: 'sso_providers',
            onDelete: 'CASCADE'
        },
        session_index: {
            type: 'text',
            comment: 'SAML SessionIndex for Single Logout'
        },
        name_id: {
            type: 'text',
            comment: 'SAML NameID for Single Logout'
        },
        ip_address: {
            type: 'varchar(45)',
            comment: 'IP address of login'
        },
        user_agent: {
            type: 'text',
            comment: 'Browser user agent'
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: 'active',
            comment: 'Status: active, logged_out, expired'
        },
        expires_at: {
            type: 'timestamp',
            comment: 'Session expiration time'
        },
        logged_out_at: {
            type: 'timestamp',
            comment: 'When user logged out (SLO)'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Indexes for fast lookups
    pgm.createIndex('sso_providers', 'tenant_id');
    pgm.createIndex('sso_providers', ['tenant_id', 'enabled']);
    pgm.createIndex('sso_connections', 'tenant_id');
    pgm.createIndex('sso_connections', 'user_id');
    pgm.createIndex('sso_connections', 'provider_id');
    pgm.createIndex('sso_connections', ['provider_id', 'idp_user_id'], { unique: true });
    pgm.createIndex('sso_login_sessions', 'tenant_id');
    pgm.createIndex('sso_login_sessions', 'user_id');
    pgm.createIndex('sso_login_sessions', 'session_index');
    pgm.createIndex('sso_login_sessions', ['status', 'expires_at']);

    // Add SSO flag to users table
    pgm.addColumns('users', {
        sso_only: {
            type: 'boolean',
            default: false,
            comment: 'If true, user can only login via SSO (password login disabled)'
        }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropColumns('users', ['sso_only']);
    pgm.dropTable('sso_login_sessions');
    pgm.dropTable('sso_connections');
    pgm.dropTable('sso_providers');
};
