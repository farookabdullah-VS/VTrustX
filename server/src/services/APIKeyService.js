const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const crypto = require('crypto');

/**
 * API Key Service
 *
 * Handles API key generation, validation, and management for public API access:
 * - Secure key generation with SHA-256 hashing
 * - Scope-based permissions (forms:read, forms:write, responses:read, etc.)
 * - Rate limiting (requests per hour)
 * - Key rotation and expiration
 * - Usage tracking
 *
 * API Key Format: vx_live_<24_random_chars> or vx_test_<24_random_chars>
 */
class APIKeyService {
    /**
     * Generate a new API key
     *
     * @param {number} tenantId - Tenant ID
     * @param {object} keyData - API key configuration
     * @returns {Promise<object>} - Created API key (includes plaintext key ONCE)
     */
    static async createAPIKey(tenantId, keyData) {
        try {
            const {
                name,
                description = '',
                scopes = [],
                rateLimit = 1000,
                expiresAt = null,
                environment = 'live' // 'live' or 'test'
            } = keyData;

            // Validate scopes
            const validScopes = [
                'forms:read',
                'forms:write',
                'forms:delete',
                'responses:read',
                'responses:write',
                'distributions:read',
                'distributions:write',
                'contacts:read',
                'contacts:write',
                'webhooks:manage',
                'analytics:read'
            ];

            const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
            if (invalidScopes.length > 0) {
                throw new Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
            }

            // Generate API key
            const randomBytes = crypto.randomBytes(24).toString('hex'); // 48 chars
            const prefix = environment === 'test' ? 'vx_test' : 'vx_live';
            const apiKey = `${prefix}_${randomBytes}`;

            // Hash the key for storage (never store plaintext)
            const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
            const keyPrefix = apiKey.substring(0, 20); // First 20 chars for display

            // Store in database
            const result = await query(
                `INSERT INTO api_keys
                (tenant_id, name, description, key_hash, key_prefix, scopes, rate_limit, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, tenant_id, name, description, key_prefix, scopes, rate_limit, is_active, expires_at, created_at`,
                [
                    tenantId,
                    name,
                    description,
                    keyHash,
                    keyPrefix,
                    JSON.stringify(scopes),
                    rateLimit,
                    expiresAt
                ]
            );

            const createdKey = result.rows[0];

            logger.info('[APIKeyService] API key created', {
                tenantId,
                keyId: createdKey.id,
                keyPrefix: createdKey.key_prefix,
                scopes
            });

            // Return the plaintext key ONLY once (never again!)
            return {
                ...createdKey,
                api_key: apiKey, // ONLY returned on creation
                scopes: JSON.parse(createdKey.scopes)
            };
        } catch (error) {
            logger.error('[APIKeyService] Failed to create API key', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Validate an API key and return associated tenant and scopes
     *
     * @param {string} apiKey - API key to validate
     * @returns {Promise<object>} - Tenant ID, scopes, and rate limit info
     */
    static async validateAPIKey(apiKey) {
        try {
            if (!apiKey || !apiKey.startsWith('vx_')) {
                throw new Error('Invalid API key format');
            }

            // Hash the provided key
            const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

            // Look up in database
            const result = await query(
                `SELECT id, tenant_id, name, scopes, rate_limit, is_active, expires_at, last_used_at
                FROM api_keys
                WHERE key_hash = $1`,
                [keyHash]
            );

            if (result.rows.length === 0) {
                throw new Error('Invalid API key');
            }

            const keyData = result.rows[0];

            // Check if key is active
            if (!keyData.is_active) {
                throw new Error('API key has been deactivated');
            }

            // Check if key has expired
            if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
                throw new Error('API key has expired');
            }

            // Update last_used_at (fire-and-forget)
            query(
                `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
                [keyData.id]
            ).catch(err => {
                logger.error('[APIKeyService] Failed to update last_used_at', {
                    error: err.message,
                    keyId: keyData.id
                });
            });

            logger.debug('[APIKeyService] API key validated', {
                keyId: keyData.id,
                tenantId: keyData.tenant_id
            });

            return {
                keyId: keyData.id,
                tenantId: keyData.tenant_id,
                name: keyData.name,
                scopes: JSON.parse(keyData.scopes),
                rateLimit: keyData.rate_limit
            };
        } catch (error) {
            logger.warn('[APIKeyService] API key validation failed', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if API key has required scope
     *
     * @param {array} keyScopes - Scopes associated with API key
     * @param {string} requiredScope - Required scope (e.g., 'forms:read')
     * @returns {boolean} - True if key has required scope
     */
    static hasScope(keyScopes, requiredScope) {
        return keyScopes.includes(requiredScope);
    }

    /**
     * List API keys for tenant
     *
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<array>} - List of API keys (without plaintext keys)
     */
    static async listAPIKeys(tenantId) {
        try {
            const result = await query(
                `SELECT id, name, description, key_prefix, scopes, rate_limit, is_active,
                        last_used_at, expires_at, created_at
                FROM api_keys
                WHERE tenant_id = $1
                ORDER BY created_at DESC`,
                [tenantId]
            );

            return result.rows.map(key => ({
                ...key,
                scopes: JSON.parse(key.scopes),
                key_display: `${key.key_prefix}...` // Only show prefix
            }));
        } catch (error) {
            logger.error('[APIKeyService] Failed to list API keys', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Revoke (deactivate) an API key
     *
     * @param {number} keyId - API key ID
     * @param {number} tenantId - Tenant ID (for authorization)
     * @returns {Promise<object>} - Success status
     */
    static async revokeAPIKey(keyId, tenantId) {
        try {
            const result = await query(
                `UPDATE api_keys
                SET is_active = false, updated_at = NOW()
                WHERE id = $1 AND tenant_id = $2
                RETURNING id`,
                [keyId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('API key not found');
            }

            logger.info('[APIKeyService] API key revoked', {
                keyId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('[APIKeyService] Failed to revoke API key', {
                error: error.message,
                keyId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete an API key permanently
     *
     * @param {number} keyId - API key ID
     * @param {number} tenantId - Tenant ID (for authorization)
     * @returns {Promise<object>} - Success status
     */
    static async deleteAPIKey(keyId, tenantId) {
        try {
            const result = await query(
                `DELETE FROM api_keys
                WHERE id = $1 AND tenant_id = $2
                RETURNING id`,
                [keyId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('API key not found');
            }

            logger.info('[APIKeyService] API key deleted', {
                keyId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('[APIKeyService] Failed to delete API key', {
                error: error.message,
                keyId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update API key scopes or rate limit
     *
     * @param {number} keyId - API key ID
     * @param {number} tenantId - Tenant ID (for authorization)
     * @param {object} updates - Fields to update (name, description, scopes, rateLimit)
     * @returns {Promise<object>} - Updated API key
     */
    static async updateAPIKey(keyId, tenantId, updates) {
        try {
            const allowedFields = ['name', 'description', 'scopes', 'rate_limit'];
            const setClauses = [];
            const params = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updates)) {
                const dbKey = key === 'rateLimit' ? 'rate_limit' : key;

                if (allowedFields.includes(dbKey)) {
                    setClauses.push(`${dbKey} = $${paramIndex}`);
                    params.push(dbKey === 'scopes' ? JSON.stringify(value) : value);
                    paramIndex++;
                }
            }

            if (setClauses.length === 0) {
                throw new Error('No valid fields to update');
            }

            params.push(keyId, tenantId);

            const result = await query(
                `UPDATE api_keys
                SET ${setClauses.join(', ')}, updated_at = NOW()
                WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
                RETURNING id, name, description, key_prefix, scopes, rate_limit, is_active, expires_at`,
                params
            );

            if (result.rows.length === 0) {
                throw new Error('API key not found');
            }

            const updatedKey = result.rows[0];

            logger.info('[APIKeyService] API key updated', {
                keyId,
                tenantId
            });

            return {
                ...updatedKey,
                scopes: JSON.parse(updatedKey.scopes)
            };
        } catch (error) {
            logger.error('[APIKeyService] Failed to update API key', {
                error: error.message,
                keyId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get API key usage statistics
     *
     * @param {number} keyId - API key ID
     * @param {number} tenantId - Tenant ID (for authorization)
     * @returns {Promise<object>} - Usage statistics
     */
    static async getAPIKeyStats(keyId, tenantId) {
        try {
            const keyResult = await query(
                `SELECT id, name, key_prefix, last_used_at, created_at
                FROM api_keys
                WHERE id = $1 AND tenant_id = $2`,
                [keyId, tenantId]
            );

            if (keyResult.rows.length === 0) {
                throw new Error('API key not found');
            }

            const key = keyResult.rows[0];

            // Calculate usage metrics
            const daysSinceCreation = Math.floor(
                (new Date() - new Date(key.created_at)) / (1000 * 60 * 60 * 24)
            );

            const daysSinceLastUse = key.last_used_at
                ? Math.floor((new Date() - new Date(key.last_used_at)) / (1000 * 60 * 60 * 24))
                : null;

            return {
                keyId: key.id,
                name: key.name,
                keyPrefix: key.key_prefix,
                createdAt: key.created_at,
                lastUsedAt: key.last_used_at,
                daysSinceCreation,
                daysSinceLastUse,
                isActive: daysSinceLastUse !== null && daysSinceLastUse < 30
            };
        } catch (error) {
            logger.error('[APIKeyService] Failed to get API key stats', {
                error: error.message,
                keyId,
                tenantId
            });
            throw error;
        }
    }
}

module.exports = APIKeyService;
