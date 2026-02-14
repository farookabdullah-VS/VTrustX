const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

/**
 * Audit Log Service
 *
 * Centralized service for logging all user actions across the platform.
 * Supports compliance requirements (SOC 2, ISO 27001, GDPR, HIPAA).
 *
 * Categories:
 * - authentication: Login, logout, password changes, 2FA
 * - authorization: Role/permission changes
 * - data_access: View, search, export sensitive data
 * - data_modification: Create, update, delete operations
 * - security: Failed logins, suspicious activity, security events
 * - system: Configuration changes, integrations
 */
class AuditLogService {
    /**
     * Standard action types for consistency
     */
    static ACTIONS = {
        // Authentication
        LOGIN: 'user.login',
        LOGOUT: 'user.logout',
        LOGIN_FAILED: 'user.login.failed',
        PASSWORD_CHANGE: 'user.password.change',
        PASSWORD_RESET: 'user.password.reset',
        TWO_FACTOR_ENABLE: 'user.2fa.enable',
        TWO_FACTOR_DISABLE: 'user.2fa.disable',

        // Authorization
        ROLE_ASSIGNED: 'user.role.assigned',
        ROLE_REVOKED: 'user.role.revoked',
        PERMISSION_GRANTED: 'user.permission.granted',
        PERMISSION_REVOKED: 'user.permission.revoked',

        // Data Access
        EXPORT_DATA: 'data.export',
        VIEW_SENSITIVE: 'data.view.sensitive',
        SEARCH: 'data.search',
        BULK_DOWNLOAD: 'data.bulk.download',

        // Data Modification
        CREATE: 'resource.create',
        UPDATE: 'resource.update',
        DELETE: 'resource.delete',
        BULK_DELETE: 'resource.bulk.delete',

        // Security Events
        SUSPICIOUS_ACTIVITY: 'security.suspicious',
        RATE_LIMIT_EXCEEDED: 'security.rate_limit',
        UNAUTHORIZED_ACCESS: 'security.unauthorized',
        API_KEY_CREATED: 'security.api_key.create',
        API_KEY_REVOKED: 'security.api_key.revoke',

        // System
        CONFIG_CHANGE: 'system.config.change',
        INTEGRATION_ADDED: 'system.integration.add',
        INTEGRATION_REMOVED: 'system.integration.remove'
    };

    /**
     * Log an audit event
     *
     * @param {object} options - Audit log options
     * @returns {Promise<object>} - Created audit log entry
     */
    static async log(options) {
        try {
            const {
                tenantId,
                userId,
                actorEmail,
                actorName,
                action,
                category,
                resourceType,
                resourceId,
                resourceName,
                status = 'success',
                severity = 'info',
                ipAddress,
                userAgent,
                requestMethod,
                requestPath,
                changes,
                metadata = {},
                errorMessage,
                sessionId
            } = options;

            // Validate required fields
            if (!action || !category) {
                throw new Error('Action and category are required');
            }

            const result = await query(
                `INSERT INTO audit_logs
                (tenant_id, user_id, actor_email, actor_name, action, category,
                 resource_type, resource_id, resource_name, status, severity,
                 ip_address, user_agent, request_method, request_path,
                 changes, metadata, error_message, session_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING id, created_at`,
                [
                    tenantId || null,
                    userId || null,
                    actorEmail || null,
                    actorName || null,
                    action,
                    category,
                    resourceType || null,
                    resourceId ? String(resourceId) : null,
                    resourceName || null,
                    status,
                    severity,
                    ipAddress || null,
                    userAgent || null,
                    requestMethod || null,
                    requestPath || null,
                    changes ? JSON.stringify(changes) : null,
                    JSON.stringify(metadata),
                    errorMessage || null,
                    sessionId || null
                ]
            );

            logger.debug('[Audit] Event logged', {
                id: result.rows[0].id,
                action,
                category,
                resourceType,
                status
            });

            return result.rows[0];
        } catch (error) {
            // Log to application logger but don't throw - audit logging failures shouldn't break operations
            logger.error('[Audit] Failed to log event', {
                error: error.message,
                action: options.action
            });
            return null;
        }
    }

