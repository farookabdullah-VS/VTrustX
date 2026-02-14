/**
 * Salesforce CRM Connector
 *
 * Implements two-way sync with Salesforce CRM
 * Features:
 * - OAuth 2.0 authentication
 * - Contact, Lead, Account, Opportunity sync
 * - Custom field mapping
 * - Task/Activity creation
 * - SOQL query support
 * - Bulk API for large data sets
 */

const BaseCRMConnector = require('./BaseCRMConnector');
const axios = require('axios');
const logger = require('../../infrastructure/logger');

class SalesforceConnector extends BaseCRMConnector {
    constructor(connection) {
        super(connection);
        this.apiVersion = 'v59.0'; // Salesforce API version
        this.instanceUrl = this.credentials.instanceUrl || 'https://login.salesforce.com';
    }

    /**
     * Get API client with auth headers
     */
    getClient() {
        return axios.create({
            baseURL: `${this.instanceUrl}/services/data/${this.apiVersion}`,
            headers: {
                'Authorization': `Bearer ${this.credentials.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Test connection to Salesforce
     */
    async testConnection() {
        try {
            const client = this.getClient();
            const response = await client.get('/query', {
                params: { q: 'SELECT Id FROM User LIMIT 1' }
            });

            await this.updateConnectionStatus('active', null);

            return {
                success: true,
                message: 'Connected to Salesforce successfully',
                userInfo: response.data
            };
        } catch (error) {
            await this.updateConnectionStatus('error', error.message);
            return {
                success: false,
                message: `Failed to connect: ${error.message}`
            };
        }
    }

    /**
     * Refresh OAuth access token
     */
    async refreshAccessToken() {
        try {
            const response = await axios.post(
                `${this.instanceUrl}/services/oauth2/token`,
                null,
                {
                    params: {
                        grant_type: 'refresh_token',
                        client_id: this.credentials.clientId,
                        client_secret: this.credentials.clientSecret,
                        refresh_token: this.credentials.refreshToken
                    }
                }
            );

            const newAccessToken = response.data.access_token;
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

            // Update credentials
            this.credentials.accessToken = newAccessToken;

            // Update in database
            const { query } = require('../../infrastructure/database/db');
            await query(
                `UPDATE crm_connections
                SET credentials = $1, updated_at = NOW()
                WHERE id = $2`,
                [BaseCRMConnector.encryptCredentials(this.credentials), this.connection.id]
            );

            logger.info('[SalesforceConnector] Access token refreshed', {
                connectionId: this.connection.id
            });

            return { accessToken: newAccessToken, expiresAt };
        } catch (error) {
            logger.error('[SalesforceConnector] Failed to refresh token', {
                error: error.message,
                connectionId: this.connection.id
            });
            throw error;
        }
    }

    /**
     * Get available fields for an object type
     */
    async getAvailableFields(objectType = 'Contact') {
        try {
            const client = this.getClient();
            const response = await client.get(`/sobjects/${objectType}/describe`);

            return response.data.fields.map(field => ({
                name: field.name,
                label: field.label,
                type: field.type,
                required: !field.nillable,
                updateable: field.updateable,
                createable: field.createable
            }));
        } catch (error) {
            logger.error('[SalesforceConnector] Failed to get fields', {
                error: error.message,
                objectType
            });
            throw error;
        }
    }

    /**
     * Sync contacts from VTrustX to Salesforce
     */
    async syncContactsToCRM(contacts) {
        const client = this.getClient();
        const results = { success: 0, failed: 0, errors: [] };

        // Get field mappings
        const { query } = require('../../infrastructure/database/db');
        const mappingsResult = await query(
            `SELECT * FROM crm_field_mappings
            WHERE connection_id = $1 AND object_type = 'contact' AND is_active = true`,
            [this.connection.id]
        );

        const mappings = mappingsResult.rows;

        for (const contact of contacts) {
            try {
                // Transform data using field mappings
                const sfData = this.applyFieldMappings(contact, mappings, 'vtrust_to_crm');

                // Check if contact exists in Salesforce
                const existingMapping = await query(
                    `SELECT crm_object_id FROM crm_object_mappings
                    WHERE connection_id = $1
                    AND vtrust_object_type = 'contact'
                    AND vtrust_object_id = $2`,
                    [this.connection.id, contact.id]
                );

                if (existingMapping.rows.length > 0) {
                    // Update existing contact
                    const contactId = existingMapping.rows[0].crm_object_id;
                    await client.patch(`/sobjects/Contact/${contactId}`, sfData);

                    logger.debug('[SalesforceConnector] Updated contact', { contactId });
                } else {
                    // Create new contact
                    const response = await client.post('/sobjects/Contact', sfData);
                    const newContactId = response.data.id;

                    // Store mapping
                    await this.getOrCreateObjectMapping(
                        'contact',
                        contact.id,
                        'Contact',
                        newContactId
                    );

                    logger.debug('[SalesforceConnector] Created contact', { contactId: newContactId });
                }

                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    contactId: contact.id,
                    error: error.message
                });
                logger.error('[SalesforceConnector] Failed to sync contact', {
                    contactId: contact.id,
                    error: error.message
                });
            }
        }

        await this.logSyncOperation('contact_sync', 'to_crm', 'completed', {
            processed: contacts.length,
            success: results.success,
            failed: results.failed
        });

        return results;
    }

    /**
     * Sync contacts from Salesforce to VTrustX
     */
    async syncContactsFromCRM(filters = {}) {
        try {
            const client = this.getClient();

            // Build SOQL query
            let soql = 'SELECT Id, FirstName, LastName, Email, Phone, Title, Company FROM Contact';

            // Add filters
            const whereClauses = [];
            if (filters.lastModifiedAfter) {
                whereClauses.push(`LastModifiedDate > ${filters.lastModifiedAfter}`);
            }
            if (filters.email) {
                whereClauses.push(`Email = '${filters.email}'`);
            }

            if (whereClauses.length > 0) {
                soql += ' WHERE ' + whereClauses.join(' AND ');
            }

            soql += ' ORDER BY LastModifiedDate DESC LIMIT 200';

            const response = await client.get('/query', { params: { q: soql } });

            return {
                contacts: response.data.records,
                hasMore: !response.data.done,
                nextRecordsUrl: response.data.nextRecordsUrl
            };
        } catch (error) {
            logger.error('[SalesforceConnector] Failed to sync from CRM', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create or update a contact in Salesforce
     */
    async upsertContact(contactData) {
        try {
            const client = this.getClient();

            // Get field mappings
            const { query } = require('../../infrastructure/database/db');
            const mappingsResult = await query(
                `SELECT * FROM crm_field_mappings
                WHERE connection_id = $1 AND object_type = 'contact' AND is_active = true`,
                [this.connection.id]
            );

            const sfData = this.applyFieldMappings(contactData, mappingsResult.rows, 'vtrust_to_crm');

            // Use external ID if available (email-based upsert)
            if (sfData.Email) {
                const response = await client.patch(
                    `/sobjects/Contact/Email/${sfData.Email}`,
                    sfData
                );

                return {
                    crmId: response.data.id,
                    success: true
                };
            }

            // Otherwise create new contact
            const response = await client.post('/sobjects/Contact', sfData);

            return {
                crmId: response.data.id,
                success: true
            };
        } catch (error) {
            logger.error('[SalesforceConnector] Failed to upsert contact', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Push survey response to Salesforce
     */
    async pushResponse(submission, mappings) {
        try {
            const client = this.getClient();

            // Transform submission data using mappings
            const sfData = this.applyFieldMappings(submission, mappings, 'vtrust_to_crm');

            // Determine target object (could be Contact, Lead, Custom Object)
            const targetObject = this.settings.responseObject || 'Contact';
            const targetField = this.settings.responseField || 'Description';

            // Format response data
            const responseText = `Survey Response: ${submission.form_title}\n\n` +
                Object.entries(submission.responses || {})
                    .map(([q, a]) => `${q}: ${a}`)
                    .join('\n');

            // Find linked contact/lead
            const { query } = require('../../infrastructure/database/db');
            const mappingResult = await query(
                `SELECT crm_object_id, crm_object_type FROM crm_object_mappings
                WHERE connection_id = $1
                AND vtrust_object_type = 'contact'
                AND vtrust_object_id = (
                    SELECT contact_id FROM submissions WHERE id = $2
                )`,
                [this.connection.id, submission.id]
            );

            if (mappingResult.rows.length > 0) {
                const recordId = mappingResult.rows[0].crm_object_id;
                const recordType = mappingResult.rows[0].crm_object_type;

                // Update the record with response
                await client.patch(`/sobjects/${recordType}/${recordId}`, {
                    [targetField]: responseText,
                    ...sfData
                });

                // Create a task/activity
                await this.createTask({
                    WhoId: recordId,
                    Subject: `Survey Response: ${submission.form_title}`,
                    Description: responseText,
                    Status: 'Completed',
                    Priority: 'Normal'
                });

                return { success: true, crmId: recordId };
            }

            return { success: false, error: 'No linked CRM record found' };
        } catch (error) {
            logger.error('[SalesforceConnector] Failed to push response', {
                error: error.message,
                submissionId: submission.id
            });
            throw error;
        }
    }

    /**
     * Create a task in Salesforce
     */
    async createTask(taskData) {
        try {
            const client = this.getClient();

            const response = await client.post('/sobjects/Task', {
                Subject: taskData.Subject || 'Follow-up Required',
                Description: taskData.Description || '',
                Status: taskData.Status || 'Not Started',
                Priority: taskData.Priority || 'Normal',
                WhoId: taskData.WhoId, // Contact/Lead ID
                WhatId: taskData.WhatId, // Account/Opportunity ID
                ActivityDate: taskData.ActivityDate || new Date().toISOString().split('T')[0]
            });

            return {
                success: true,
                taskId: response.data.id
            };
        } catch (error) {
            logger.error('[SalesforceConnector] Failed to create task', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update a record in Salesforce
     */
    async updateRecord(objectType, recordId, fieldUpdates) {
        try {
            const client = this.getClient();

            await client.patch(`/sobjects/${objectType}/${recordId}`, fieldUpdates);

            return { success: true };
        } catch (error) {
            logger.error('[SalesforceConnector] Failed to update record', {
                error: error.message,
                objectType,
                recordId
            });
            throw error;
        }
    }

    /**
     * Search for records in Salesforce
     */
    async searchRecords(objectType, query) {
        try {
            const client = this.getClient();

            // Build SOSL search query
            const searchQuery = `FIND {${query.searchTerm}} IN ALL FIELDS RETURNING ${objectType}(Id, Name, Email, Phone)`;

            const response = await client.get('/search', {
                params: { q: searchQuery }
            });

            return response.data.searchRecords || [];
        } catch (error) {
            logger.error('[SalesforceConnector] Failed to search records', {
                error: error.message,
                objectType
            });
            throw error;
        }
    }

    /**
     * Salesforce-specific rate limiting
     */
    async rateLimit() {
        // Salesforce has different rate limits based on edition
        // Implement simple delay for now
        return new Promise(resolve => setTimeout(resolve, 200));
    }
}

module.exports = SalesforceConnector;
