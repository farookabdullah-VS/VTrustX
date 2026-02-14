/**
 * HubSpot CRM Connector
 *
 * Implements two-way sync with HubSpot CRM
 * Features:
 * - API key or OAuth 2.0 authentication
 * - Contact, Company, Deal sync
 * - Custom property mapping
 * - Task/Note creation
 * - Timeline events
 */

const BaseCRMConnector = require('./BaseCRMConnector');
const axios = require('axios');
const logger = require('../../infrastructure/logger');

class HubSpotConnector extends BaseCRMConnector {
    constructor(connection) {
        super(connection);
        this.baseURL = 'https://api.hubapi.com';
    }

    /**
     * Get API client with auth headers
     */
    getClient() {
        const headers = {};

        // Support both API key and OAuth
        if (this.credentials.apiKey) {
            headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
        } else if (this.credentials.accessToken) {
            headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
        }

        return axios.create({
            baseURL: this.baseURL,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Test connection to HubSpot
     */
    async testConnection() {
        try {
            const client = this.getClient();
            const response = await client.get('/crm/v3/objects/contacts', {
                params: { limit: 1 }
            });

            await this.updateConnectionStatus('active', null);

            return {
                success: true,
                message: 'Connected to HubSpot successfully',
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
            const response = await axios.post(
                'https://api.hubapi.com/oauth/v1/token',
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
            const newRefreshToken = response.data.refresh_token;
            const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

            // Update credentials
            this.credentials.accessToken = newAccessToken;
            this.credentials.refreshToken = newRefreshToken;

            // Update in database
            const { query } = require('../../infrastructure/database/db');
            await query(
                `UPDATE crm_connections
                SET credentials = $1, updated_at = NOW()
                WHERE id = $2`,
                [BaseCRMConnector.encryptCredentials(this.credentials), this.connection.id]
            );

            logger.info('[HubSpotConnector] Access token refreshed', {
                connectionId: this.connection.id
            });

            return { accessToken: newAccessToken, expiresAt };
        } catch (error) {
            logger.error('[HubSpotConnector] Failed to refresh token', {
                error: error.message,
                connectionId: this.connection.id
            });
            throw error;
        }
    }

    /**
     * Get available fields (properties) for an object type
     */
    async getAvailableFields(objectType = 'contacts') {
        try {
            const client = this.getClient();
            const response = await client.get(`/crm/v3/properties/${objectType}`);

            return response.data.results.map(prop => ({
                name: prop.name,
                label: prop.label,
                type: prop.type,
                required: prop.hidden === false,
                fieldType: prop.fieldType
            }));
        } catch (error) {
            logger.error('[HubSpotConnector] Failed to get properties', {
                error: error.message,
                objectType
            });
            throw error;
        }
    }

    /**
     * Sync contacts from VTrustX to HubSpot
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
                const hsData = this.applyFieldMappings(contact, mappings, 'vtrust_to_crm');

                // HubSpot requires properties wrapper
                const contactData = {
                    properties: hsData
                };

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
                    await client.patch(`/crm/v3/objects/contacts/${contactId}`, contactData);
                } else {
                    // Create new contact
                    const response = await client.post('/crm/v3/objects/contacts', contactData);
                    const newContactId = response.data.id;

                    // Store mapping
                    await this.getOrCreateObjectMapping(
                        'contact',
                        contact.id,
                        'contacts',
                        newContactId
                    );
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
     * Sync contacts from HubSpot to VTrustX
     */
    async syncContactsFromCRM(filters = {}) {
        try {
            const client = this.getClient();

            const params = {
                limit: filters.limit || 100,
                properties: 'firstname,lastname,email,phone,company'
            };

            if (filters.after) {
                params.after = filters.after;
            }

            const response = await client.get('/crm/v3/objects/contacts', { params });

            return {
                contacts: response.data.results,
                hasMore: !!response.data.paging?.next,
                nextPage: response.data.paging?.next?.after
            };
        } catch (error) {
            logger.error('[HubSpotConnector] Failed to sync from CRM', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create or update a contact in HubSpot
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

            const hsData = this.applyFieldMappings(contactData, mappingsResult.rows, 'vtrust_to_crm');

            // Create contact with properties
            const response = await client.post('/crm/v3/objects/contacts', {
                properties: hsData
            });

            return {
                crmId: response.data.id,
                success: true
            };
        } catch (error) {
            logger.error('[HubSpotConnector] Failed to upsert contact', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Push survey response to HubSpot
     */
    async pushResponse(submission, mappings) {
        try {
            const client = this.getClient();

            // Create engagement (note) for the contact
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

                // Create note engagement
                await client.post('/crm/v3/objects/notes', {
                    properties: {
                        hs_note_body: responseText,
                        hs_timestamp: new Date().getTime()
                    },
                    associations: [
                        {
                            to: { id: contactId },
                            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }]
                        }
                    ]
                });

                return { success: true, crmId: contactId };
            }

            return { success: false, error: 'No linked CRM record found' };
        } catch (error) {
            logger.error('[HubSpotConnector] Failed to push response', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create a task in HubSpot
     */
    async createTask(taskData) {
        try {
            const client = this.getClient();

            const response = await client.post('/crm/v3/objects/tasks', {
                properties: {
                    hs_task_subject: taskData.Subject || 'Follow-up Required',
                    hs_task_body: taskData.Description || '',
                    hs_task_status: taskData.Status || 'NOT_STARTED',
                    hs_task_priority: taskData.Priority || 'NONE',
                    hs_timestamp: new Date(taskData.DueDate || Date.now()).getTime()
                },
                associations: taskData.ContactId ? [
                    {
                        to: { id: taskData.ContactId },
                        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }]
                    }
                ] : []
            });

            return {
                success: true,
                taskId: response.data.id
            };
        } catch (error) {
            logger.error('[HubSpotConnector] Failed to create task', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update a record in HubSpot
     */
    async updateRecord(objectType, recordId, fieldUpdates) {
        try {
            const client = this.getClient();

            await client.patch(`/crm/v3/objects/${objectType}/${recordId}`, {
                properties: fieldUpdates
            });

            return { success: true };
        } catch (error) {
            logger.error('[HubSpotConnector] Failed to update record', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Search for records in HubSpot
     */
    async searchRecords(objectType, query) {
        try {
            const client = this.getClient();

            const response = await client.post(`/crm/v3/objects/${objectType}/search`, {
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'email',
                                operator: 'CONTAINS_TOKEN',
                                value: query.searchTerm
                            }
                        ]
                    }
                ],
                properties: ['firstname', 'lastname', 'email', 'phone'],
                limit: 10
            });

            return response.data.results || [];
        } catch (error) {
            logger.error('[HubSpotConnector] Failed to search records', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * HubSpot rate limiting (10 requests/second)
     */
    async rateLimit() {
        return new Promise(resolve => setTimeout(resolve, 100));
    }
}

module.exports = HubSpotConnector;
