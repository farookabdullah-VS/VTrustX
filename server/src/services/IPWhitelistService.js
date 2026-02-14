const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const ipaddr = require('ipaddr.js');

/**
 * IP Whitelist Service
 *
 * Manages IP-based access control for tenants, supporting individual IPs and CIDR ranges.
 * Provides fine-grained control over who can access the platform based on their IP address.
 *
 * Features:
 * - Individual IP whitelisting (192.168.1.1)
 * - CIDR range support (192.168.1.0/24)
 * - IPv4 and IPv6 support
 * - Three enforcement modes: enforce, monitor, disabled
 * - Role-based bypass (admins can bypass)
 * - Grace period for testing rule changes
 * - Access logging for audit trail
 */
class IPWhitelistService {
    /**
     * Check if an IP address is allowed for a tenant
     *
     * @param {number} tenantId - Tenant ID
     * @param {string} ipAddress - IP address to check
     * @param {object} options - Additional options
     * @returns {Promise<object>} - { allowed: boolean, reason: string, matchedRule: object }
     */
    static async checkIPAccess(tenantId, ipAddress, options = {}) {
        try {
            const { userRole, requestPath, userAgent, userId } = options;

            // Get whitelist configuration
            const configResult = await query(
                `SELECT * FROM ip_whitelist_config WHERE tenant_id = $1`,
                [tenantId]
            );

            // If no config exists or disabled, allow access
            if (configResult.rows.length === 0 || configResult.rows[0].enforcement_mode === 'disabled') {
                await this.logAccess(tenantId, userId, ipAddress, true, 'whitelist_disabled', null, requestPath, userAgent);
                return {
                    allowed: true,
                    reason: 'whitelist_disabled'
                };
            }

            const config = configResult.rows[0];

            // Check if user role can bypass
            const bypassRoles = config.bypass_roles || [];
            if (userRole && bypassRoles.includes(userRole)) {
                await this.logAccess(tenantId, userId, ipAddress, true, 'bypass_role', null, requestPath, userAgent);
                return {
                    allowed: true,
                    reason: 'bypass_role'
                };
            }

            // Get active whitelist rules
            const rulesResult = await query(
                `SELECT * FROM ip_whitelist_rules
                WHERE tenant_id = $1 AND is_active = true`,
                [tenantId]
            );

            if (rulesResult.rows.length === 0) {
                // No rules defined - default to deny in enforce mode
                const allowed = config.enforcement_mode !== 'enforce';
                await this.logAccess(tenantId, userId, ipAddress, allowed, 'no_rules_defined', null, requestPath, userAgent);
                return {
                    allowed,
                    reason: 'no_rules_defined',
                    enforcementMode: config.enforcement_mode
                };
            }

            // Check if IP matches any rule
            for (const rule of rulesResult.rows) {
                if (this.matchesRule(ipAddress, rule)) {
                    await this.logAccess(tenantId, userId, ipAddress, true, 'matched_rule', rule.id, requestPath, userAgent);
                    return {
                        allowed: true,
                        reason: 'matched_rule',
                        matchedRule: rule
                    };
                }
            }

            // No match found
            const allowed = config.enforcement_mode === 'monitor'; // Allow in monitor mode
            await this.logAccess(tenantId, userId, ipAddress, allowed, 'not_whitelisted', null, requestPath, userAgent);
            return {
                allowed,
                reason: 'not_whitelisted',
                enforcementMode: config.enforcement_mode
            };
        } catch (error) {
            logger.error('[IPWhitelistService] Check access failed', {
                error: error.message,
                tenantId,
                ipAddress
            });
            // Fail-open: Allow access if check fails
            return {
                allowed: true,
                reason: 'check_failed',
                error: error.message
            };
        }
    }

