/**
 * Survey Cool Down Service
 *
 * Handles submission rate limiting (cool down) for surveys.
 * Supports three modes:
 * - IP-based: Rate limit by IP address
 * - User-based: Rate limit by authenticated user ID
 * - Both (hybrid): Check both IP and user
 *
 * Uses Redis cache (or in-memory fallback) for tracking submission timestamps.
 */

const { rateLimitCache } = require('../infrastructure/cache');
const logger = require('../infrastructure/logger');

class SurveyCooldownService {
    /**
     * Check if a submission is allowed based on cool down settings
     * @param {Object} form - Form object with cool down configuration
     * @param {string} ipAddress - Client IP address
     * @param {string|null} userId - Authenticated user ID (optional)
     * @returns {Promise<Object>} - { allowed: boolean, reason?: string, remainingTime?: number }
     */
    static async checkCooldown(form, ipAddress, userId = null) {
        try {
            // Cool down not enabled - allow submission
            if (!form.cooldown_enabled) {
                return { allowed: true };
            }

            const cooldownPeriod = form.cooldown_period || 3600; // Default 1 hour
            const cooldownType = form.cooldown_type || 'both';

            // Check based on cool down type
            switch (cooldownType) {
                case 'ip':
                    return await this._checkIpCooldown(form.id, ipAddress, cooldownPeriod);

                case 'user':
                    if (!userId) {
                        // If user-based cool down but no user, allow (anonymous submission)
                        return { allowed: true };
                    }
                    return await this._checkUserCooldown(form.id, userId, cooldownPeriod);

                case 'both':
                    // Check both IP and user (if authenticated)
                    const ipCheck = await this._checkIpCooldown(form.id, ipAddress, cooldownPeriod);
                    if (!ipCheck.allowed) {
                        return ipCheck;
                    }

                    if (userId) {
                        const userCheck = await this._checkUserCooldown(form.id, userId, cooldownPeriod);
                        if (!userCheck.allowed) {
                            return userCheck;
                        }
                    }

                    return { allowed: true };

                default:
                    logger.warn('[SurveyCooldown] Invalid cooldown type, allowing submission', {
                        formId: form.id,
                        cooldownType
                    });
                    return { allowed: true };
            }
        } catch (error) {
            logger.error('[SurveyCooldown] Cool down check failed, allowing submission (fail open)', {
                error: error.message,
                formId: form?.id
            });
            // Fail open - allow submission if cool down check fails
            return { allowed: true };
        }
    }

    /**
     * Check IP-based cool down
     * @private
     */
    static async _checkIpCooldown(formId, ipAddress, cooldownPeriod) {
        const cacheKey = `cooldown:ip:${formId}:${ipAddress}`;
        const lastSubmission = await rateLimitCache.get(cacheKey);

        if (lastSubmission) {
            const elapsedSeconds = Math.floor((Date.now() - parseInt(lastSubmission)) / 1000);
            const remainingTime = cooldownPeriod - elapsedSeconds;

            if (remainingTime > 0) {
                return {
                    allowed: false,
                    reason: `Please wait ${this._formatTime(remainingTime)} before submitting again.`,
                    remainingTime,
                    cooldownType: 'ip'
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Check user-based cool down
     * @private
     */
    static async _checkUserCooldown(formId, userId, cooldownPeriod) {
        const cacheKey = `cooldown:user:${formId}:${userId}`;
        const lastSubmission = await rateLimitCache.get(cacheKey);

        if (lastSubmission) {
            const elapsedSeconds = Math.floor((Date.now() - parseInt(lastSubmission)) / 1000);
            const remainingTime = cooldownPeriod - elapsedSeconds;

            if (remainingTime > 0) {
                return {
                    allowed: false,
                    reason: `You can submit this survey again in ${this._formatTime(remainingTime)}.`,
                    remainingTime,
                    cooldownType: 'user'
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Record a submission timestamp (call after successful submission)
     * @param {Object} form - Form object with cool down configuration
     * @param {string} ipAddress - Client IP address
     * @param {string|null} userId - Authenticated user ID (optional)
     */
    static async recordSubmission(form, ipAddress, userId = null) {
        try {
            if (!form.cooldown_enabled) {
                return; // Cool down not enabled, nothing to record
            }

            const cooldownPeriod = form.cooldown_period || 3600;
            const cooldownType = form.cooldown_type || 'both';
            const timestamp = Date.now().toString();

            // Record based on cool down type
            if (cooldownType === 'ip' || cooldownType === 'both') {
                const ipKey = `cooldown:ip:${form.id}:${ipAddress}`;
                await rateLimitCache.set(ipKey, timestamp, cooldownPeriod);
            }

            if ((cooldownType === 'user' || cooldownType === 'both') && userId) {
                const userKey = `cooldown:user:${form.id}:${userId}`;
                await rateLimitCache.set(userKey, timestamp, cooldownPeriod);
            }

            logger.info('[SurveyCooldown] Submission recorded', {
                formId: form.id,
                cooldownType,
                cooldownPeriod
            });
        } catch (error) {
            logger.error('[SurveyCooldown] Failed to record submission', {
                error: error.message,
                formId: form?.id
            });
            // Non-critical error, don't throw
        }
    }

    /**
     * Check remaining cool down time (for displaying to users)
     * @param {Object} form - Form object with cool down configuration
     * @param {string} ipAddress - Client IP address
     * @param {string|null} userId - Authenticated user ID (optional)
     * @returns {Promise<Object>} - { onCooldown: boolean, remainingTime?: number, reason?: string }
     */
    static async getRemainingTime(form, ipAddress, userId = null) {
        const result = await this.checkCooldown(form, ipAddress, userId);
        return {
            onCooldown: !result.allowed,
            remainingTime: result.remainingTime || 0,
            reason: result.reason || null,
            cooldownType: result.cooldownType || null
        };
    }

    /**
     * Clear cool down for a specific form/user/IP (admin override)
     * @param {number} formId - Form ID
     * @param {string|null} ipAddress - IP address to clear (optional)
     * @param {string|null} userId - User ID to clear (optional)
     */
    static async clearCooldown(formId, ipAddress = null, userId = null) {
        try {
            const keysToDelete = [];

            if (ipAddress) {
                keysToDelete.push(`cooldown:ip:${formId}:${ipAddress}`);
            }

            if (userId) {
                keysToDelete.push(`cooldown:user:${formId}:${userId}`);
            }

            for (const key of keysToDelete) {
                await rateLimitCache.del(key);
            }

            logger.info('[SurveyCooldown] Cool down cleared', {
                formId,
                ipAddress,
                userId,
                clearedKeys: keysToDelete.length
            });
        } catch (error) {
            logger.error('[SurveyCooldown] Failed to clear cool down', {
                error: error.message,
                formId
            });
            throw error;
        }
    }

    /**
     * Format time in human-readable format
     * @private
     */
    static _formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        } else if (seconds < 3600) {
            const minutes = Math.ceil(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (seconds < 86400) {
            const hours = Math.ceil(seconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            const days = Math.ceil(seconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
    }
}

module.exports = SurveyCooldownService;
