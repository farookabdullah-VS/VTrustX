/**
 * CRM Connector Factory
 *
 * Factory for creating CRM connector instances based on platform
 * Supported platforms:
 * - Salesforce
 * - HubSpot
 * - Zoho CRM
 * - Pipedrive (future)
 * - Microsoft Dynamics 365 (future)
 */

const SalesforceConnector = require('./SalesforceConnector');
const HubSpotConnector = require('./HubSpotConnector');
const ZohoConnector = require('./ZohoConnector');
const logger = require('../../infrastructure/logger');

class CRMConnectorFactory {
    /**
     * Create a CRM connector instance
     * @param {Object} connection - CRM connection record from database
     * @returns {BaseCRMConnector} - CRM connector instance
     */
    static createConnector(connection) {
        if (!connection) {
            throw new Error('Connection object is required');
        }

        const platform = connection.platform.toLowerCase();

        switch (platform) {
            case 'salesforce':
                logger.debug('[CRMConnectorFactory] Creating Salesforce connector', {
                    connectionId: connection.id
                });
                return new SalesforceConnector(connection);

            case 'hubspot':
                logger.debug('[CRMConnectorFactory] Creating HubSpot connector', {
                    connectionId: connection.id
                });
                return new HubSpotConnector(connection);

            case 'zoho':
            case 'zohocrm':
                logger.debug('[CRMConnectorFactory] Creating Zoho connector', {
                    connectionId: connection.id
                });
                return new ZohoConnector(connection);

            case 'pipedrive':
                throw new Error('Pipedrive connector not yet implemented');

            case 'dynamics365':
            case 'dynamics':
                throw new Error('Microsoft Dynamics 365 connector not yet implemented');

            default:
                throw new Error(`Unsupported CRM platform: ${platform}`);
        }
    }

    /**
     * Get list of supported platforms
     * @returns {Array} - Array of supported platform names
     */
    static getSupportedPlatforms() {
        return [
            {
                id: 'salesforce',
                name: 'Salesforce',
                description: 'World\'s #1 CRM platform',
                authType: 'oauth2',
                features: ['contacts', 'leads', 'accounts', 'opportunities', 'tasks', 'custom_objects']
            },
            {
                id: 'hubspot',
                name: 'HubSpot',
                description: 'All-in-one marketing, sales, and service platform',
                authType: 'oauth2',
                features: ['contacts', 'companies', 'deals', 'tasks', 'notes', 'timeline']
            },
            {
                id: 'zoho',
                name: 'Zoho CRM',
                description: 'Complete CRM solution for businesses',
                authType: 'oauth2',
                features: ['contacts', 'accounts', 'deals', 'tasks', 'notes', 'custom_modules']
            }
        ];
    }

    /**
     * Validate connection credentials
     * @param {string} platform - CRM platform name
     * @param {Object} credentials - Credentials object
     * @returns {Object} - Validation result
     */
    static validateCredentials(platform, credentials) {
        const errors = [];

        switch (platform.toLowerCase()) {
            case 'salesforce':
                if (!credentials.accessToken) errors.push('Access token is required');
                if (!credentials.refreshToken) errors.push('Refresh token is required');
                if (!credentials.instanceUrl) errors.push('Instance URL is required');
                if (!credentials.clientId) errors.push('Client ID is required');
                if (!credentials.clientSecret) errors.push('Client secret is required');
                break;

            case 'hubspot':
                if (!credentials.apiKey && !credentials.accessToken) {
                    errors.push('API key or access token is required');
                }
                if (credentials.accessToken) {
                    if (!credentials.refreshToken) errors.push('Refresh token is required for OAuth');
                    if (!credentials.clientId) errors.push('Client ID is required for OAuth');
                    if (!credentials.clientSecret) errors.push('Client secret is required for OAuth');
                }
                break;

            case 'zoho':
            case 'zohocrm':
                if (!credentials.accessToken) errors.push('Access token is required');
                if (!credentials.refreshToken) errors.push('Refresh token is required');
                if (!credentials.clientId) errors.push('Client ID is required');
                if (!credentials.clientSecret) errors.push('Client secret is required');
                if (!credentials.apiDomain) errors.push('API domain is required');
                break;

            default:
                errors.push(`Unsupported platform: ${platform}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get OAuth authorization URL
     * @param {string} platform - CRM platform name
     * @param {Object} config - OAuth configuration
     * @returns {string} - Authorization URL
     */
    static getOAuthURL(platform, config) {
        const { clientId, redirectUri, state } = config;

        switch (platform.toLowerCase()) {
            case 'salesforce':
                const sfScope = 'api refresh_token';
                return `https://login.salesforce.com/services/oauth2/authorize?` +
                    `response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
                    `scope=${encodeURIComponent(sfScope)}&state=${state}`;

            case 'hubspot':
                const hsScope = 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write';
                return `https://app.hubspot.com/oauth/authorize?` +
                    `client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
                    `scope=${encodeURIComponent(hsScope)}&state=${state}`;

            case 'zoho':
            case 'zohocrm':
                const zohoScope = 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL';
                const accountsServer = config.accountsServer || 'https://accounts.zoho.com';
                return `${accountsServer}/oauth/v2/auth?` +
                    `response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
                    `scope=${zohoScope}&access_type=offline&state=${state}`;

            default:
                throw new Error(`OAuth URL not available for platform: ${platform}`);
        }
    }
}

module.exports = CRMConnectorFactory;
