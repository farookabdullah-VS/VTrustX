'use strict';

const FacebookConnector  = require('./FacebookConnector');
const InstagramConnector = require('./InstagramConnector');
const LinkedInConnector  = require('./LinkedInConnector');
const YouTubeConnector   = require('./YouTubeConnector');

const CONNECTORS = {
    facebook:  FacebookConnector,
    instagram: InstagramConnector,
    linkedin:  LinkedInConnector,
    youtube:   YouTubeConnector
};

class ConnectorFactory {
    /**
     * Create a connector instance for the given platform.
     *
     * @param {string} platform    – e.g. 'facebook', 'instagram', 'linkedin', 'youtube'
     * @param {object} credentials – Decrypted credentials stored in sl_sources.credentials
     * @param {object} config      – Additional config from sl_sources.config
     * @returns {object} Connector instance with testConnection() and fetchMentions()
     */
    static create(platform, credentials = {}, config = {}) {
        const ConnectorClass = CONNECTORS[platform.toLowerCase()];
        if (!ConnectorClass) {
            throw new Error(
                `ConnectorFactory: no connector registered for platform "${platform}". ` +
                `Supported: ${Object.keys(CONNECTORS).join(', ')}`
            );
        }
        return new ConnectorClass(credentials, config);
    }

    /**
     * Check whether a connector exists for the given platform.
     * @param {string} platform
     * @returns {boolean}
     */
    static supports(platform) {
        return Boolean(platform && CONNECTORS[platform.toLowerCase()]);
    }

    /**
     * Return all supported platform identifiers.
     * Called as ConnectorFactory.getSupportedPlatforms() by sync.js routes.
     * @returns {string[]}
     */
    static getSupportedPlatforms() {
        return Object.keys(CONNECTORS);
    }
}

module.exports = ConnectorFactory;
