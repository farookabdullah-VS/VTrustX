/**
 * TikTok Business Platform Connector
 *
 * Integrates with TikTok Content Posting API and Display API
 * Supports: TikTok for Business accounts
 * Auth: OAuth 2.0
 * Rate Limit: 100 requests per second
 *
 * TikTok APIs: https://developers.tiktok.com/doc/overview
 */

const BasePlatformConnector = require('./BasePlatformConnector');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../infrastructure/logger');

class TikTokConnector extends BasePlatformConnector {
  constructor(config) {
    super({ ...config, platform: 'tiktok' });

    this.apiBaseUrl = 'https://open.tiktokapis.com/v2';
    this.oauth = {
      accessToken: config.credentials?.accessToken,
      refreshToken: config.credentials?.refreshToken,
      openId: config.credentials?.openId,
      clientKey: process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET
    };

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.oauth.accessToken}`,
        'Content-Type': 'application/json'
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

          // Handle token expiration
          if (error.response.status === 401) {
            logger.warn('[TikTokConnector] Access token expired, refresh required');
          }
        }
        throw error;
      }
    );
  }

  /**
   * Test connection to TikTok API
   */
  async testConnection() {
    try {
      // Test by fetching user info
      const response = await this.client.post('/user/info/', {
        fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'follower_count', 'following_count', 'video_count']
      });

      if (response.data.error) {
        return {
          success: false,
          message: response.data.error.message || 'Failed to connect to TikTok'
        };
      }

      const userData = response.data.data.user;

      logger.info('[TikTokConnector] Connection test successful', {
        displayName: userData.display_name,
        followers: userData.follower_count
      });

      return {
        success: true,
        message: 'Connected successfully',
        accountInfo: {
          openId: userData.open_id,
          displayName: userData.display_name,
          avatarUrl: userData.avatar_url,
          followers: userData.follower_count,
          following: userData.following_count,
          videoCount: userData.video_count
        }
      };

    } catch (error) {
      logger.error('[TikTokConnector] Connection test failed', {
        error: error.message
      });

      return {
        success: false,
        message: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Fetch mentions from TikTok
   */
  async fetchMentions(options = {}) {
    try {
      const { since, until, limit = 100 } = options;

      logger.info('[TikTokConnector] Fetching mentions', {
        openId: this.oauth.openId,
        since: since?.toISOString(),
        limit
      });

      const mentions = [];

      // 1. Fetch own videos (mentions of keywords in video captions)
      const videos = await this.fetchUserVideos({ since, until, limit: Math.floor(limit / 2) });
      mentions.push(...videos);

      // 2. Fetch comments on videos
      const comments = await this.fetchVideoComments({ since, until, limit: Math.floor(limit / 2) });
      mentions.push(...comments);

      logger.info('[TikTokConnector] Mentions fetched', {
        total: mentions.length,
        videos: videos.length,
        comments: comments.length
      });

      // Normalize all mentions
      return mentions.map(m => this.normalizeMention(m));

    } catch (error) {
      logger.error('[TikTokConnector] Failed to fetch mentions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch user's videos
   */
  async fetchUserVideos(options = {}) {
    try {
      const { since, until, limit = 50 } = options;

      const requestData = {
        max_count: Math.min(limit, 20), // TikTok limits to 20 per request
        cursor: 0
      };

      if (since) {
        requestData.start_time = Math.floor(since.getTime() / 1000);
      }

      if (until) {
        requestData.end_time = Math.floor(until.getTime() / 1000);
      }

      const response = await this.client.post('/video/list/', {
        fields: [
          'id',
          'create_time',
          'cover_image_url',
          'share_url',
          'video_description',
          'duration',
          'height',
          'width',
          'title',
          'embed_html',
          'embed_link',
          'like_count',
          'comment_count',
          'share_count',
          'view_count'
        ],
        ...requestData
      });

      if (response.data.error) {
        logger.error('[TikTokConnector] Failed to fetch videos', {
          error: response.data.error.message
        });
        return [];
      }

      const videos = response.data.data?.videos || [];

      // Filter by keywords if specified in searchParams
      const keywords = this.searchParams.keywords || [];
      if (keywords.length > 0) {
        return videos.filter(video => {
          const text = (video.video_description || '').toLowerCase();
          return keywords.some(keyword => text.includes(keyword.toLowerCase()));
        });
      }

      return videos;

    } catch (error) {
      logger.error('[TikTokConnector] Failed to fetch user videos', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch comments on user's videos
   */
  async fetchVideoComments(options = {}) {
    try {
      const { limit = 50 } = options;

      // First get recent videos
      const videos = await this.fetchUserVideos({ limit: 10 });

      const allComments = [];

      // For each video, fetch comments
      for (const video of videos) {
        try {
          const response = await this.client.post('/video/comment/list/', {
            video_id: video.id,
            max_count: Math.min(limit, 50),
            cursor: 0
          });

          if (response.data.error) {
            logger.error('[TikTokConnector] Failed to fetch comments for video', {
              videoId: video.id,
              error: response.data.error.message
            });
            continue;
          }

          const comments = response.data.data?.comments || [];

          // Attach video info to comments for context
          const commentsWithVideo = comments.map(comment => ({
            ...comment,
            video_id: video.id,
            video_url: video.share_url,
            video_description: video.video_description
          }));

          allComments.push(...commentsWithVideo);

        } catch (err) {
          logger.error('[TikTokConnector] Failed to fetch comments for video', {
            videoId: video.id,
            error: err.message
          });
        }
      }

      // Filter by keywords if specified
      const keywords = this.searchParams.keywords || [];
      if (keywords.length > 0) {
        return allComments.filter(comment => {
          const text = (comment.text || '').toLowerCase();
          return keywords.some(keyword => text.includes(keyword.toLowerCase()));
        });
      }

      return allComments;

    } catch (error) {
      logger.error('[TikTokConnector] Failed to fetch video comments', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Normalize TikTok video/comment to standard mention format
   */
  normalizeMention(rawMention) {
    // Determine if this is a comment or video
    const isComment = rawMention.text !== undefined;

    const normalized = {
      tenant_id: this.tenantId,
      source_id: this.sourceId,
      platform: 'tiktok',
      external_id: rawMention.id || rawMention.comment_id,
      url: isComment ? rawMention.video_url : rawMention.share_url,
      content: isComment ? rawMention.text : (rawMention.video_description || rawMention.title || ''),

      // Author info (for comments, might not have full user data)
      author_name: rawMention.user?.display_name || rawMention.creator?.display_name || 'Unknown',
      author_handle: rawMention.user?.unique_id || rawMention.creator?.unique_id || '',
      author_followers: rawMention.user?.follower_count || 0,
      author_verified: rawMention.user?.is_verified || false,
      author_url: rawMention.user?.unique_id ? `https://www.tiktok.com/@${rawMention.user.unique_id}` : null,
      author_avatar_url: rawMention.user?.avatar_url || rawMention.creator?.avatar_url,