    /**
     * Convenience method for authentication events
     */
    static async logAuth(tenantId, userId, action, status, reqInfo = {}) {
        return this.log({
            tenantId,
            userId,
            actorEmail: reqInfo.email,
            actorName: reqInfo.name,
            action,
            category: 'authentication',
            status,
            severity: status === 'failure' ? 'warning' : 'info',
            ipAddress: reqInfo.ip,
            userAgent: reqInfo.userAgent,
            errorMessage: reqInfo.errorMessage,
            metadata: reqInfo.metadata
        });
    }

    /**
     * Convenience method for data modification events
     */
    static async logDataModification(tenantId, userId, action, resourceType, resourceId, changes, reqInfo = {}) {
        return this.log({
            tenantId,
            userId,
            actorEmail: reqInfo.email,
            actorName: reqInfo.name,
            action,
            category: 'data_modification',
            resourceType,
            resourceId,
            resourceName: reqInfo.resourceName,
            changes,
            ipAddress: reqInfo.ip,
            userAgent: reqInfo.userAgent,
            requestMethod: reqInfo.method,
            requestPath: reqInfo.path,
            metadata: reqInfo.metadata
        });
    }

    /**
     * Convenience method for security events
     */
    static async logSecurity(tenantId, userId, action, severity, reqInfo = {}) {
        return this.log({
            tenantId,
            userId,
            actorEmail: reqInfo.email,
            action,
            category: 'security',
            severity,
            status: reqInfo.status || 'success',
            ipAddress: reqInfo.ip,
            userAgent: reqInfo.userAgent,
            errorMessage: reqInfo.errorMessage,
            metadata: reqInfo.metadata
        });
    }

