/**
 * Reddit Platform Connector
 *
 * Integrates with Reddit API + OAuth 2.0
 * Supports: Subreddit monitoring, keyword search, user mentions
 * Auth: OAuth 2.0 (Script/Web App)
 * Rate Limit: 60 requests per minute
 */

const BasePlatformConnector = require('./BasePlatformConnector');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../infrastructure/logger');

class RedditConnector extends BasePlatformConnector {
  constructor(config) {
    super({ ...config, platform: 'reddit' });

    this.apiBaseUrl = 'https://oauth.reddit.com';
    this.oauth = {
      accessToken: config.credentials?.accessToken,
      refreshToken: config.credentials?.refreshToken,
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      userAgent: 'VTrustX/1.0 (Social Listening Bot)'
    };

    // Search parameters from config
    this.searchParams = {
      subreddits: config.searchParams?.subreddits || [], // ['AskReddit', 'technology']
      keywords: config.searchParams?.keywords || [],
      username: config.searchParams?.username || '' // Track mentions of specific user
    };

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.oauth.accessToken}`,
        'User-Agent': this.oauth.userAgent
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
   * Test connection to Reddit API
   */
  async testConnection() {
    try {
      // Test by fetching authenticated user info
      const response = await this.client.get('/api/v1/me');

      logger.info('[RedditConnector] Connection test successful', {
        username: response.data.name,
        karma: response.data.total_karma
      });

      return {
        success: true,
        message: 'Connected successfully',
        userInfo: {
          username: response.data.name,
          karma: response.data.total_karma,
          created: new Date(response.data.created_utc * 1000)
        }
      };

    } catch (error) {
      logger.error('[RedditConnector] Connection test failed', {
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Fetch mentions from Reddit
   */
  async fetchMentions(options = {}) {
    try {
      const { since, until, limit = 100 } = options;

      logger.info('[RedditConnector] Fetching mentions', {
        subreddits: this.searchParams.subreddits,
        keywords: this.searchParams.keywords,
        limit
      });

      const mentions = [];

      // 1. Search by keywords across specified subreddits
      if (this.searchParams.keywords.length > 0) {
        const keywordResults = await this.searchByKeywords({
          since,
          until,
          limit: Math.floor(limit / 2)
        });
        mentions.push(...keywordResults);
      }

      // 2. Monitor specific subreddits for new posts
      if (this.searchParams.subreddits.length > 0) {
        const subredditResults = await this.monitorSubreddits({
          since,
          until,
          limit: Math.floor(limit / 2)
        });
        mentions.push(...subredditResults);
      }

      // 3. Track username mentions
      if (this.searchParams.username) {
        const userMentions = await this.searchUserMentions({
          since,
          until,
          limit: Math.floor(limit / 3)
        });
        mentions.push(...userMentions);
      }

      logger.info('[RedditConnector] Mentions fetched', {
        total: mentions.length
      });

      // Normalize all mentions
      return mentions.map(m => this.normalizeMention(m));

    } catch (error) {
      logger.error('[RedditConnector] Failed to fetch mentions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search Reddit by keywords
   */
  async searchByKeywords(options = {}) {
    try {
      const { since, limit = 50 } = options;
      const results = [];

      const query = this.searchParams.keywords.join(' OR ');
      const subreddit = this.searchParams.subreddits.length > 0
        ? this.searchParams.subreddits.join('+')
        : 'all';

      const params = {
        q: query,
        sort: 'new',
        limit: limit,
        t: 'all' // time filter
      };

      const response = await this.client.get(`/r/${subreddit}/search`, { params });

      const posts = response.data.data.children || [];

      // Filter by date if since parameter provided
      for (const post of posts) {
        const postData = post.data;
        const postDate = new Date(postData.created_utc * 1000);

        if (since && postDate < since) continue;

        results.push(postData);

        // Fetch comments for each post (check for keyword mentions)
        const comments = await this.fetchPostComments(postData.id, limit / 10);
        results.push(...comments);
      }

      return results;

    } catch (error) {
      logger.error('[RedditConnector] Failed to search by keywords', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Monitor specific subreddits
   */
  async monitorSubreddits(options = {}) {
    try {
      const { since, limit = 50 } = options;
      const results = [];

      for (const subreddit of this.searchParams.subreddits) {
        try {
          const response = await this.client.get(`/r/${subreddit}/new`, {
            params: { limit: Math.ceil(limit / this.searchParams.subreddits.length) }
          });

          const posts = response.data.data.children || [];

          for (const post of posts) {
            const postData = post.data;
            const postDate = new Date(postData.created_utc * 1000);

            if (since && postDate < since) continue;

            results.push(postData);
          }

        } catch (err) {
          logger.error('[RedditConnector] Failed to fetch from subreddit', {
            subreddit,
            error: err.message
          });
        }
      }

      return results;

    } catch (error) {
      logger.error('[RedditConnector] Failed to monitor subreddits', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Search for username mentions
   */
  async searchUserMentions(options = {}) {
    try {
      const { since, limit = 30 } = options;

      const response = await this.client.get('/search', {
        params: {
          q: `u/${this.searchParams.username}`,
          sort: 'new',
          limit
        }
      });

      const posts = response.data.data.children || [];
      const results = [];

      for (const post of posts) {
        const postData = post.data;
        const postDate = new Date(postData.created_utc * 1000);

        if (since && postDate < since) continue;

        results.push(postData);
      }

      return results;

    } catch (error) {
      logger.error('[RedditConnector] Failed to search user mentions', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch comments for a post
   */
  async fetchPostComments(postId, limit = 10) {
    try {
      const response = await this.client.get(`/comments/${postId}`, {
        params: { limit }
      });

      // Reddit returns [post_listing, comments_listing]
      const commentsListing = response.data[1];
      const comments = commentsListing?.data?.children || [];

      return comments
        .map(c => c.data)
        .filter(c => c.body && !c.stickied); // Filter out stickied mod comments

    } catch (error) {
      logger.error('[RedditConnector] Failed to fetch post comments', {
        postId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Normalize Reddit post/comment to standard mention format
   */
  normalizeMention(rawMention) {
    // Determine if this is a comment or post
    const isComment = rawMention.body !== undefined;

    const normalized = {
      tenant_id: this.tenantId,
      source_id: this.sourceId,
      platform: 'reddit',
      external_id: rawMention.id,
      url: `https://reddit.com${rawMention.permalink}`,
      content: isComment ? rawMention.body : (rawMention.selftext || rawMention.title || ''),

