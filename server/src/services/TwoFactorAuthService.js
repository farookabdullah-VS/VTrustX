const speakeasy = require('speakeasy');
const { query } = require('../infrastructure/database/db');
const { encrypt, decrypt } = require('../infrastructure/security/encryption');
const logger = require('../infrastructure/logger');
const crypto = require('crypto');

/**
 * Two-Factor Authentication Service
 *
 * Handles TOTP-based 2FA:
 * - Secret generation and QR code data
 * - Token verification
 * - Backup code generation and validation
 * - Audit logging of 2FA events
 */
class TwoFactorAuthService {
    /**
     * Generate a new 2FA secret for a user
     *
     * @param {number} userId - User ID
     * @param {string} userEmail - User email for QR code label
     * @returns {Promise<object>} - Secret, QR code data, backup codes
     */
    static async generateSecret(userId, userEmail) {
        try {
            // Generate TOTP secret
            const secret = speakeasy.generateSecret({
                name: `VTrustX (${userEmail})`,
                length: 32,
                issuer: 'VTrustX'
            });

            // Generate backup codes (8 codes of 8 characters each)
            const backupCodes = Array.from({ length: 8 }, () =>
                crypto.randomBytes(4).toString('hex').toUpperCase()
            );

            logger.info('[2FA] Secret generated', { userId });

            return {
                secret: secret.base32, // For manual entry
                qrCodeUrl: secret.otpauth_url, // For QR code generation
                backupCodes
            };
        } catch (error) {
            logger.error('[2FA] Failed to generate secret', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Enable 2FA for a user after verifying the initial token
     *
     * @param {number} userId - User ID
     * @param {number} tenantId - Tenant ID
     * @param {string} secret - TOTP secret (base32)
     * @param {string} token - 6-digit verification token
     * @param {array} backupCodes - Backup codes for recovery
     * @param {object} reqInfo - Request info (IP, user agent)
     * @returns {Promise<object>} - Success status
     */
    static async enableTwoFactor(userId, tenantId, secret, token, backupCodes, reqInfo = {}) {
        try {
            // Verify the token before enabling
            const isValid = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token,
                window: 2 // Allow 2 time steps (60 seconds) tolerance
            });

            if (!isValid) {
                logger.warn('[2FA] Invalid verification token during setup', { userId });
                throw new Error('Invalid verification code');
            }

            // Encrypt secret and backup codes
            const encryptedSecret = encrypt(secret);
            const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

            // Update user with 2FA settings
            await query(
                `UPDATE users
                SET two_factor_enabled = true,
                    two_factor_secret = $1,
                    backup_codes = $2,
                    two_factor_verified_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3`,
                [encryptedSecret, encryptedBackupCodes, userId]
            );

            // Log 2FA enabled event
            await this.logAuditEvent(userId, tenantId, 'enabled', reqInfo);

            logger.info('[2FA] Two-factor authentication enabled', { userId, tenantId });

            return { success: true };
        } catch (error) {
            logger.error('[2FA] Failed to enable 2FA', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Verify a 2FA token or backup code
     *
     * @param {number} userId - User ID
     * @param {number} tenantId - Tenant ID
     * @param {string} token - 6-digit token or 8-character backup code
     * @param {object} reqInfo - Request info (IP, user agent)
     * @returns {Promise<object>} - Verification result
     */
    static async verifyToken(userId, tenantId, token, reqInfo = {}) {
        try {
            // Get user's 2FA settings
            const result = await query(
                `SELECT two_factor_enabled, two_factor_secret, backup_codes
                FROM users
                WHERE id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = result.rows[0];

            if (!user.two_factor_enabled) {
                throw new Error('Two-factor authentication is not enabled');
            }

            // Decrypt secret
            const secret = decrypt(user.two_factor_secret);

            // Try TOTP verification first (6-digit code)
            if (token.length === 6 && /^\d+$/.test(token)) {
                const isValid = speakeasy.totp.verify({
                    secret,
                    encoding: 'base32',
                    token,
                    window: 2 // 60-second window
                });

                if (isValid) {
                    // Update last verified timestamp
                    await query(
                        `UPDATE users
                        SET two_factor_verified_at = NOW()
                        WHERE id = $1`,
                        [userId]
                    );

                    await this.logAuditEvent(userId, tenantId, 'verified', reqInfo);

                    logger.info('[2FA] Token verified', { userId });

                    return { success: true, method: 'totp' };
                }
            }

            // Try backup code verification (8-character code)
            if (token.length === 8 && /^[A-F0-9]+$/i.test(token)) {
                const backupCodes = JSON.parse(decrypt(user.backup_codes));
                const codeIndex = backupCodes.indexOf(token.toUpperCase());

                if (codeIndex !== -1) {
                    // Remove used backup code
                    backupCodes.splice(codeIndex, 1);
                    const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

                    await query(
                        `UPDATE users
                        SET backup_codes = $1,
                            two_factor_verified_at = NOW()
                        WHERE id = $2`,
                        [encryptedBackupCodes, userId]
                    );

                    await this.logAuditEvent(userId, tenantId, 'backup_used', {
                        ...reqInfo,
                        remaining_codes: backupCodes.length
                    });

                    logger.warn('[2FA] Backup code used', {
                        userId,
                        remainingCodes: backupCodes.length
                    });

                    return {
                        success: true,
                        method: 'backup_code',
                        remainingCodes: backupCodes.length
                    };
                }
            }

            // Invalid token
            await this.logAuditEvent(userId, tenantId, 'failed_attempt', reqInfo);

            logger.warn('[2FA] Invalid token attempt', { userId });

            return { success: false, error: 'Invalid verification code' };
        } catch (error) {
            logger.error('[2FA] Token verification failed', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Disable 2FA for a user
     *
     * @param {number} userId - User ID
     * @param {number} tenantId - Tenant ID
     * @param {string} token - Current 2FA token for confirmation
     * @param {object} reqInfo - Request info (IP, user agent)
     * @returns {Promise<object>} - Success status
     */
    static async disableTwoFactor(userId, tenantId, token, reqInfo = {}) {
        try {
            // Verify current token before disabling
            const verification = await this.verifyToken(userId, tenantId, token, reqInfo);

            if (!verification.success) {
                throw new Error('Invalid verification code');
            }

            // Disable 2FA
            await query(
                `UPDATE users
                SET two_factor_enabled = false,
                    two_factor_secret = NULL,
                    backup_codes = NULL,
                    two_factor_verified_at = NULL,
                    updated_at = NOW()
                WHERE id = $1`,
                [userId]
            );

            await this.logAuditEvent(userId, tenantId, 'disabled', reqInfo);

            logger.info('[2FA] Two-factor authentication disabled', { userId });

            return { success: true };
        } catch (error) {
            logger.error('[2FA] Failed to disable 2FA', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Get 2FA status for a user
     *
     * @param {number} userId - User ID
     * @returns {Promise<object>} - 2FA status
     */
    static async getStatus(userId) {
        try {
            const result = await query(
                `SELECT two_factor_enabled, two_factor_verified_at, backup_codes
                FROM users
                WHERE id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = result.rows[0];
            let remainingBackupCodes = 0;

            if (user.two_factor_enabled && user.backup_codes) {
                const backupCodes = JSON.parse(decrypt(user.backup_codes));
                remainingBackupCodes = backupCodes.length;
            }

            return {
                enabled: user.two_factor_enabled,
                lastVerifiedAt: user.two_factor_verified_at,
                remainingBackupCodes
            };
        } catch (error) {
            logger.error('[2FA] Failed to get status', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Regenerate backup codes
     *
     * @param {number} userId - User ID
     * @param {number} tenantId - Tenant ID
     * @param {string} token - Current 2FA token for confirmation
     * @param {object} reqInfo - Request info (IP, user agent)
     * @returns {Promise<array>} - New backup codes
     */
    static async regenerateBackupCodes(userId, tenantId, token, reqInfo = {}) {
        try {
            // Verify current token before regenerating
            const verification = await this.verifyToken(userId, tenantId, token, reqInfo);

            if (!verification.success) {
                throw new Error('Invalid verification code');
            }

            // Generate new backup codes
            const backupCodes = Array.from({ length: 8 }, () =>
                crypto.randomBytes(4).toString('hex').toUpperCase()
            );

            const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

            await query(
                `UPDATE users
                SET backup_codes = $1
                WHERE id = $2`,
                [encryptedBackupCodes, userId]
            );

            await this.logAuditEvent(userId, tenantId, 'backup_codes_regenerated', reqInfo);

            logger.info('[2FA] Backup codes regenerated', { userId });

            return backupCodes;
        } catch (error) {
            logger.error('[2FA] Failed to regenerate backup codes', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Log a 2FA audit event
     *
     * @param {number} userId - User ID
     * @param {number} tenantId - Tenant ID
     * @param {string} eventType - Event type
     * @param {object} reqInfo - Request info (IP, user agent, metadata)
     */
    static async logAuditEvent(userId, tenantId, eventType, reqInfo = {}) {
        try {
            await query(
                `INSERT INTO two_factor_audit_log
                (user_id, tenant_id, event_type, ip_address, user_agent, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    userId,
                    tenantId,
                    eventType,
                    reqInfo.ip || null,
                    reqInfo.userAgent || null,
                    JSON.stringify(reqInfo.metadata || {})
                ]
            );
        } catch (error) {
            logger.error('[2FA] Failed to log audit event', {
                error: error.message,
                userId,
                eventType
            });
            // Don't throw - audit logging failure shouldn't block operations
        }
    }

    /**
     * Get audit log for a user
     *
     * @param {number} userId - User ID
     * @param {number} limit - Number of records to return
     * @returns {Promise<array>} - Audit log entries
     */
    static async getAuditLog(userId, limit = 50) {
        try {
            const result = await query(
                `SELECT event_type, ip_address, user_agent, metadata, created_at
                FROM two_factor_audit_log
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2`,
                [userId, limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('[2FA] Failed to get audit log', {
                error: error.message,
                userId
            });
            throw error;
        }
    }
}

module.exports = TwoFactorAuthService;
