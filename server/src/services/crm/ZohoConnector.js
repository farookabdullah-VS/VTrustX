/**
 * Zoho CRM Connector
 *
 * Implements two-way sync with Zoho CRM
 * Features:
 * - OAuth 2.0 authentication
 * - Contact, Account, Deal sync
 * - Custom field mapping
 * - Task/Activity creation
 * - COQL query support
 */

const BaseCRMConnector = require('./BaseCRMConnector');
const axios = require('axios');
const logger = require('../../infrastructure/logger');

class ZohoConnector extends BaseCRMConnector {
    constructor(connection) {
        super(connection);
        this.apiDomain = this.credentials.apiDomain || 'https://www.zohoapis.com';
        this.apiVersion = 'v2';
    }

    /**
     * Get API client with auth headers
     */
    getClient() {
        return axios.create({
            baseURL: `${this.apiDomain}/crm/${this.apiVersion}`,
            headers: {
                'Authorization': `Zoho-oauthtoken ${this.credentials.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Test connection to Zoho CRM
     */
    async testConnection() {
        try {
            const client = this.getClient();
            const response = await client.get('/Contacts', {
                params: { per_page: 1 }
            });

            await this.updateConnectionStatus('active', null);

            return {
                success: true,
                message: 'Connected to Zoho CRM successfully',
                accountInfo: response.data
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
            const tokenURL = this.credentials.accountsServer || 'https://accounts.zoho.com';

            const response = await axios.post(
                `${tokenURL}/oauth/v2/token`,
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
            const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

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

            logger.info('[ZohoConnector] Access token refreshed', {
                connectionId: this.connection.id
            });

            return { accessToken: newAccessToken, expiresAt };
        } catch (error) {
            logger.error('[ZohoConnector] Failed to refresh token', {
                error: error.message,
                connectionId: this.connection.id
            });
            throw error;
        }
    }

    /**
     * Get available fields for a module
     */
    async getAvailableFields(module = 'Contacts') {
        try {
            const client = this.getClient();
            const response = await client.get(`/settings/fields`, {
                params: { module }
            });

            return response.data.fields.map(field => ({
                name: field.api_name,
                label: field.field_label,
                type: field.data_type,
                required: field.required,
                customField: field.custom_field
            }));
        } catch (error) {
            logger.error('[ZohoConnector] Failed to get fields', {
                error: error.message,
                module
            });
            throw error;
        }
    }

    /**
     * Sync contacts from VTrustX to Zoho
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
                const zohoData = this.applyFieldMappings(contact, mappings, 'vtrust_to_crm');

                // Check if contact exists
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
                    await client.put(`/Contacts/${contactId}`, {
                        data: [zohoData]
                    });
                } else {
                    // Create new contact
                    const response = await client.post('/Contacts', {
                        data: [zohoData]
                    });

                    if (response.data.data && response.data.data[0].status === 'success') {
                        const newContactId = response.data.data[0].details.id;

                        // Store mapping
                        await this.getOrCreateObjectMapping(
                            'contact',
                            contact.id,
                            'Contacts',
                            newContactId
                        );
                    }
                }

                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
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
     * Sync contacts from Zoho to VTrustX
     */
    async syncContactsFromCRM(filters = {}) {
        try {
            const client = this.getClient();

            const params = {
                per_page: filters.limit || 200,
                fields: 'First_Name,Last_Name,Email,Phone,Title,Account_Name'
            };

            if (filters.page) {
                params.page = filters.page;
            }

            const response = await client.get('/Contacts', { params });

            return {
                contacts: response.data.data || [],
                hasMore: response.data.info?.more_records || false,
                nextPage: (filters.page || 1) + 1
            };
        } catch (error) {
            logger.error('[ZohoConnector] Failed to sync from CRM', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create or update a contact in Zoho
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

            const zohoData = this.applyFieldMappings(contactData, mappingsResult.rows, 'vtrust_to_crm');

            // Zoho upsert API
            const response = await client.post('/Contacts/upsert', {
                data: [zohoData],
                duplicate_check_fields: ['Email']
            });

            if (response.data.data && response.data.data[0].status === 'success') {
                return {
                    crmId: response.data.data[0].details.id,
                    success: true
                };
            }

            return { success: false, error: 'Upsert failed' };
        } catch (error) {
            logger.error('[ZohoConnector] Failed to upsert contact', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Push survey response to Zoho
     */
    async pushResponse(submission, mappings) {
        try {
            const client = this.getClient();

            const responseText = `Survey Response: ${submission.form_title}\n\n` +
                Object.entries(submission.responses || {})
                    .map(([q, a]) => `${q}: ${a}`)
                    .join('\n');

            // Find linked contact
            const { query } = require('../../infrastructure/database/db');
            const mappingResult = await query(
                `SELECT crm_object_id FROM crm_object_mappings
                WHERE connection_id = $1
                AND vtrust_object_type = 'contact'
                AND vtrust_object_id = (
                    SELECT contact_id FROM submissions WHERE id = $2
                )`,
                [this.connection.id, submission.id]
            );

            if (mappingResult.rows.length > 0) {
                const contactId = mappingResult.rows[0].crm_object_id;

                // Create a note
                await client.post('/Notes', {
                    data: [{
                        Note_Title: `Survey Response: ${submission.form_title}`,
                        Note_Content: responseText,
                        Parent_Id: contactId,
                        se_module: 'Contacts'
                    }]
                });

                // Create task
                await this.createTask({
                    ContactId: contactId,
                    Subject: `Review Survey Response: ${submission.form_title}`,
                    Description: responseText
                });

                return { success: true, crmId: contactId };
            }

            return { success: false, error: 'No linked CRM record found' };
        } catch (error) {
            logger.error('[ZohoConnector] Failed to push response', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create a task in Zoho
     */
    async createTask(taskData) {
        try {
            const client = this.getClient();

            const response = await client.post('/Tasks', {
                data: [{
                    Subject: taskData.Subject || 'Follow-up Required',
                    Description: taskData.Description || '',
                    Status: taskData.Status || 'Not Started',
                    Priority: taskData.Priority || 'Normal',
                    Who_Id: taskData.ContactId,
                    What_Id: taskData.AccountId,
                    Due_Date: taskData.DueDate || new Date().toISOString().split('T')[0]
                }]
            });

            if (response.data.data && response.data.data[0].status === 'success') {
                return {
                    success: true,
                    taskId: response.data.data[0].details.id
                };
            }

            return { success: false };
        } catch (error) {
            logger.error('[ZohoConnector] Failed to create task', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update a record in Zoho
     */
    async updateRecord(module, recordId, fieldUpdates) {
        try {
            const client = this.getClient();

            await client.put(`/${module}/${recordId}`, {
                data: [fieldUpdates]
            });

            return { success: true };
        } catch (error) {
            logger.error('[ZohoConnector] Failed to update record', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Search for records in Zoho
     */
    async searchRecords(module, query) {
        try {
            const client = this.getClient();

            // Use COQL (CRM Object Query Language)
            const coql = `SELECT id, First_Name, Last_Name, Email, Phone FROM ${module} WHERE Email LIKE '%${query.searchTerm}%' LIMIT 10`;

            const response = await client.post('/coql', {
                select_query: coql
            });

            return response.data.data || [];
        } catch (error) {
            logger.error('[ZohoConnector] Failed to search records', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Zoho rate limiting (100 API calls/minute)
     */
    async rateLimit() {
        return new Promise(resolve => setTimeout(resolve, 600));
    }
}

module.exports = ZohoConnector;
