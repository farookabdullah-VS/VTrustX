/**
 * Instagram Business Platform Connector
 *
 * Integrates with Instagram Graph API
 * Supports: Instagram Business/Creator accounts only
 * Auth: OAuth 2.0 via Facebook (requires Facebook Page connection)
 * Rate Limit: 200 calls per hour per user
 */

const BasePlatformConnector = require('./BasePlatformConnector');
const axios = require('axios');
const logger = require('../../infrastructure/logger');

class InstagramConnector extends BasePlatformConnector {
  constructor(config) {
    super({ ...config, platform: 'instagram' });

    this.apiBaseUrl = 'https://graph.facebook.com/v18.0';
    this.oauth = {
      accessToken: config.credentials?.accessToken,
      instagramAccountId: config.credentials?.instagramAccountId,
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
        }
        throw error;
      }
    );
  }

  /**
   * Test connection to Instagram API
   */
  async testConnection() {
    try {
      // Test by fetching account info
      const response = await this.client.get(`/${this.oauth.instagramAccountId}`, {
        params: {
          fields: 'id,username,name,followers_count,media_count,profile_picture_url'
        }
      });

      logger.info('[InstagramConnector] Connection test successful', {
        accountId: response.data.id,
        username: response.data.username,
        followers: response.data.followers_count
      });

      return {
        success: true,
        message: 'Connected successfully',
        accountInfo: {
          id: response.data.id,
          username: response.data.username,
          name: response.data.name,
          followers: response.data.followers_count,
          mediaCount: response.data.media_count
        }
      };

    } catch (error) {
      logger.error('[InstagramConnector] Connection test failed', {
        error: error.message
      });

      return {
        success: false,
        message: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Fetch mentions from Instagram
   */
  async fetchMentions(options = {}) {
    try {
      const { since, until, limit = 100 } = options;

      logger.info('[InstagramConnector] Fetching mentions', {
        accountId: this.oauth.instagramAccountId,
        since: since?.toISOString(),
        limit
      });

      const mentions = [];

      // 1. Fetch own media posts
      const media = await this.fetchAccountMedia({ since, until, limit: Math.floor(limit / 3) });
      mentions.push(...media);

      // 2. Fetch mentions in comments
      const commentMentions = await this.fetchCommentMentions({ since, until, limit: Math.floor(limit / 3) });
      mentions.push(...commentMentions);

      // 3. Fetch tagged media
      const tagged = await this.fetchTaggedMedia({ since, until, limit: Math.floor(limit / 3) });
      mentions.push(...tagged);

      logger.info('[InstagramConnector] Mentions fetched', {
        total: mentions.length,
        media: media.length,
        comments: commentMentions.length,
        tagged: tagged.length
      });

      // Normalize all mentions
      return mentions.map(m => this.normalizeMention(m));

    } catch (error) {
      logger.error('[InstagramConnector] Failed to fetch mentions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch account's media posts
   */
  async fetchAccountMedia(options = {}) {
    try {
      const { since, until, limit = 30 } = options;

      const params = {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,username,like_count,comments_count,thumbnail_url',
        limit
      };

      if (since) params.since = Math.floor(since.getTime() / 1000);
      if (until) params.until = Math.floor(until.getTime() / 1000);

      const response = await this.client.get(`/${this.oauth.instagramAccountId}/media`, { params });

      return response.data.data || [];

    } catch (error) {
      logger.error('[InstagramConnector] Failed to fetch account media', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch mentions in comments
   */
  async fetchCommentMentions(options = {}) {
    try {
      const { since, limit = 30 } = options;

      // First get recent media
      const mediaResponse = await this.client.get(`/${this.oauth.instagramAccountId}/media`, {
        params: {
          fields: 'id',
          limit: 10
        }
      });

      const media = mediaResponse.data.data || [];
      const commentMentions = [];

      // For each media, fetch comments that mention us
      for (const mediaItem of media) {
        try {
          const commentsResponse = await this.client.get(`/${mediaItem.id}/comments`, {
            params: {
              fields: 'id,text,username,timestamp,from,like_count,replies'
            }
          });

          const comments = commentsResponse.data.data || [];

          // Filter comments that mention the account
          const mentions = comments.filter(comment =>
            comment.text && comment.text.includes(`@${this.oauth.instagramAccountId}`)
          );

          commentMentions.push(...mentions.map(c => ({ ...c, media_id: mediaItem.id })));

        } catch (err) {
          logger.error('[InstagramConnector] Failed to fetch comments for media', {
            mediaId: mediaItem.id,
            error: err.message
          });
        }
      }

      return commentMentions;

    } catch (error) {
      logger.error('[InstagramConnector] Failed to fetch comment mentions', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch media where account is tagged
   */
  async fetchTaggedMedia(options = {}) {
    try {
      const { limit = 30 } = options;

      const response = await this.client.get(`/${this.oauth.instagramAccountId}/tags`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,username,like_count,comments_count',
          limit
        }
      });

      return response.data.data || [];

    } catch (error) {
      logger.error('[InstagramConnector] Failed to fetch tagged media', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Normalize Instagram media/comment to standard mention format
   */
  normalizeMention(rawMention) {
    // Determine if this is a comment or media post
    const isComment = rawMention.text !== undefined;

    const normalized = {
      tenant_id: this.tenantId,
      source_id: this.sourceId,
      platform: 'instagram',
      external_id: rawMention.id,
      url: isComment ? `https://instagram.com/p/${rawMention.media_id}` : rawMention.permalink,
      content: isComment ? rawMention.text : (rawMention.caption || ''),

      // Author info
      author_name: rawMention.username || rawMention.from?.username || 'Unknown',
      author_handle: rawMention.username || rawMention.from?.username || '',
      author_followers: 0, // Instagram API doesn't provide follower count for non-account users
      author_verified: false,

      // Engagement metrics
      likes_count: rawMention.like_count || 0,
      comments_count: isComment ? 0 : (rawMention.comments_count || 0),
      shares_count: 0, // Instagram doesn't expose share count via API

      // Media
      media_type: isComment ? 'text' : this.determineMediaType(rawMention),
      media_urls: isComment ? [] : this.extractMediaUrls(rawMention),

      // Timestamps
      published_at: new Date(rawMention.timestamp),

      // Post type
      post_type: isComment ? 'comment' : 'post',

      // Status
      status: 'new'
    };

    return normalized;
  }

  /**
   * Determine media type from Instagram media
   */
  determineMediaType(media) {
    switch (media.media_type) {
      case 'IMAGE':
        return 'image';
      case 'VIDEO':
        return 'video';
      case 'CAROUSEL_ALBUM':
        return 'image'; // Treat carousel as image
      default:
        return 'text';
    }
  }

  /**
   * Extract media URLs
   */
  extractMediaUrls(media) {
    const urls = [];

    if (media.media_url) {
      urls.push(media.media_url);
    }

    if (media.thumbnail_url) {
      urls.push(media.thumbnail_url);
    }

    return urls;
  }

  /**
   * Get OAuth authorization URL (via Facebook)
   */
  async getAuthUrl(callbackUrl, state) {
    const params = new URLSearchParams({
      client_id: this.oauth.appId,
      redirect_uri: callbackUrl,
      state: state || crypto.randomBytes(16).toString('hex'),
      scope: 'instagram_basic,instagram_manage_comments,instagram_manage_insights,pages_show_list,pages_read_engagement',
      response_type: 'code'
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code, state) {
    try {
      // Exchange code for access token (via Facebook)
      const response = await axios.get(`${this.apiBaseUrl}/oauth/access_token`, {
        params: {
          client_id: this.oauth.appId,
          client_secret: this.oauth.appSecret,
          redirect_uri: process.env.INSTAGRAM_OAUTH_CALLBACK,
          code
        }
      });

      const { access_token } = response.data;

      // Get user's Facebook pages
      const pagesResponse = await axios.get(`${this.apiBaseUrl}/me/accounts`, {
        params: {
          access_token,
          fields: 'id,name,instagram_business_account'
        }
      });

      const pages = pagesResponse.data.data || [];

      // Extract Instagram accounts connected to Facebook pages
      const instagramAccounts = pages
        .filter(p => p.instagram_business_account)
        .map(p => ({
          facebookPageId: p.id,
          facebookPageName: p.name,
          instagramAccountId: p.instagram_business_account.id,
          accessToken: access_token
        }));

      logger.info('[InstagramConnector] OAuth successful', {
        accountCount: instagramAccounts.length
      });

      return {
        accessToken: access_token,
        instagramAccounts
      };

    } catch (error) {
      logger.error('[InstagramConnector] OAuth callback failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refresh access token (same as Facebook - long-lived tokens)
   */
  async refreshAccessToken() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.oauth.appId,
          client_secret: this.oauth.appSecret,
          fb_exchange_token: this.oauth.accessToken
        }
      });

      const { access_token, expires_in } = response.data;

      logger.info('[InstagramConnector] Token refreshed', {
        expiresIn: expires_in
      });

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };

    } catch (error) {
      logger.error('[InstagramConnector] Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Post reply to Instagram comment
   */
  async postReply(commentId, replyText) {
    try {
      const response = await this.client.post(`/${commentId}/replies`, {
        message: replyText
      });

      logger.info('[InstagramConnector] Reply posted', {
        commentId,
        replyId: response.data.id
      });

      return response.data.id;

    } catch (error) {
      logger.error('[InstagramConnector] Failed to post reply', {
        commentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle rate limit (same as Facebook)
   */
  handleRateLimit(headers) {
    const usageHeader = headers['x-business-use-case-usage'];

    if (usageHeader) {
      try {
        const usage = JSON.parse(usageHeader);
        const callUsage = usage[this.oauth.appId]?.[0] || {};

        this.rateLimit = {
          limit: 200,
          remaining: Math.max(0, 200 - (callUsage.call_count || 0)),
          resetAt: new Date(Date.now() + 3600000)
        };

        if (this.rateLimit.remaining < 20) {
          logger.warn('[InstagramConnector] Rate limit approaching', {
            remaining: this.rateLimit.remaining
          });
        }

      } catch (error) {
        logger.error('[InstagramConnector] Failed to parse rate limit header', {
          error: error.message
        });
      }
    }
  }
}

module.exports = InstagramConnector;
