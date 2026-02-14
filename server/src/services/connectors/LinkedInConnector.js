/**
 * LinkedIn Platform Connector
 *
 * Integrates with LinkedIn API v2
 * Supports: Company page posts, mentions, shares
 * Auth: OAuth 2.0
 * Rate Limit: Varies by tier (typically 100 requests per user per day for free tier)
 */

const BasePlatformConnector = require('./BasePlatformConnector');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../infrastructure/logger');

class LinkedInConnector extends BasePlatformConnector {
  constructor(config) {
    super({ ...config, platform: 'linkedin' });

    this.apiBaseUrl = 'https://api.linkedin.com/v2';
    this.oauth = {
      accessToken: config.credentials?.accessToken,
      organizationId: config.credentials?.organizationId, // LinkedIn organization/company ID
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET
    };

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.oauth.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      },
      timeout: 30000
    });

    // Add response interceptor
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
   * Test connection to LinkedIn API
   */
  async testConnection() {
    try {
      // Test by fetching organization info
      const response = await this.client.get(`/organizations/${this.oauth.organizationId}`, {
        params: {
          projection: '(id,localizedName,vanityName,followerCount)'
        }
      });

      logger.info('[LinkedInConnector] Connection test successful', {
        orgId: response.data.id,
        name: response.data.localizedName,
        followers: response.data.followerCount
      });

      return {
        success: true,
        message: 'Connected successfully',
        organizationInfo: {
          id: response.data.id,
          name: response.data.localizedName,
          vanityName: response.data.vanityName,
          followers: response.data.followerCount
        }
      };

    } catch (error) {
      logger.error('[LinkedInConnector] Connection test failed', {
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Fetch mentions from LinkedIn
   */
  async fetchMentions(options = {}) {
    try {
      const { since, until, limit = 100 } = options;

      logger.info('[LinkedInConnector] Fetching mentions', {
        organizationId: this.oauth.organizationId,
        since: since?.toISOString(),
        limit
      });

      const mentions = [];

      // 1. Fetch organization's posts (shares)
      const posts = await this.fetchOrganizationPosts({ since, until, limit: Math.floor(limit / 2) });
      mentions.push(...posts);

      // 2. Fetch posts mentioning the organization
      const taggedPosts = await this.fetchMentionedPosts({ since, until, limit: Math.floor(limit / 2) });
      mentions.push(...taggedPosts);

      logger.info('[LinkedInConnector] Mentions fetched', {
        total: mentions.length,
        posts: posts.length,
        tagged: taggedPosts.length
      });

      // Normalize all mentions
      return mentions.map(m => this.normalizeMention(m));

    } catch (error) {
      logger.error('[LinkedInConnector] Failed to fetch mentions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch organization's posts
   */
  async fetchOrganizationPosts(options = {}) {
    try {
      const { since, limit = 50 } = options;

      const params = {
        q: 'author',
        author: `urn:li:organization:${this.oauth.organizationId}`,
        count: limit
      };

      const response = await this.client.get('/shares', { params });

      const shares = response.data.elements || [];

      // Filter by date if since provided
      return shares.filter(share => {
        if (!since) return true;
        const shareDate = new Date(share.created?.time || 0);
        return shareDate >= since;
      });

    } catch (error) {
      logger.error('[LinkedInConnector] Failed to fetch organization posts', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch posts mentioning the organization
   */
  async fetchMentionedPosts(options = {}) {
    try {
      const { since, limit = 50 } = options;

      // LinkedIn API doesn't have direct mention search
      // This would require using UGC Posts API or Social Actions API
      // For now, return empty array (requires premium API access)

      logger.warn('[LinkedInConnector] Mentioned posts fetching requires premium API access');
      return [];

    } catch (error) {
      logger.error('[LinkedInConnector] Failed to fetch mentioned posts', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Normalize LinkedIn share to standard mention format
   */
  normalizeMention(rawMention) {
    // Extract share ID
    const shareId = rawMention.id || rawMention.$URN;

    // Extract text content
    const text = rawMention.text?.text || rawMention.commentary || '';

    // Extract author info
    const authorUrn = rawMention.owner || rawMention.author;
    const authorId = authorUrn?.split(':')?.pop() || 'unknown';

    // Extract share statistics
    const stats = rawMention.content?.shareCommentary?.shareCommentary || {};
    const totalShares = rawMention.totalShareStatistics || {};

    const normalized = {
      tenant_id: this.tenantId,
      source_id: this.sourceId,
      platform: 'linkedin',
      external_id: shareId,
      url: `https://www.linkedin.com/feed/update/${shareId}`,
      content: text,

      // Author info
      author_name: rawMention.owner?.localizedName || 'Organization',
      author_handle: authorId,
      author_followers: 0, // Not available in share response
      author_verified: false,

      // Engagement metrics
      likes_count: totalShares.likeCount || 0,
      comments_count: totalShares.commentCount || 0,
      shares_count: totalShares.shareCount || 0,

      // Media
      media_type: this.determineMediaType(rawMention),
      media_urls: this.extractMediaUrls(rawMention),

      // Timestamps
      published_at: new Date(rawMention.created?.time || Date.now()),

      // Status
      status: 'new'
    };

    return normalized;
  }

  /**
   * Determine media type
   */
  determineMediaType(share) {
    if (!share.content) return 'text';

    const contentType = share.content.contentEntities?.[0]?.entityLocation;

    if (contentType) {
      if (contentType.includes('image') || contentType.includes('photo')) return 'image';
      if (contentType.includes('video')) return 'video';
      if (contentType.includes('article') || contentType.includes('link')) return 'link';
    }

    return 'text';
  }

  /**
   * Extract media URLs
   */
  extractMediaUrls(share) {
    const urls = [];

    if (share.content?.contentEntities) {
      for (const entity of share.content.contentEntities) {
        if (entity.thumbnails?.[0]?.resolvedUrl) {
          urls.push(entity.thumbnails[0].resolvedUrl);
        }
      }
    }

    return urls;
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(callbackUrl, state) {
    const stateValue = state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.oauth.clientId,
      redirect_uri: callbackUrl,
      state: stateValue,
      scope: 'r_organization_social w_organization_social rw_organization_admin r_basicprofile'
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code, state) {
    try {
      // Exchange code for access token
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.LINKEDIN_OAUTH_CALLBACK,
          client_id: this.oauth.clientId,
          client_secret: this.oauth.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, expires_in } = response.data;

      // Get user's organizations
      const orgsResponse = await axios.get(
        `${this.apiBaseUrl}/organizationAcls?q=roleAssignee`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          },
          params: {
            projection: '(elements*(organization~(id,localizedName,vanityName)))'
          }
        }
      );

      const organizations = orgsResponse.data.elements || [];

      logger.info('[LinkedInConnector] OAuth successful', {
        organizationCount: organizations.length
      });

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        organizations: organizations.map(org => ({
          id: org['organization~']?.id,
          name: org['organization~']?.localizedName,
          vanityName: org['organization~']?.vanityName
        }))
      };

    } catch (error) {
      logger.error('[LinkedInConnector] OAuth callback failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refresh access token (LinkedIn tokens don't have refresh mechanism)
   */
  async refreshAccessToken() {
    // LinkedIn access tokens are valid for 60 days
    // They don't support refresh tokens - user must re-authenticate
    throw new Error('LinkedIn tokens cannot be refreshed. User must re-authenticate.');
  }

  /**
   * Post reply to LinkedIn post (comment on share)
   */
  async postReply(shareUrn, replyText) {
    try {
      const response = await this.client.post('/socialActions', {
        actor: `urn:li:organization:${this.oauth.organizationId}`,
        object: shareUrn,
        message: {
          text: replyText
        }
      });

      logger.info('[LinkedInConnector] Reply posted', {
        shareUrn,
        actionId: response.data.id
      });

      return response.data.id;

    } catch (error) {
      logger.error('[LinkedInConnector] Failed to post reply', {
        shareUrn,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle rate limit
   */
  handleRateLimit(headers) {
    // LinkedIn doesn't expose rate limit info in headers consistently
    // Default to conservative limits
    this.rateLimit = {
      limit: 100, // Typical free tier limit per day
      remaining: 90, // Conservative estimate
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Reset in 24 hours
    };

    // Check if we got a 429 (rate limit exceeded)
    if (headers['x-li-fabric-error-message']?.includes('throttle')) {
      this.rateLimit.remaining = 0;
      logger.warn('[LinkedInConnector] Rate limit exceeded');
    }
  }
}

module.exports = LinkedInConnector;
