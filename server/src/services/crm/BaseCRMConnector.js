/**
 * Base CRM Connector
 *
 * Abstract base class for all CRM integrations
 * Provides common interface and shared functionality for:
 * - Salesforce
 * - HubSpot
 * - Zoho CRM
 * - Pipedrive
 * - Microsoft Dynamics 365
 */

const logger = require('../../infrastructure/logger');
const { encrypt, decrypt } = require('../../infrastructure/security/encryption');

class BaseCRMConnector {
    constructor(connection) {
        if (this.constructor === BaseCRMConnector) {
            throw new Error('BaseCRMConnector is abstract and cannot be instantiated directly');
        }

        this.connection = connection;
        this.platform = connection.platform;
        this.credentials = this.decryptCredentials(connection.credentials);
        this.settings = connection.settings || {};
        this.tenantId = connection.tenant_id;
    }

    /**
     * Decrypt stored credentials
     */
    decryptCredentials(encryptedCreds) {
        try {
            if (typeof encryptedCreds === 'string') {
                return JSON.parse(decrypt(encryptedCreds));
            }
            // If already decrypted (in-memory)
            return encryptedCreds;
        } catch (error) {
            logger.error('[BaseCRMConnector] Failed to decrypt credentials', {
                platform: this.platform,
                error: error.message
            });
            throw new Error('Invalid CRM credentials');
        }
    }

    /**
     * Encrypt credentials for storage
     */
    static encryptCredentials(credentials) {
        return encrypt(JSON.stringify(credentials));
    }

    // ===== ABSTRACT METHODS (must be implemented by subclasses) =====

    /**
     * Test connection to CRM
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async testConnection() {
        throw new Error('testConnection() must be implemented by subclass');
    }

    /**
     * Refresh OAuth access token
     * @returns {Promise<{accessToken: string, expiresAt: Date}>}
     */
    async refreshAccessToken() {
        throw new Error('refreshAccessToken() must be implemented by subclass');
    }

    /**
     * Get available fields for an object type
     * @param {string} objectType - contact, account, opportunity, etc.
     * @returns {Promise<Array>} - Array of field definitions
     */
    async getAvailableFields(objectType) {
        throw new Error('getAvailableFields() must be implemented by subclass');
    }

    /**
     * Sync contacts from VTrustX to CRM
     * @param {Array} contacts - Array of VTrustX contacts
     * @returns {Promise<{success: number, failed: number, errors: Array}>}
     */
    async syncContactsToCRM(contacts) {
        throw new Error('syncContactsToCRM() must be implemented by subclass');
    }

    /**
     * Sync contacts from CRM to VTrustX
     * @param {Object} filters - Filters for CRM query
     * @returns {Promise<{contacts: Array, hasMore: boolean}>}
     */
    async syncContactsFromCRM(filters = {}) {
        throw new Error('syncContactsFromCRM() must be implemented by subclass');
    }

    /**
     * Create or update a contact in CRM
     * @param {Object} contactData - Contact data to sync
     * @returns {Promise<{crmId: string, success: boolean}>}
     */
    async upsertContact(contactData) {
        throw new Error('upsertContact() must be implemented by subclass');
    }

    /**
     * Push survey response to CRM
     * @param {Object} submission - VTrustX submission
     * @param {Object} mappings - Field mappings
     * @returns {Promise<{success: boolean, crmId: string}>}
     */
    async pushResponse(submission, mappings) {
        throw new Error('pushResponse() must be implemented by subclass');
    }

    /**
     * Create a task/activity in CRM
     * @param {Object} taskData - Task data
     * @returns {Promise<{success: boolean, taskId: string}>}
     */
    async createTask(taskData) {
        throw new Error('createTask() must be implemented by subclass');
    }

    /**
     * Update a field in CRM
     * @param {string} objectType - Object type (Contact, Lead, etc.)
     * @param {string} recordId - CRM record ID
     * @param {Object} fieldUpdates - Fields to update
     * @returns {Promise<{success: boolean}>}
     */
    async updateRecord(objectType, recordId, fieldUpdates) {
        throw new Error('updateRecord() must be implemented by subclass');
    }

    /**
     * Search for records in CRM
     * @param {string} objectType - Object type to search
     * @param {Object} query - Search query
     * @returns {Promise<Array>} - Array of matching records
     */
    async searchRecords(objectType, query) {
        throw new Error('searchRecords() must be implemented by subclass');
    }

    // ===== SHARED HELPER METHODS =====

    /**
     * Apply field mappings to transform data
     * @param {Object} data - Source data
     * @param {Array} mappings - Field mappings
     * @param {string} direction - 'vtrust_to_crm' or 'crm_to_vtrust'
     * @returns {Object} - Transformed data
     */
    applyFieldMappings(data, mappings, direction) {
        const result = {};

        mappings.forEach(mapping => {
            if (
                mapping.sync_direction === 'bidirectional' ||
                mapping.sync_direction === direction
            ) {
                const sourceField = direction === 'vtrust_to_crm'
                    ? mapping.vtrust_field
                    : mapping.crm_field;

                const targetField = direction === 'vtrust_to_crm'
                    ? mapping.crm_field
                    : mapping.vtrust_field;

                let value = this.getNestedValue(data, sourceField);

                // Apply transformation rules
                if (mapping.transform_rules && Object.keys(mapping.transform_rules).length > 0) {
                    value = this.applyTransformRules(value, mapping.transform_rules);
                }

                if (value !== undefined && value !== null) {
                    this.setNestedValue(result, targetField, value);
                }
            }
        });

        return result;
    }

