/**
 * Facebook/Meta Platform Connector
 *
 * Integrates with Facebook Graph API v18.0
 * Supports: Facebook Pages, Posts, Comments
 * Auth: OAuth 2.0 (User or Page Access Token)
 * Rate Limit: 200 calls per hour per user
 */

const BasePlatformConnector = require('./BasePlatformConnector');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../infrastructure/logger');

class FacebookConnector extends BasePlatformConnector {
  constructor(config) {
    super({ ...config, platform: 'facebook' });

    this.apiBaseUrl = 'https://graph.facebook.com/v18.0';
    this.oauth = {
      accessToken: config.credentials?.accessToken,
      pageId: config.credentials?.pageId,
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET
    };

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.oauth.accessToken}`
      },
      timeout: 30000
    });

    // Add response interceptor for rate limit tracking
    this.client.interceptors.response.use(
      response => {
        this.handleRateLimit(response.headers);
        return response;
      },
      error => {
        if (error.response) {
          this.handleRateLimit(error.response.headers);

          // Handle Facebook-specific errors
          if (error.response.data?.error) {
            const fbError = error.response.data.error;
            logger.error('[FacebookConnector] API Error', {
              type: fbError.type,
              code: fbError.code,
              message: fbError.message
            });
          }
        }
        throw error;
      }
    );
  }

  /**
   * Test connection to Facebook API
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      // Test by fetching page info
      const response = await this.client.get(`/${this.oauth.pageId}`, {
        params: {
          fields: 'id,name,followers_count,verification_status'
        }
      });

      logger.info('[FacebookConnector] Connection test successful', {
        pageId: response.data.id,
        pageName: response.data.name,
        followers: response.data.followers_count
      });

      return {
        success: true,
        message: 'Connected successfully',
        pageInfo: {
          id: response.data.id,
          name: response.data.name,
          followers: response.data.followers_count,
          verified: response.data.verification_status === 'blue_verified'
        }
      };

    } catch (error) {
      logger.error('[FacebookConnector] Connection test failed', {
        error: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        message: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Fetch mentions from Facebook
   * @param {Object} options - Fetch options { since, until, limit }
   * @returns {Promise<Array>} Normalized mentions
   */
  async fetchMentions(options = {}) {
    try {
      const { since, until, limit = 100 } = options;

      logger.info('[FacebookConnector] Fetching mentions', {
        pageId: this.oauth.pageId,
        since: since?.toISOString(),
        until: until?.toISOString(),
        limit
      });

      const mentions = [];

      // 1. Fetch page posts
      const posts = await this.fetchPagePosts({ since, until, limit: Math.floor(limit / 2) });
      mentions.push(...posts);

      // 2. Fetch mentions/tags of page
      const tags = await this.fetchPageMentions({ since, until, limit: Math.floor(limit / 2) });
      mentions.push(...tags);

      logger.info('[FacebookConnector] Mentions fetched', {
        total: mentions.length,
        posts: posts.length,
        tags: tags.length
      });

      // Normalize all mentions
      return mentions.map(m => this.normalizeMention(m));

    } catch (error) {
      logger.error('[FacebookConnector] Failed to fetch mentions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch posts from page
   */
  async fetchPagePosts(options = {}) {
    try {
      const { since, until, limit = 50 } = options;

      const params = {
        fields: 'id,message,created_time,from,reactions.summary(true),comments.summary(true),shares,permalink_url,attachments,status_type',
        limit
      };

      if (since) params.since = Math.floor(since.getTime() / 1000);
      if (until) params.until = Math.floor(until.getTime() / 1000);

      const response = await this.client.get(`/${this.oauth.pageId}/posts`, { params });

      return response.data.data || [];

    } catch (error) {
      logger.error('[FacebookConnector] Failed to fetch page posts', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch mentions/tags of page
   */
  async fetchPageMentions(options = {}) {
    try {
      const { since, until, limit = 50 } = options;

      const params = {
        fields: 'id,message,created_time,from,reactions.summary(true),comments.summary(true),permalink_url,attachments',
        limit
      };

      if (since) params.since = Math.floor(since.getTime() / 1000);
      if (until) params.until = Math.floor(until.getTime() / 1000);

      const response = await this.client.get(`/${this.oauth.pageId}/tagged`, { params });

      return response.data.data || [];

    } catch (error) {
      logger.error('[FacebookConnector] Failed to fetch page mentions', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Normalize Facebook post to standard mention format
   */
  normalizeMention(rawMention) {
    const normalized = {
      tenant_id: this.tenantId,
      source_id: this.sourceId,
      platform: 'facebook',
      external_id: rawMention.id,
      url: rawMention.permalink_url || `https://facebook.com/${rawMention.id}`,
      content: rawMention.message || '',