      // Engagement metrics
      likes_count: rawMention.like_count || 0,
      comments_count: isComment ? 0 : (rawMention.comment_count || 0),
      shares_count: rawMention.share_count || 0,
      views_count: rawMention.view_count || 0,

      // Reach
      reach: rawMention.view_count || null,

      // Media
      media_type: isComment ? 'text' : 'video',
      media_urls: this.extractMediaUrls(rawMention),

      // Video-specific data
      duration: isComment ? null : rawMention.duration,
      dimensions: isComment ? null : {
        width: rawMention.width,
        height: rawMention.height
      },

      // Timestamps
      published_at: new Date(isComment ? (rawMention.create_time || Date.now()) : (rawMention.create_time * 1000)),

      // Post type
      post_type: isComment ? 'comment' : 'video',

      // Embed info (useful for sharing)
      embed_link: rawMention.embed_link,
      embed_html: rawMention.embed_html,

      // Status
      status: 'new',

      // Store raw data for debugging
      raw_data: rawMention
    };

    return normalized;
  }

  /**
   * Extract media URLs from TikTok content
   */
  extractMediaUrls(content) {
    const urls = [];

    // Cover image (thumbnail)
    if (content.cover_image_url) {
      urls.push(content.cover_image_url);
    }

    // Video share URL
    if (content.share_url && !urls.includes(content.share_url)) {
      urls.push(content.share_url);
    }

    return urls;
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(callbackUrl, state) {
    const csrfState = state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_key: this.oauth.clientKey,
      scope: 'user.info.basic,video.list,video.upload,comment.list.manage',
      response_type: 'code',
      redirect_uri: callbackUrl,
      state: csrfState
    });

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

    logger.info('[TikTokConnector] OAuth URL generated', {
      callbackUrl,
      state: csrfState
    });

    return {
      authUrl,
      state: csrfState
    };
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code, state) {
    try {
      // Exchange authorization code for access token
      const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
        client_key: this.oauth.clientKey,
        client_secret: this.oauth.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_OAUTH_CALLBACK
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error_description || response.data.error);
      }

      const {
        access_token,
        refresh_token,
        expires_in,
        refresh_expires_in,
        open_id,
        scope
      } = response.data;

      logger.info('[TikTokConnector] OAuth successful', {
        openId: open_id,
        expiresIn: expires_in,
        scope
      });

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        refreshExpiresIn: refresh_expires_in,
        openId: open_id,
        scope
      };

    } catch (error) {
      logger.error('[TikTokConnector] OAuth callback failed', {
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
        client_key: this.oauth.clientKey,
        client_secret: this.oauth.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.oauth.refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error_description || response.data.error);
      }

      const {
        access_token,
        refresh_token,
        expires_in,
        refresh_expires_in
      } = response.data;

      logger.info('[TikTokConnector] Token refreshed', {
        expiresIn: expires_in,
        refreshExpiresIn: refresh_expires_in
      });

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        refreshExpiresIn: refresh_expires_in
      };

    } catch (error) {
      logger.error('[TikTokConnector] Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Post comment on a video
   */
  async postComment(videoId, commentText) {
    try {
      const response = await this.client.post('/video/comment/publish/', {
        video_id: videoId,
        text: commentText
      });

      if (response.data.error) {
        throw new Error(response.data.error.message || 'Failed to post comment');
      }

      logger.info('[TikTokConnector] Comment posted', {
        videoId,
        commentId: response.data.data.comment_id
      });

      return response.data.data.comment_id;

    } catch (error) {
      logger.error('[TikTokConnector] Failed to post comment', {
        videoId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId) {
    try {
      const response = await this.client.post('/video/comment/delete/', {
        comment_id: commentId
      });

      if (response.data.error) {
        throw new Error(response.data.error.message || 'Failed to delete comment');
      }

      logger.info('[TikTokConnector] Comment deleted', {
        commentId
      });

      return true;

    } catch (error) {
      logger.error('[TikTokConnector] Failed to delete comment', {
        commentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle rate limit from TikTok API
   */
  handleRateLimit(headers) {
    // TikTok uses standard rate limit headers
    const remaining = parseInt(headers['x-rate-limit-remaining']);
    const limit = parseInt(headers['x-rate-limit-limit']);
    const reset = headers['x-rate-limit-reset'];

    if (!isNaN(remaining) && !isNaN(limit)) {
      this.rateLimits = {
        remaining,
        limit,
        resetAt: reset ? new Date(parseInt(reset) * 1000) : null
      };

      if (remaining < 10) {
        logger.warn('[TikTokConnector] Rate limit approaching', {
          remaining,
          limit,
          resetAt: this.rateLimits.resetAt
        });
      }

      logger.debug('[TikTokConnector] Rate limit updated', {
        remaining,
        limit
      });
    }
  }

  /**
   * Get video analytics
   */
  async getVideoAnalytics(videoId) {
    try {
      const response = await this.client.post('/video/query/', {
        filters: {
          video_ids: [videoId]
        },
        fields: [
          'id',
          'like_count',
          'comment_count',
          'share_count',
          'view_count',
          'reach',
          'full_video_watched_rate'
        ]
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const video = response.data.data?.videos?.[0];

      logger.info('[TikTokConnector] Video analytics fetched', {
        videoId,
        views: video?.view_count
      });

      return video || null;

    } catch (error) {
      logger.error('[TikTokConnector] Failed to fetch video analytics', {
        videoId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = TikTokConnector;