    /**
     * Query audit logs with filters
     *
     * @param {object} filters - Query filters
     * @returns {Promise<array>} - Audit log entries
     */
    static async query(filters = {}) {
        try {
            const {
                tenantId,
                userId,
                action,
                category,
                resourceType,
                resourceId,
                status,
                severity,
                startDate,
                endDate,
                limit = 100,
                offset = 0,
                orderBy = 'created_at',
                orderDir = 'DESC'
            } = filters;

            const conditions = [];
            const params = [];
            let paramIndex = 1;

            if (tenantId) {
                conditions.push(`tenant_id = $${paramIndex++}`);
                params.push(tenantId);
            }

            if (userId) {
                conditions.push(`user_id = $${paramIndex++}`);
                params.push(userId);
            }

            if (action) {
                conditions.push(`action = $${paramIndex++}`);
                params.push(action);
            }

            if (category) {
                conditions.push(`category = $${paramIndex++}`);
                params.push(category);
            }

            if (resourceType) {
                conditions.push(`resource_type = $${paramIndex++}`);
                params.push(resourceType);
            }

            if (resourceId) {
                conditions.push(`resource_id = $${paramIndex++}`);
                params.push(String(resourceId));
            }

            if (status) {
                conditions.push(`status = $${paramIndex++}`);
                params.push(status);
            }

            if (severity) {
                conditions.push(`severity = $${paramIndex++}`);
                params.push(severity);
            }

            if (startDate) {
                conditions.push(`created_at >= $${paramIndex++}`);
                params.push(startDate);
            }

            if (endDate) {
                conditions.push(`created_at <= $${paramIndex++}`);
                params.push(endDate);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const orderClause = `ORDER BY ${orderBy} ${orderDir}`;
            const limitClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            params.push(limit, offset);

            const result = await query(
                `SELECT * FROM audit_logs
                ${whereClause}
                ${orderClause}
                ${limitClause}`,
                params
            );

            return result.rows;
        } catch (error) {
            logger.error('[Audit] Query failed', {
                error: error.message,
                filters
            });
            throw error;
        }
    }

    /**
     * Get audit log statistics
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} days - Number of days to analyze (default: 30)
     * @returns {Promise<object>} - Statistics
     */
    static async getStats(tenantId, days = 30) {
        try {
            const result = await query(
                `SELECT
                    category,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE status = 'success') as success_count,
                    COUNT(*) FILTER (WHERE status = 'failure') as failure_count,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
                    COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
                    MIN(created_at) as first_event,
                    MAX(created_at) as last_event
                FROM audit_logs
                WHERE tenant_id = $1
                  AND created_at > NOW() - INTERVAL '${days} days'
                GROUP BY category
                ORDER BY total_count DESC`,
                [tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[Audit] Get stats failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get recent critical/warning events
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} limit - Number of events to return
     * @returns {Promise<array>} - Recent alerts
     */
    static async getAlerts(tenantId, limit = 50) {
        try {
            const result = await query(
                `SELECT *
                FROM audit_logs
                WHERE tenant_id = $1
                  AND severity IN ('critical', 'warning')
                ORDER BY created_at DESC
                LIMIT $2`,
                [tenantId, limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('[Audit] Get alerts failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get user activity timeline
     *
     * @param {number} userId - User ID
     * @param {number} limit - Number of events to return
     * @returns {Promise<array>} - User activity
     */
    static async getUserActivity(userId, limit = 100) {
        try {
            const result = await query(
                `SELECT *
                FROM audit_logs
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2`,
                [userId, limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('[Audit] Get user activity failed', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Get resource history
     *
     * @param {string} resourceType - Resource type
     * @param {string|number} resourceId - Resource ID
     * @returns {Promise<array>} - Resource history
     */
    static async getResourceHistory(resourceType, resourceId) {
        try {
            const result = await query(
                `SELECT *
                FROM audit_logs
                WHERE resource_type = $1
                  AND resource_id = $2
                ORDER BY created_at ASC`,
                [resourceType, String(resourceId)]
            );

            return result.rows;
        } catch (error) {
            logger.error('[Audit] Get resource history failed', {
                error: error.message,
                resourceType,
                resourceId
            });
            throw error;
        }
    }

    /**
     * Delete old audit logs based on retention policy
     *
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<number>} - Number of records deleted
     */
    static async cleanupOldLogs(tenantId) {
        try {
            // Get retention policy
            const policyResult = await query(
                `SELECT retention_days, critical_retention_days
                FROM audit_retention_policies
                WHERE tenant_id = $1`,
                [tenantId]
            );

            if (policyResult.rows.length === 0) {
                // No policy set, use defaults (90 days, 365 for critical)
                return 0;
            }

            const policy = policyResult.rows[0];

            if (policy.retention_days === 0) {
                // Retention is forever
                return 0;
            }

            // Delete non-critical logs older than retention_days
            const deleteResult = await query(
                `DELETE FROM audit_logs
                WHERE tenant_id = $1
                  AND severity NOT IN ('critical')
                  AND created_at < NOW() - INTERVAL '${policy.retention_days} days'`,
                [tenantId]
            );

            const nonCriticalDeleted = deleteResult.rowCount;

            // Delete critical logs older than critical_retention_days
            const criticalDeleteResult = await query(
                `DELETE FROM audit_logs
                WHERE tenant_id = $1
                  AND severity = 'critical'
                  AND created_at < NOW() - INTERVAL '${policy.critical_retention_days} days'`,
                [tenantId]
            );

            const criticalDeleted = criticalDeleteResult.rowCount;

            // Update last cleanup time
            await query(
                `UPDATE audit_retention_policies
                SET last_cleanup_at = NOW()
                WHERE tenant_id = $1`,
                [tenantId]
            );

            const totalDeleted = nonCriticalDeleted + criticalDeleted;

            logger.info('[Audit] Cleanup completed', {
                tenantId,
                nonCriticalDeleted,
                criticalDeleted,
                totalDeleted
            });

            return totalDeleted;
        } catch (error) {
            logger.error('[Audit] Cleanup failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

module.exports = AuditLogService;