      // Author info
      author_name: rawMention.from?.name || 'Unknown',
      author_handle: rawMention.from?.id || '',
      author_followers: 0, // Facebook doesn't provide follower count in posts API
      author_verified: false,

      // Engagement metrics
      likes_count: rawMention.reactions?.summary?.total_count || 0,
      comments_count: rawMention.comments?.summary?.total_count || 0,
      shares_count: rawMention.shares?.count || 0,

      // Media
      media_type: this.determineMediaType(rawMention),
      media_urls: this.extractMediaUrls(rawMention),

      // Timestamps
      published_at: new Date(rawMention.created_time),

      // Status
      status: 'new'
    };

    return normalized;
  }

  /**
   * Determine media type from post
   */
  determineMediaType(post) {
    if (!post.attachments?.data?.[0]) return 'text';

    const attachment = post.attachments.data[0];
    const type = attachment.type;

    switch (type) {
      case 'photo':
      case 'album':
        return 'image';
      case 'video':
      case 'video_inline':
        return 'video';
      case 'share':
      case 'link':
        return 'link';
      default:
        return 'text';
    }
  }

  /**
   * Extract media URLs from post
   */
  extractMediaUrls(post) {
    const urls = [];

    if (post.attachments?.data) {
      for (const attachment of post.attachments.data) {
        if (attachment.media?.image?.src) {
          urls.push(attachment.media.image.src);
        } else if (attachment.media?.source) {
          urls.push(attachment.media.source);
        }
      }
    }

    return urls;
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(callbackUrl, state) {
    const params = new URLSearchParams({
      client_id: this.oauth.appId,
      redirect_uri: callbackUrl,
      state: state || crypto.randomBytes(16).toString('hex'),
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content',
      response_type: 'code'
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code, state) {
    try {
      // Exchange code for access token
      const response = await axios.get(`${this.apiBaseUrl}/oauth/access_token`, {
        params: {
          client_id: this.oauth.appId,
          client_secret: this.oauth.appSecret,
          redirect_uri: process.env.FACEBOOK_OAUTH_CALLBACK,
          code
        }
      });

      const { access_token } = response.data;

      // Get user's pages
      const pagesResponse = await axios.get(`${this.apiBaseUrl}/me/accounts`, {
        params: {
          access_token
        }
      });

      const pages = pagesResponse.data.data || [];

      logger.info('[FacebookConnector] OAuth successful', {
        pageCount: pages.length
      });

      return {
        accessToken: access_token,
        pages: pages.map(p => ({
          id: p.id,
          name: p.name,
          accessToken: p.access_token, // Page-specific token
          category: p.category
        }))
      };

    } catch (error) {
      logger.error('[FacebookConnector] OAuth callback failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refresh access token (Facebook tokens are long-lived)
   */
  async refreshAccessToken() {
    try {
      // Exchange short-lived token for long-lived token
      const response = await axios.get(`${this.apiBaseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.oauth.appId,
          client_secret: this.oauth.appSecret,
          fb_exchange_token: this.oauth.accessToken
        }
      });

      const { access_token, expires_in } = response.data;

      logger.info('[FacebookConnector] Token refreshed', {
        expiresIn: expires_in
      });

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };

    } catch (error) {
      logger.error('[FacebookConnector] Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Post reply to Facebook post/comment
   */
  async postReply(postId, replyText) {
    try {
      const response = await this.client.post(`/${postId}/comments`, {
        message: replyText
      });

      logger.info('[FacebookConnector] Reply posted', {
        postId,
        commentId: response.data.id
      });

      return response.data.id;

    } catch (error) {
      logger.error('[FacebookConnector] Failed to post reply', {
        postId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle rate limit from response headers
   */
  handleRateLimit(headers) {
    // Facebook uses X-Business-Use-Case-Usage header
    const usageHeader = headers['x-business-use-case-usage'];

    if (usageHeader) {
      try {
        const usage = JSON.parse(usageHeader);
        const callUsage = usage[this.oauth.appId]?.[0] || {};

        this.rateLimit = {
          limit: 200, // 200 calls per hour
          remaining: Math.max(0, 200 - (callUsage.call_count || 0)),
          resetAt: new Date(Date.now() + 3600000) // Reset in 1 hour
        };

        if (this.rateLimit.remaining < 20) {
          logger.warn('[FacebookConnector] Rate limit approaching', {
            remaining: this.rateLimit.remaining,
            resetAt: this.rateLimit.resetAt
          });
        }

      } catch (error) {
        logger.error('[FacebookConnector] Failed to parse rate limit header', {
          error: error.message
        });
      }
    }
  }
}

module.exports = FacebookConnector;
