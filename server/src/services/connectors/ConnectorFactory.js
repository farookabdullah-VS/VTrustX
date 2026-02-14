/**
 * Connector Factory
 *
 * Creates and returns the appropriate platform connector instance
 */

const TwitterConnector = require('./TwitterConnector');
const FacebookConnector = require('./FacebookConnector');
const InstagramConnector = require('./InstagramConnector');
const RedditConnector = require('./RedditConnector');
const LinkedInConnector = require('./LinkedInConnector');
const YouTubeConnector = require('./YouTubeConnector');
const TikTokConnector = require('./TikTokConnector');
const logger = require('../../infrastructure/logger');

class ConnectorFactory {
  /**
   * Create a connector instance for a platform
   * @param {string} platform - Platform name
   * @param {Object} config - Connector configuration
   * @returns {BasePlatformConnector} Connector instance
   */
  static create(platform, config) {
    logger.debug('[ConnectorFactory] Creating connector', { platform });

    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return new TwitterConnector(config);

      case 'facebook':
        return new FacebookConnector(config);

      case 'instagram':
        return new InstagramConnector(config);

      case 'linkedin':
        return new LinkedInConnector(config);

      case 'youtube':
        return new YouTubeConnector(config);

      case 'tiktok':
        return new TikTokConnector(config);

      case 'reddit':
        return new RedditConnector(config);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get list of supported platforms
   * @returns {Array<Object>} Array of platform info
   */
  static getSupportedPlatforms() {
    return [
      {
        id: 'twitter',
        name: 'Twitter / X',
        implemented: true,
        requiresOAuth: true,
        features: ['mentions', 'hashtags', 'realtime']
      },
      {
        id: 'facebook',
        name: 'Facebook',
        implemented: true,
        requiresOAuth: true,
        features: ['mentions', 'pages', 'groups']
      },
      {
        id: 'instagram',
        name: 'Instagram',
        implemented: true,
        requiresOAuth: true,
        features: ['mentions', 'hashtags', 'stories']
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        implemented: true,
        requiresOAuth: true,
        features: ['mentions', 'company_pages']
      },
      {
        id: 'youtube',
        name: 'YouTube',
        implemented: true,
        requiresOAuth: true,
        features: ['comments', 'mentions', 'video_search']
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        implemented: true,
        requiresOAuth: true,
        features: ['mentions', 'hashtags', 'videos', 'comments']
      },
      {
        id: 'reddit',
        name: 'Reddit',
        implemented: true,
        requiresOAuth: true,
        features: ['mentions', 'subreddits', 'comments']
      }
    ];
  }

  /**
   * Check if a platform is supported
   * @param {string} platform - Platform name
   * @returns {boolean} True if supported
   */
  static isSupported(platform) {
    const supported = ['twitter', 'x', 'facebook', 'instagram', 'reddit', 'linkedin', 'youtube', 'tiktok'];
    return supported.includes(platform.toLowerCase());
  }
}

module.exports = ConnectorFactory;