    /**
     * Check if an IP address matches a whitelist rule
     *
     * @param {string} ipAddress - IP address to check
     * @param {object} rule - Whitelist rule
     * @returns {boolean} - True if IP matches the rule
     */
    static matchesRule(ipAddress, rule) {
        try {
            // Parse the IP address
            const addr = ipaddr.process(ipAddress);

            // Match single IP
            if (rule.ip_address) {
                const ruleAddr = ipaddr.process(rule.ip_address);
                return addr.toString() === ruleAddr.toString();
            }

            // Match CIDR range
            if (rule.ip_range) {
                const [rangeStr, prefixStr] = rule.ip_range.split('/');
                const range = ipaddr.process(rangeStr);
                const prefix = parseInt(prefixStr);

                // Check if both are same type (IPv4 or IPv6)
                if (addr.kind() !== range.kind()) {
                    return false;
                }

                return addr.match(range, prefix);
            }

            return false;
        } catch (error) {
            logger.error('[IPWhitelistService] Match rule failed', {
                error: error.message,
                ipAddress,
                rule
            });
            return false;
        }
    }

    /**
     * Log an IP access attempt
     */
    static async logAccess(tenantId, userId, ipAddress, allowed, reason, matchedRuleId, requestPath, userAgent) {
        try {
            await query(
                `INSERT INTO ip_access_log
                (tenant_id, user_id, ip_address, request_path, allowed, reason, matched_rule_id, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [tenantId || null, userId || null, ipAddress, requestPath || null, allowed, reason, matchedRuleId || null, userAgent || null]
            );
        } catch (error) {
            // Non-critical: Don't throw if logging fails
            logger.error('[IPWhitelistService] Log access failed', {
                error: error.message,
                tenantId,
                ipAddress
            });
        }
    }

    /**
     * Get whitelist configuration for a tenant
     */
    static async getConfig(tenantId) {
        try {
            const result = await query(
                `SELECT * FROM ip_whitelist_config WHERE tenant_id = $1`,
                [tenantId]
            );

            if (result.rows.length === 0) {
                // Return default config
                return {
                    enabled: false,
                    enforcement_mode: 'disabled',
                    bypass_roles: [],
                    grace_period_minutes: 0,
                    isDefault: true
                };
            }

            return {
                ...result.rows[0],
                isDefault: false
            };
        } catch (error) {
            logger.error('[IPWhitelistService] Get config failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update whitelist configuration
     */
    static async updateConfig(tenantId, userId, configData) {
        try {
            const {
                enabled,
                enforcement_mode,
                bypass_roles,
                grace_period_minutes
            } = configData;

            const result = await query(
                `INSERT INTO ip_whitelist_config
                (tenant_id, enabled, enforcement_mode, bypass_roles, grace_period_minutes, last_modified_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (tenant_id)
                DO UPDATE SET
                    enabled = COALESCE($2, ip_whitelist_config.enabled),
                    enforcement_mode = COALESCE($3, ip_whitelist_config.enforcement_mode),
                    bypass_roles = COALESCE($4, ip_whitelist_config.bypass_roles),
                    grace_period_minutes = COALESCE($5, ip_whitelist_config.grace_period_minutes),
                    last_modified_by = $6,
                    updated_at = NOW()
                RETURNING *`,
                [
                    tenantId,
                    enabled !== undefined ? enabled : null,
                    enforcement_mode || null,
                    bypass_roles ? JSON.stringify(bypass_roles) : null,
                    grace_period_minutes !== undefined ? grace_period_minutes : null,
                    userId
                ]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[IPWhitelistService] Update config failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Add a whitelist rule
     */
    static async addRule(tenantId, userId, ruleData) {
        try {
            const {
                ip_address,
                ip_range,
                description,
                is_active = true
            } = ruleData;

            // Validate input
            if (!ip_address && !ip_range) {
                throw new Error('Either ip_address or ip_range must be provided');
            }

            if (ip_address && ip_range) {
                throw new Error('Cannot specify both ip_address and ip_range');
            }

            // Validate IP format
            if (ip_address) {
                ipaddr.process(ip_address); // Throws if invalid
            }

            if (ip_range) {
                const [rangeStr, prefixStr] = ip_range.split('/');
                ipaddr.process(rangeStr); // Throws if invalid
                const prefix = parseInt(prefixStr);
                if (isNaN(prefix) || prefix < 0 || prefix > 128) {
                    throw new Error('Invalid CIDR prefix');
                }
            }

            const result = await query(
                `INSERT INTO ip_whitelist_rules
                (tenant_id, ip_address, ip_range, description, is_active, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [tenantId, ip_address || null, ip_range || null, description || null, is_active, userId]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[IPWhitelistService] Add rule failed', {
                error: error.message,
                tenantId,
                ruleData
            });
            throw error;
        }
    }

    /**
     * Update a whitelist rule
     */
    static async updateRule(ruleId, tenantId, updates) {
        try {
            const {
                ip_address,
                ip_range,
                description,
                is_active
            } = updates;

            // Validate if IP fields are being updated
            if (ip_address) {
                ipaddr.process(ip_address);
            }

            if (ip_range) {
                const [rangeStr, prefixStr] = ip_range.split('/');
                ipaddr.process(rangeStr);
                const prefix = parseInt(prefixStr);
                if (isNaN(prefix) || prefix < 0 || prefix > 128) {
                    throw new Error('Invalid CIDR prefix');
                }
            }

            const result = await query(
                `UPDATE ip_whitelist_rules
                SET
                    ip_address = COALESCE($1, ip_address),
                    ip_range = COALESCE($2, ip_range),
                    description = COALESCE($3, description),
                    is_active = COALESCE($4, is_active),
                    updated_at = NOW()
                WHERE id = $5 AND tenant_id = $6
                RETURNING *`,
                [
                    ip_address !== undefined ? ip_address : null,
                    ip_range !== undefined ? ip_range : null,
                    description !== undefined ? description : null,
                    is_active !== undefined ? is_active : null,
                    ruleId,
                    tenantId
                ]
            );

            if (result.rows.length === 0) {
                throw new Error('Rule not found or access denied');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('[IPWhitelistService] Update rule failed', {
                error: error.message,
                ruleId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete a whitelist rule
     */
    static async deleteRule(ruleId, tenantId) {
        try {
            const result = await query(
                `DELETE FROM ip_whitelist_rules
                WHERE id = $1 AND tenant_id = $2
                RETURNING id`,
                [ruleId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Rule not found or access denied');
            }

            return { success: true, deletedId: ruleId };
        } catch (error) {
            logger.error('[IPWhitelistService] Delete rule failed', {
                error: error.message,
                ruleId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all whitelist rules for a tenant
     */
    static async getRules(tenantId, filters = {}) {
        try {
            const { is_active, search } = filters;

            let sql = `SELECT * FROM ip_whitelist_rules WHERE tenant_id = $1`;
            const params = [tenantId];
            let paramIndex = 2;

            if (is_active !== undefined) {
                sql += ` AND is_active = $${paramIndex++}`;
                params.push(is_active);
            }

            if (search) {
                sql += ` AND (ip_address LIKE $${paramIndex++} OR ip_range LIKE $${paramIndex++} OR description LIKE $${paramIndex++})`;
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            sql += ` ORDER BY created_at DESC`;

            const result = await query(sql, params);
            return result.rows;
        } catch (error) {
            logger.error('[IPWhitelistService] Get rules failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get access logs
     */
    static async getAccessLogs(tenantId, filters = {}) {
        try {
            const {
                ip_address,
                allowed,
                startDate,
                endDate,
                limit = 100,
                offset = 0
            } = filters;

            let sql = `SELECT * FROM ip_access_log WHERE tenant_id = $1`;
            const params = [tenantId];
            let paramIndex = 2;

            if (ip_address) {
                sql += ` AND ip_address = $${paramIndex++}`;
                params.push(ip_address);
            }

            if (allowed !== undefined) {
                sql += ` AND allowed = $${paramIndex++}`;
                params.push(allowed);
            }

            if (startDate) {
                sql += ` AND created_at >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                sql += ` AND created_at <= $${paramIndex++}`;
                params.push(endDate);
            }

            sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            params.push(limit, offset);

            const result = await query(sql, params);
            return result.rows;
        } catch (error) {
            logger.error('[IPWhitelistService] Get access logs failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get access statistics
     */
    static async getStats(tenantId, days = 7) {
        try {
            const result = await query(
                `SELECT
                    COUNT(*) as total_attempts,
                    COUNT(*) FILTER (WHERE allowed = true) as allowed_count,
                    COUNT(*) FILTER (WHERE allowed = false) as denied_count,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
                FROM ip_access_log
                WHERE tenant_id = $1
                  AND created_at > NOW() - INTERVAL '${days} days'`,
                [tenantId]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('[IPWhitelistService] Get stats failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

module.exports = IPWhitelistService;