      // Author info
      author_name: rawMention.author,
      author_handle: rawMention.author,
      author_followers: 0, // Reddit doesn't expose follower count easily
      author_verified: rawMention.author_flair_text !== null,

      // Engagement metrics
      likes_count: rawMention.ups || rawMention.score || 0,
      comments_count: isComment ? 0 : (rawMention.num_comments || 0),
      shares_count: 0, // Reddit doesn't expose share count

      // Media
      media_type: this.determineMediaType(rawMention),
      media_urls: this.extractMediaUrls(rawMention),

      // Additional context
      subreddit: rawMention.subreddit,

      // Timestamps
      published_at: new Date(rawMention.created_utc * 1000),

      // Post type
      post_type: isComment ? 'comment' : (rawMention.is_self ? 'post' : 'link'),

      // Status
      status: 'new'
    };

    return normalized;
  }

  /**
   * Determine media type
   */
  determineMediaType(post) {
    if (post.body || post.is_self) return 'text';

    if (post.post_hint) {
      switch (post.post_hint) {
        case 'image':
          return 'image';
        case 'hosted:video':
        case 'rich:video':
          return 'video';
        case 'link':
          return 'link';
        default:
          return 'text';
      }
    }

    if (post.url) {
      if (post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
      if (post.url.match(/\.(mp4|webm|mov)$/i)) return 'video';
      if (post.url !== post.permalink) return 'link';
    }

    return 'text';
  }

  /**
   * Extract media URLs
   */
  extractMediaUrls(post) {
    const urls = [];

    if (post.url && !post.is_self) {
      urls.push(post.url);
    }

    if (post.preview?.images) {
      for (const image of post.preview.images) {
        if (image.source?.url) {
          urls.push(image.source.url.replace(/&amp;/g, '&'));
        }
      }
    }

    if (post.media?.reddit_video?.fallback_url) {
      urls.push(post.media.reddit_video.fallback_url);
    }

    return urls;
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(callbackUrl, state) {
    const stateValue = state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: this.oauth.clientId,
      response_type: 'code',
      state: stateValue,
      redirect_uri: callbackUrl,
      duration: 'permanent', // Get refresh token
      scope: 'identity read submit history'
    });

    return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code, state) {
    try {
      // Exchange code for access token
      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.REDDIT_OAUTH_CALLBACK
        }),
        {
          auth: {
            username: this.oauth.clientId,
            password: this.oauth.clientSecret
          },
          headers: {
            'User-Agent': this.oauth.userAgent
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      logger.info('[RedditConnector] OAuth successful');

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };

    } catch (error) {
      logger.error('[RedditConnector] OAuth callback failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.oauth.refreshToken
        }),
        {
          auth: {
            username: this.oauth.clientId,
            password: this.oauth.clientSecret
          },
          headers: {
            'User-Agent': this.oauth.userAgent
          }
        }
      );

      const { access_token, expires_in } = response.data;

      logger.info('[RedditConnector] Token refreshed');

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };

    } catch (error) {
      logger.error('[RedditConnector] Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Post reply to Reddit post/comment
   */
  async postReply(thingId, replyText) {
    try {
      // Reddit uses "thing" IDs with prefixes (t1_ = comment, t3_ = post)
      const response = await this.client.post('/api/comment', {
        thing_id: thingId,
        text: replyText
      });

      logger.info('[RedditConnector] Reply posted', {
        thingId,
        replyId: response.data.json?.data?.things?.[0]?.data?.id
      });

      return response.data.json?.data?.things?.[0]?.data?.id;

    } catch (error) {
      logger.error('[RedditConnector] Failed to post reply', {
        thingId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle rate limit
   */
  handleRateLimit(headers) {
    // Reddit returns rate limit info in headers
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '60');
    const resetTimestamp = parseFloat(headers['x-ratelimit-reset'] || Date.now() / 1000 + 60);

    this.rateLimit = {
      limit: 60, // 60 requests per minute
      remaining,
      resetAt: new Date(resetTimestamp * 1000)
    };

    if (this.rateLimit.remaining < 10) {
      logger.warn('[RedditConnector] Rate limit approaching', {
        remaining: this.rateLimit.remaining,
        resetAt: this.rateLimit.resetAt
      });
    }
  }
}

module.exports = RedditConnector;
