/**
 * CRM Connection Service
 *
 * Main service for managing CRM connections and sync operations
 * Orchestrates connectors, field mappings, and sync logs
 */

const { query } = require('../../infrastructure/database/db');
const CRMConnectorFactory = require('./CRMConnectorFactory');
const logger = require('../../infrastructure/logger');

class CRMConnectionService {
    /**
     * Create a new CRM connection
     */
    static async createConnection(tenantId, userId, connectionData) {
        const { platform, connectionName, credentials, settings = {} } = connectionData;

        try {
            // Validate credentials
            const validation = CRMConnectorFactory.validateCredentials(platform, credentials);
            if (!validation.valid) {
                throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
            }

            // Encrypt credentials
            const encryptedCreds = require('./BaseCRMConnector').encryptCredentials(credentials);

            // Insert connection
            const result = await query(
                `INSERT INTO crm_connections
                (tenant_id, platform, connection_name, credentials, settings, status, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [
                    tenantId,
                    platform.toLowerCase(),
                    connectionName,
                    encryptedCreds,
                    JSON.stringify(settings),
                    'active',
                    userId
                ]
            );

            const connection = result.rows[0];

            // Test connection
            const connector = CRMConnectorFactory.createConnector(connection);
            const testResult = await connector.testConnection();

            if (!testResult.success) {
                await query('DELETE FROM crm_connections WHERE id = $1', [connection.id]);
                throw new Error(`Connection test failed: ${testResult.message}`);
            }

            logger.info('[CRMConnectionService] Connection created', {
                connectionId: connection.id,
                platform,
                tenantId
            });

            return connection;
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to create connection', {
                error: error.message,
                platform,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get connections for tenant
     */
    static async getConnections(tenantId, filters = {}) {
        try {
            const conditions = ['tenant_id = $1'];
            const params = [tenantId];
            let paramIndex = 2;

            if (filters.platform) {
                conditions.push(`platform = $${paramIndex}`);
                params.push(filters.platform);
                paramIndex++;
            }

            if (filters.status) {
                conditions.push(`status = $${paramIndex}`);
                params.push(filters.status);
                paramIndex++;
            }

            const result = await query(
                `SELECT id, tenant_id, platform, connection_name, settings, status,
                        last_sync_at, last_sync_status, created_at, updated_at
                FROM crm_connections
                WHERE ${conditions.join(' AND ')}
                ORDER BY created_at DESC`,
                params
            );

            return result.rows;
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to get connections', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get single connection by ID
     */
    static async getConnection(connectionId, tenantId) {
        try {
            const result = await query(
                `SELECT * FROM crm_connections
                WHERE id = $1 AND tenant_id = $2`,
                [connectionId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Connection ${connectionId} not found`);
            }

            return result.rows[0];
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to get connection', {
                error: error.message,
                connectionId
            });
            throw error;
        }
    }

    /**
     * Update connection
     */
    static async updateConnection(connectionId, tenantId, updates) {
        try {
            const allowedFields = ['connection_name', 'settings', 'status'];
            const setClauses = [];
            const params = [];
            let paramIndex = 1;

            Object.keys(updates).forEach(field => {
                if (allowedFields.includes(field)) {
                    setClauses.push(`${field} = $${paramIndex}`);
                    params.push(field === 'settings' ? JSON.stringify(updates[field]) : updates[field]);
                    paramIndex++;
                }
            });

            if (setClauses.length === 0) {
                throw new Error('No valid fields to update');
            }

            setClauses.push(`updated_at = NOW()`);
            params.push(connectionId, tenantId);

            const result = await query(
                `UPDATE crm_connections
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
                RETURNING *`,
                params
            );

            if (result.rows.length === 0) {
                throw new Error(`Connection ${connectionId} not found`);
            }

            return result.rows[0];
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to update connection', {
                error: error.message,
                connectionId
            });
            throw error;
        }
    }

    /**
     * Delete connection
     */
    static async deleteConnection(connectionId, tenantId) {
        try {
            const result = await query(
                `DELETE FROM crm_connections
                WHERE id = $1 AND tenant_id = $2
                RETURNING id`,
                [connectionId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Connection ${connectionId} not found`);
            }

            logger.info('[CRMConnectionService] Connection deleted', {
                connectionId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to delete connection', {
                error: error.message,
                connectionId
            });
            throw error;
        }
    }

    /**
     * Test connection
     */
    static async testConnection(connectionId, tenantId) {
        try {
            const connection = await this.getConnection(connectionId, tenantId);
            const connector = CRMConnectorFactory.createConnector(connection);

            return await connector.testConnection();
        } catch (error) {
            logger.error('[CRMConnectionService] Connection test failed', {
                error: error.message,
                connectionId
            });
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Sync contacts to CRM
     */
    static async syncContactsToCRM(connectionId, tenantId, contactIds = []) {
        try {
            const connection = await this.getConnection(connectionId, tenantId);
            const connector = CRMConnectorFactory.createConnector(connection);

            // Get contacts to sync
            let contactQuery = 'SELECT * FROM contacts WHERE tenant_id = $1';
            const params = [tenantId];

            if (contactIds.length > 0) {
                contactQuery += ' AND id = ANY($2)';
                params.push(contactIds);
            }

            const contactsResult = await query(contactQuery, params);
            const contacts = contactsResult.rows;

            if (contacts.length === 0) {
                return { success: 0, failed: 0, errors: [], message: 'No contacts to sync' };
            }

            // Sync contacts
            const result = await connector.syncContactsToCRM(contacts);

            logger.info('[CRMConnectionService] Contacts synced to CRM', {
                connectionId,
                success: result.success,
                failed: result.failed
            });

            return result;
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to sync contacts to CRM', {
                error: error.message,
                connectionId
            });
            throw error;
        }
    }

    /**
     * Sync contacts from CRM
     */
    static async syncContactsFromCRM(connectionId, tenantId, filters = {}) {
        try {
            const connection = await this.getConnection(connectionId, tenantId);
            const connector = CRMConnectorFactory.createConnector(connection);

            const result = await connector.syncContactsFromCRM(filters);

            logger.info('[CRMConnectionService] Contacts synced from CRM', {
                connectionId,
                count: result.contacts.length,
                hasMore: result.hasMore
            });

            return result;
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to sync contacts from CRM', {
                error: error.message,
                connectionId
            });
            throw error;
        }
    }

    /**
     * Push survey response to CRM
     */
    static async pushResponseToCRM(connectionId, tenantId, submissionId) {
        try {
            const connection = await this.getConnection(connectionId, tenantId);
            const connector = CRMConnectorFactory.createConnector(connection);

            // Get submission data
            const submissionResult = await query(
                `SELECT s.*, f.title as form_title
                FROM submissions s
                JOIN forms f ON s.form_id = f.id
                WHERE s.id = $1 AND s.tenant_id = $2`,
                [submissionId, tenantId]
            );

            if (submissionResult.rows.length === 0) {
                throw new Error(`Submission ${submissionId} not found`);
            }

            const submission = submissionResult.rows[0];

            // Get field mappings
            const mappingsResult = await query(
                `SELECT * FROM crm_field_mappings
                WHERE connection_id = $1 AND object_type = 'submission' AND is_active = true`,
                [connectionId]
            );

            const result = await connector.pushResponse(submission, mappingsResult.rows);

            logger.info('[CRMConnectionService] Response pushed to CRM', {
                connectionId,
                submissionId,
                success: result.success
            });

            return result;
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to push response to CRM', {
                error: error.message,
                connectionId,
                submissionId
            });
            throw error;
        }
    }

    /**
     * Get sync logs
     */
    static async getSyncLogs(connectionId, tenantId, filters = {}) {
        try {
            const conditions = ['connection_id = $1'];
            const params = [connectionId];
            let paramIndex = 2;

            if (filters.status) {
                conditions.push(`status = $${paramIndex}`);
                params.push(filters.status);
                paramIndex++;
            }

            if (filters.syncType) {
                conditions.push(`sync_type = $${paramIndex}`);
                params.push(filters.syncType);
                paramIndex++;
            }

            const limit = filters.limit || 50;
            const offset = filters.offset || 0;

            params.push(limit, offset);

            const result = await query(
                `SELECT * FROM crm_sync_logs
                WHERE ${conditions.join(' AND ')}
                ORDER BY created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                params
            );

            return result.rows;
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to get sync logs', {
                error: error.message,
                connectionId
            });
            throw error;
        }
    }

    /**
     * Get available fields from CRM
     */
    static async getAvailableFields(connectionId, tenantId, objectType = 'contact') {
        try {
            const connection = await this.getConnection(connectionId, tenantId);
            const connector = CRMConnectorFactory.createConnector(connection);

            return await connector.getAvailableFields(objectType);
        } catch (error) {
            logger.error('[CRMConnectionService] Failed to get available fields', {
                error: error.message,
                connectionId,
                objectType
            });
            throw error;
        }
    }

    /**
     * Get supported platforms
     */
    static getSupportedPlatforms() {
        return CRMConnectorFactory.getSupportedPlatforms();
    }

    /**
     * Get OAuth URL
     */
    static getOAuthURL(platform, config) {
        return CRMConnectorFactory.getOAuthURL(platform, config);
    }
}

module.exports = CRMConnectionService;