    /**
     * Get nested object value by path (e.g., "contact.email")
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Set nested object value by path
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    /**
     * Apply transformation rules to a value
     */
    applyTransformRules(value, rules) {
        if (!value || !rules) return value;

        // Value mapping (e.g., map "Yes"/"No" to true/false)
        if (rules.valueMap && rules.valueMap[value]) {
            value = rules.valueMap[value];
        }

        // Data type conversion
        if (rules.dataType) {
            switch (rules.dataType) {
                case 'number':
                    value = parseFloat(value);
                    break;
                case 'boolean':
                    value = Boolean(value);
                    break;
                case 'string':
                    value = String(value);
                    break;
                case 'date':
                    value = new Date(value).toISOString();
                    break;
            }
        }

        // Default value if empty
        if ((value === null || value === undefined || value === '') && rules.defaultValue) {
            value = rules.defaultValue;
        }

        // Prefix/suffix
        if (rules.prefix) value = rules.prefix + value;
        if (rules.suffix) value = value + rules.suffix;

        // Regex transformation
        if (rules.regex && rules.replacement !== undefined) {
            value = String(value).replace(new RegExp(rules.regex, 'g'), rules.replacement);
        }

        return value;
    }

    /**
     * Log sync operation
     */
    async logSyncOperation(syncType, syncDirection, status, stats = {}) {
        const { query } = require('../../infrastructure/database/db');

        try {
            await query(
                `INSERT INTO crm_sync_logs
                (connection_id, sync_type, sync_direction, status, records_processed, records_success, records_failed, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    this.connection.id,
                    syncType,
                    syncDirection,
                    status,
                    stats.processed || 0,
                    stats.success || 0,
                    stats.failed || 0,
                    JSON.stringify(stats.metadata || {})
                ]
            );
        } catch (error) {
            logger.error('[BaseCRMConnector] Failed to log sync operation', {
                error: error.message,
                connectionId: this.connection.id
            });
        }
    }

    /**
     * Update connection status
     */
    async updateConnectionStatus(status, errorMessage = null) {
        const { query } = require('../../infrastructure/database/db');

        try {
            await query(
                `UPDATE crm_connections
                SET status = $1, last_error = $2, updated_at = NOW()
                WHERE id = $3`,
                [status, errorMessage, this.connection.id]
            );
        } catch (error) {
            logger.error('[BaseCRMConnector] Failed to update connection status', {
                error: error.message,
                connectionId: this.connection.id
            });
        }
    }

    /**
     * Get or create object mapping
     */
    async getOrCreateObjectMapping(vtrustObjectType, vtrustObjectId, crmObjectType, crmObjectId) {
        const { query } = require('../../infrastructure/database/db');

        try {
            // Check if mapping exists
            const result = await query(
                `SELECT * FROM crm_object_mappings
                WHERE connection_id = $1
                AND vtrust_object_type = $2
                AND vtrust_object_id = $3`,
                [this.connection.id, vtrustObjectType, vtrustObjectId]
            );

            if (result.rows.length > 0) {
                // Update existing mapping
                await query(
                    `UPDATE crm_object_mappings
                    SET crm_object_id = $1, crm_object_type = $2, last_synced_at = NOW(), updated_at = NOW()
                    WHERE id = $3`,
                    [crmObjectId, crmObjectType, result.rows[0].id]
                );
                return result.rows[0];
            }

            // Create new mapping
            const insertResult = await query(
                `INSERT INTO crm_object_mappings
                (connection_id, vtrust_object_type, vtrust_object_id, crm_object_type, crm_object_id, last_synced_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING *`,
                [this.connection.id, vtrustObjectType, vtrustObjectId, crmObjectType, crmObjectId]
            );

            return insertResult.rows[0];
        } catch (error) {
            logger.error('[BaseCRMConnector] Failed to create object mapping', {
                error: error.message,
                vtrustObjectType,
                vtrustObjectId
            });
            throw error;
        }
    }

    /**
     * Rate limiting helper (override in subclass if needed)
     */
    async rateLimit() {
        // Default: no rate limiting
        // Subclasses can override to implement platform-specific rate limiting
        return Promise.resolve();
    }

    /**
     * Handle API errors (override in subclass for platform-specific handling)
     */
    handleAPIError(error, context = {}) {
        logger.error(`[${this.platform}] API Error`, {
            error: error.message,
            context,
            connectionId: this.connection.id
        });

        // Check for auth errors
        if (error.statusCode === 401 || error.statusCode === 403) {
            this.updateConnectionStatus('expired', 'Authentication expired. Please reconnect.');
        }

        throw error;
    }
}

module.exports = BaseCRMConnector;
