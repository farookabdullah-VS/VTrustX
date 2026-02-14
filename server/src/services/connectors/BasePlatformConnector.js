/**
 * Base Platform Connector
 *
 * Abstract base class for all social media platform connectors
 * Defines the interface that all connectors must implement
 */

const logger = require('../../infrastructure/logger');
const { query } = require('../../infrastructure/database/db');

class BasePlatformConnector {
  /**
   * @param {Object} config - Connector configuration
   * @param {string} config.platform - Platform name (twitter, facebook, etc.)
   * @param {string} config.sourceId - Source UUID from sl_sources table
   * @param {number} config.tenantId - Tenant ID
   * @param {Object} config.credentials - API credentials (tokens, keys, secrets)
   * @param {Object} config.searchParams - Search parameters (keywords, hashtags, etc.)
   */
  constructor(config) {
    if (this.constructor === BasePlatformConnector) {
      throw new Error('BasePlatformConnector is abstract and cannot be instantiated directly');
    }

    this.platform = config.platform;
    this.sourceId = config.sourceId;
    this.tenantId = config.tenantId;
    this.credentials = config.credentials || {};
    this.searchParams = config.searchParams || {};
    this.rateLimits = {
      remaining: null,
      resetAt: null,
      limit: null
    };
  }

  // ============================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ============================================================================

  /**
   * Test the connection to the platform
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Fetch mentions from the platform
   * @param {Object} options - Fetch options
   * @param {string} options.sinceId - Fetch mentions after this ID
   * @param {string} options.maxId - Fetch mentions before this ID
   * @param {number} options.limit - Max number of mentions to fetch
   * @param {Date} options.since - Fetch mentions after this date
   * @param {Date} options.until - Fetch mentions before this date
   * @returns {Promise<Array>} Array of normalized mention objects
   */
  async fetchMentions(options = {}) {
    throw new Error('fetchMentions() must be implemented by subclass');
  }

