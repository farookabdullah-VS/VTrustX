const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const { encrypt, decrypt } = require('../infrastructure/security/encryption');
const crypto = require('crypto');

/**
 * SSO Service
 *
 * Manages Single Sign-On authentication via SAML 2.0 and OAuth2/OIDC.
 * Supports multiple identity providers (Okta, Azure AD, Google, OneLogin, etc.)
 * with Just-in-Time user provisioning and role mapping.
 *
 * Features:
 * - SAML 2.0 (SP-initiated and IdP-initiated flows)
 * - OAuth2/OIDC (Authorization Code flow)
 * - JIT user provisioning
 * - Role mapping from IdP claims
 * - Single Logout (SLO) for SAML
 * - Session management
 */
class SSOService {
    /**
     * Get SSO provider by ID
     */
    static async getProvider(providerId, tenantId) {
        try {
            const result = await query(
                `SELECT * FROM sso_providers
                WHERE id = $1 AND tenant_id = $2`,
                [providerId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('SSO provider not found');
            }

            const provider = result.rows[0];

            // Decrypt sensitive fields
            if (provider.oauth_client_secret) {
                provider.oauth_client_secret = decrypt(provider.oauth_client_secret);
            }

            return provider;
        } catch (error) {
            logger.error('[SSOService] Get provider failed', {
                error: error.message,
                providerId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all enabled SSO providers for a tenant
     */
    static async getEnabledProviders(tenantId) {
        try {
            const result = await query(
                `SELECT id, name, provider_type, enabled, metadata
                FROM sso_providers
                WHERE tenant_id = $1 AND enabled = true
                ORDER BY name ASC`,
                [tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[SSOService] Get enabled providers failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create a new SSO provider
     */
    static async createProvider(tenantId, userId, providerData) {
        try {
            const {
                name,
                provider_type,
                enabled = true,
                // SAML fields
                saml_entity_id,
                saml_sso_url,
                saml_slo_url,
                saml_certificate,
                saml_want_assertions_signed = true,
                // OAuth2 fields
                oauth_client_id,
                oauth_client_secret,
                oauth_authorization_url,
                oauth_token_url,
                oauth_userinfo_url,
                oauth_scopes = ['openid', 'email', 'profile'],
                // User provisioning
                jit_provisioning = true,
                email_claim = 'email',
                name_claim = 'name',
                role_claim,
                role_mapping = {},
                default_role = 'user',
                // Security
                require_encrypted_assertions = false,
                session_duration_minutes = 480,
                metadata = {}
            } = providerData;

            // Validate required fields
            if (!name || !provider_type) {
                throw new Error('Name and provider_type are required');
            }

            if (!['saml', 'oauth2', 'oidc'].includes(provider_type)) {
                throw new Error('Invalid provider_type. Must be: saml, oauth2, or oidc');
            }

            // Encrypt sensitive fields
            let encryptedSecret = null;
            if (oauth_client_secret) {
                encryptedSecret = encrypt(oauth_client_secret);
            }

            const result = await query(
                `INSERT INTO sso_providers
                (tenant_id, name, provider_type, enabled,
                 saml_entity_id, saml_sso_url, saml_slo_url, saml_certificate, saml_want_assertions_signed,
                 oauth_client_id, oauth_client_secret, oauth_authorization_url, oauth_token_url,
                 oauth_userinfo_url, oauth_scopes,
                 jit_provisioning, email_claim, name_claim, role_claim, role_mapping, default_role,
                 require_encrypted_assertions, session_duration_minutes, metadata, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
                RETURNING id, name, provider_type, enabled, created_at`,
                [
                    tenantId, name, provider_type, enabled,
                    saml_entity_id || null, saml_sso_url || null, saml_slo_url || null,
                    saml_certificate || null, saml_want_assertions_signed,
                    oauth_client_id || null, encryptedSecret, oauth_authorization_url || null,
                    oauth_token_url || null, oauth_userinfo_url || null, JSON.stringify(oauth_scopes),
                    jit_provisioning, email_claim, name_claim, role_claim || null,
                    JSON.stringify(role_mapping), default_role,
                    require_encrypted_assertions, session_duration_minutes, JSON.stringify(metadata),
                    userId
                ]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[SSOService] Create provider failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update SSO provider
     */
    static async updateProvider(providerId, tenantId, updates) {
        try {
            const provider = await this.getProvider(providerId, tenantId);

            const {
                name,
                enabled,
                saml_entity_id,
                saml_sso_url,
                saml_slo_url,
                saml_certificate,
                oauth_client_id,
                oauth_client_secret,
                oauth_authorization_url,
                oauth_token_url,
                oauth_userinfo_url,
                oauth_scopes,
                jit_provisioning,
                role_mapping,
                default_role,
                session_duration_minutes
            } = updates;

            // Encrypt secret if provided
            let encryptedSecret = undefined;
            if (oauth_client_secret) {
                encryptedSecret = encrypt(oauth_client_secret);
            }

            const result = await query(
                `UPDATE sso_providers
                SET
                    name = COALESCE($1, name),
                    enabled = COALESCE($2, enabled),
                    saml_entity_id = COALESCE($3, saml_entity_id),
                    saml_sso_url = COALESCE($4, saml_sso_url),
                    saml_slo_url = COALESCE($5, saml_slo_url),
                    saml_certificate = COALESCE($6, saml_certificate),
                    oauth_client_id = COALESCE($7, oauth_client_id),
                    oauth_client_secret = COALESCE($8, oauth_client_secret),
                    oauth_authorization_url = COALESCE($9, oauth_authorization_url),
                    oauth_token_url = COALESCE($10, oauth_token_url),
                    oauth_userinfo_url = COALESCE($11, oauth_userinfo_url),
                    oauth_scopes = COALESCE($12, oauth_scopes),
                    jit_provisioning = COALESCE($13, jit_provisioning),
                    role_mapping = COALESCE($14, role_mapping),
                    default_role = COALESCE($15, default_role),
                    session_duration_minutes = COALESCE($16, session_duration_minutes),
                    updated_at = NOW()
                WHERE id = $17 AND tenant_id = $18
                RETURNING id, name, provider_type, enabled`,
                [
                    name !== undefined ? name : null,
                    enabled !== undefined ? enabled : null,
                    saml_entity_id !== undefined ? saml_entity_id : null,
                    saml_sso_url !== undefined ? saml_sso_url : null,
                    saml_slo_url !== undefined ? saml_slo_url : null,
                    saml_certificate !== undefined ? saml_certificate : null,
                    oauth_client_id !== undefined ? oauth_client_id : null,
                    encryptedSecret !== undefined ? encryptedSecret : null,
                    oauth_authorization_url !== undefined ? oauth_authorization_url : null,
                    oauth_token_url !== undefined ? oauth_token_url : null,
                    oauth_userinfo_url !== undefined ? oauth_userinfo_url : null,
                    oauth_scopes !== undefined ? JSON.stringify(oauth_scopes) : null,
                    jit_provisioning !== undefined ? jit_provisioning : null,
                    role_mapping !== undefined ? JSON.stringify(role_mapping) : null,
                    default_role !== undefined ? default_role : null,
                    session_duration_minutes !== undefined ? session_duration_minutes : null,
                    providerId,
                    tenantId
                ]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[SSOService] Update provider failed', {
                error: error.message,
                providerId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete SSO provider
     */
    static async deleteProvider(providerId, tenantId) {
        try {
            const result = await query(
                `DELETE FROM sso_providers
                WHERE id = $1 AND tenant_id = $2
                RETURNING id`,
                [providerId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Provider not found or access denied');
            }

            return { success: true, deletedId: providerId };
        } catch (error) {
            logger.error('[SSOService] Delete provider failed', {
                error: error.message,
                providerId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Find or create SSO connection for a user
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} providerId - SSO provider ID
     * @param {object} idpProfile - Profile from identity provider
     * @returns {Promise<object>} - User and connection info
     */
    static async findOrCreateConnection(tenantId, providerId, idpProfile) {
        try {
            const { idp_user_id, email, display_name } = idpProfile;

            // Get provider config
            const provider = await this.getProvider(providerId, tenantId);

            // Check if connection already exists
            let connectionResult = await query(
                `SELECT * FROM sso_connections
                WHERE tenant_id = $1 AND provider_id = $2 AND idp_user_id = $3`,
                [tenantId, providerId, idp_user_id]
            );

            if (connectionResult.rows.length > 0) {
                // Connection exists - get user
                const connection = connectionResult.rows[0];

                const userResult = await query(
                    `SELECT * FROM users WHERE id = $1 AND tenant_id = $2`,
                    [connection.user_id, tenantId]
                );

                if (userResult.rows.length === 0) {
                    throw new Error('User not found');
                }

                // Update last login
                await query(
                    `UPDATE sso_connections
                    SET last_login_at = NOW()
                    WHERE id = $1`,
                    [connection.id]
                );

                return {
                    user: userResult.rows[0],
                    connection: connection,
                    isNewUser: false
                };
            }

            // No connection exists - check if JIT provisioning is enabled
            if (!provider.jit_provisioning) {
                throw new Error('User not found and JIT provisioning is disabled');
            }

            // JIT provision user
            // First, check if user with this email already exists
            let userResult = await query(
                `SELECT * FROM users WHERE email = $1 AND tenant_id = $2`,
                [email, tenantId]
            );

            let user;
            let isNewUser = false;

            if (userResult.rows.length > 0) {
                // User exists - link to SSO
                user = userResult.rows[0];
            } else {
                // Create new user
                const role = provider.default_role || 'user';

                const newUserResult = await query(
                    `INSERT INTO users
                    (tenant_id, email, name, username, role, sso_only, status, email_verified)
                    VALUES ($1, $2, $3, $4, $5, true, 'active', true)
                    RETURNING *`,
                    [tenantId, email, display_name, email.split('@')[0], role]
                );

                user = newUserResult.rows[0];
                isNewUser = true;

                logger.info('[SSOService] JIT provisioned user', {
                    tenantId,
                    userId: user.id,
                    email,
                    providerId
                });
            }

            // Create SSO connection
            const newConnectionResult = await query(
                `INSERT INTO sso_connections
                (tenant_id, user_id, provider_id, idp_user_id, idp_email, idp_display_name, last_login_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING *`,
                [tenantId, user.id, providerId, idp_user_id, email, display_name]
            );

            return {
                user,
                connection: newConnectionResult.rows[0],
                isNewUser
            };
        } catch (error) {
            logger.error('[SSOService] Find or create connection failed', {
                error: error.message,
                tenantId,
                providerId
            });
            throw error;
        }
    }

    /**
     * Create SSO login session
     */
    static async createLoginSession(tenantId, userId, providerId, sessionData) {
        try {
            const {
                session_index,
                name_id,
                ip_address,
                user_agent,
                session_duration_minutes = 480
            } = sessionData;

            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + session_duration_minutes);

            const result = await query(
                `INSERT INTO sso_login_sessions
                (tenant_id, user_id, provider_id, session_index, name_id,
                 ip_address, user_agent, status, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
                RETURNING *`,
                [
                    tenantId, userId, providerId,
                    session_index || null, name_id || null,
                    ip_address || null, user_agent || null,
                    expiresAt
                ]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[SSOService] Create login session failed', {
                error: error.message,
                tenantId,
                userId,
                providerId
            });
            throw error;
        }
    }

    /**
     * Logout SSO session
     */
    static async logoutSession(sessionId) {
        try {
            const result = await query(
                `UPDATE sso_login_sessions
                SET status = 'logged_out', logged_out_at = NOW()
                WHERE id = $1
                RETURNING *`,
                [sessionId]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[SSOService] Logout session failed', {
                error: error.message,
                sessionId
            });
            throw error;
        }
    }

    /**
     * Get active sessions for a user
     */
    static async getUserSessions(userId, tenantId) {
        try {
            const result = await query(
                `SELECT s.*, p.name as provider_name, p.provider_type
                FROM sso_login_sessions s
                JOIN sso_providers p ON s.provider_id = p.id
                WHERE s.user_id = $1 AND s.tenant_id = $2
                  AND s.status = 'active'
                  AND (s.expires_at IS NULL OR s.expires_at > NOW())
                ORDER BY s.created_at DESC`,
                [userId, tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[SSOService] Get user sessions failed', {
                error: error.message,
                userId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * List all SSO providers for a tenant
     */
    static async listProviders(tenantId) {
        try {
            const result = await query(
                `SELECT
                    id, name, provider_type, enabled,
                    jit_provisioning, default_role, session_duration_minutes,
                    created_at, updated_at
                FROM sso_providers
                WHERE tenant_id = $1
                ORDER BY name ASC`,
                [tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[SSOService] List providers failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get SSO statistics
     */
    static async getStats(tenantId, days = 30) {
        try {
            const result = await query(
                `SELECT
                    p.name as provider_name,
                    p.provider_type,
                    COUNT(DISTINCT c.user_id) as total_users,
                    COUNT(s.id) as total_logins,
                    COUNT(s.id) FILTER (WHERE s.created_at > NOW() - INTERVAL '${days} days') as recent_logins
                FROM sso_providers p
                LEFT JOIN sso_connections c ON p.id = c.provider_id
                LEFT JOIN sso_login_sessions s ON p.id = s.provider_id
                WHERE p.tenant_id = $1
                GROUP BY p.id, p.name, p.provider_type
                ORDER BY total_users DESC`,
                [tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[SSOService] Get stats failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

module.exports = SSOService;