  /**
   * Get platform-specific OAuth URL for authentication
   * @param {string} callbackUrl - Callback URL after OAuth
   * @param {string} state - State parameter for CSRF protection
   * @returns {Promise<Object>} { authUrl: string, state: string }
   */
  async getAuthUrl(callbackUrl, state) {
    throw new Error('getAuthUrl() must be implemented by subclass');
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @returns {Promise<Object>} { accessToken: string, refreshToken: string, expiresAt: Date }
   */
  async handleOAuthCallback(code, state) {
    throw new Error('handleOAuthCallback() must be implemented by subclass');
  }

  /**
   * Refresh access token
   * @returns {Promise<Object>} { accessToken: string, expiresAt: Date }
   */
  async refreshAccessToken() {
    throw new Error('refreshAccessToken() must be implemented by subclass');
  }

  // ============================================================================
  // COMMON METHODS (implemented in base class)
  // ============================================================================

  /**
   * Normalize a platform-specific mention to common format
   * @param {Object} rawMention - Platform-specific mention object
   * @returns {Object} Normalized mention object
   */
  normalizeMention(rawMention) {
    // Default implementation - subclasses should override if needed
    return {
      tenant_id: this.tenantId,
      source_id: this.sourceId,
      platform: this.platform,
      external_id: rawMention.id || rawMention.external_id,
      url: rawMention.url,
      content: rawMention.text || rawMention.content || rawMention.message,
      author_name: rawMention.author?.name || rawMention.author_name,
      author_handle: rawMention.author?.username || rawMention.author_handle,
      author_url: rawMention.author?.url || rawMention.author_url,
      author_followers: rawMention.author?.followers_count || 0,
      published_at: rawMention.created_at || rawMention.published_at || new Date(),
      likes_count: rawMention.likes_count || rawMention.favorite_count || 0,
      comments_count: rawMention.comments_count || rawMention.reply_count || 0,
      shares_count: rawMention.shares_count || rawMention.retweet_count || 0,
      reach: rawMention.reach || rawMention.impressions_count,
      media_urls: rawMention.media_urls || [],
      location: rawMention.location || rawMention.geo?.place,
      status: 'new',
      raw_data: rawMention
    };
  }

  /**
   * Save mentions to database
   * @param {Array} mentions - Array of normalized mention objects
   * @returns {Promise<Object>} { saved: number, duplicates: number, errors: number }
   */
  async saveMentions(mentions) {
    const results = {
      saved: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: []
    };

    for (const mention of mentions) {
      try {
        // Check for duplicate
        const existing = await query(
          'SELECT id FROM sl_mentions WHERE tenant_id = $1 AND platform = $2 AND external_id = $3',
          [this.tenantId, this.platform, mention.external_id]
        );

        if (existing.rows.length > 0) {
          results.duplicates++;
          continue;
        }

        // Insert mention
        await query(
          `INSERT INTO sl_mentions (
            tenant_id, source_id, platform, external_id, url, content,
            author_name, author_handle, author_url, author_followers,
            published_at, likes_count, comments_count, shares_count,
            reach, media_urls, location, status, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            mention.tenant_id, mention.source_id, mention.platform, mention.external_id,
            mention.url, mention.content, mention.author_name, mention.author_handle,
            mention.author_url, mention.author_followers, mention.published_at,
            mention.likes_count, mention.comments_count, mention.shares_count,
            mention.reach, JSON.stringify(mention.media_urls), mention.location,
            mention.status, JSON.stringify(mention.raw_data)
          ]
        );

        results.saved++;

      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          externalId: mention.external_id,
          error: error.message
        });
        logger.error('[BasePlatformConnector] Failed to save mention', {
          platform: this.platform,
          externalId: mention.external_id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Update source status and last sync time
   * @param {string} status - 'connected', 'error', 'pending'
   * @param {string} errorMessage - Error message if status is 'error'
   * @returns {Promise<void>}
   */
  async updateSourceStatus(status, errorMessage = null) {
    try {
      await query(
        `UPDATE sl_sources
         SET status = $1,
             error_message = $2,
             last_sync_at = NOW(),
             rate_limit_remaining = $3,
             rate_limit_reset_at = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          status,
          errorMessage,
          this.rateLimits.remaining,
          this.rateLimits.resetAt,
          this.sourceId
        ]
      );
    } catch (error) {
      logger.error('[BasePlatformConnector] Failed to update source status', {
        sourceId: this.sourceId,
        error: error.message
      });
    }
  }

  /**
   * Handle rate limit response from API
   * @param {Object} headers - Response headers
   */
  handleRateLimit(headers) {
    // Parse rate limit headers (varies by platform)
    this.rateLimits.remaining = parseInt(headers['x-rate-limit-remaining'] || headers['x-ratelimit-remaining']) || null;
    this.rateLimits.limit = parseInt(headers['x-rate-limit-limit'] || headers['x-ratelimit-limit']) || null;

    const resetTime = headers['x-rate-limit-reset'] || headers['x-ratelimit-reset'];
    if (resetTime) {
      this.rateLimits.resetAt = new Date(parseInt(resetTime) * 1000);
    }

    logger.debug('[BasePlatformConnector] Rate limit updated', {
      platform: this.platform,
      remaining: this.rateLimits.remaining,
      limit: this.rateLimits.limit,
      resetAt: this.rateLimits.resetAt
    });
  }

  /**
   * Check if we're rate limited
   * @returns {boolean} True if rate limited
   */
  isRateLimited() {
    if (this.rateLimits.remaining === null) return false;
    if (this.rateLimits.remaining > 0) return false;
    if (!this.rateLimits.resetAt) return true;

    // Check if reset time has passed
    return new Date() < this.rateLimits.resetAt;
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   * @returns {number} Milliseconds until reset
   */
  getTimeUntilReset() {
    if (!this.rateLimits.resetAt) return 0;
    return Math.max(0, this.rateLimits.resetAt - new Date());
  }

  /**
   * Log connector activity
   * @param {string} action - Action name
   * @param {Object} details - Additional details
   */
  log(action, details = {}) {
    logger.info(`[${this.platform}Connector] ${action}`, {
      platform: this.platform,
      sourceId: this.sourceId,
      tenantId: this.tenantId,
      ...details
    });
  }

  /**
   * Log connector error
   * @param {string} action - Action name
   * @param {Error} error - Error object
   */
  logError(action, error) {
    logger.error(`[${this.platform}Connector] ${action} failed`, {
      platform: this.platform,
      sourceId: this.sourceId,
      tenantId: this.tenantId,
      error: error.message,
      stack: error.stack
    });
  }
}

module.exports = BasePlatformConnector;
