/**
 * YouTube Platform Connector
 *
 * Integrates with YouTube Data API v3
 * Supports: Channel videos, comments, video search
 * Auth: OAuth 2.0 or API Key
 * Rate Limit: 10,000 quota units per day (varies by operation)
 */

const BasePlatformConnector = require('./BasePlatformConnector');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../infrastructure/logger');

class YouTubeConnector extends BasePlatformConnector {
  constructor(config) {
    super({ ...config, platform: 'youtube' });

    this.apiBaseUrl = 'https://www.googleapis.com/youtube/v3';
    this.oauth = {
      accessToken: config.credentials?.accessToken,
      refreshToken: config.credentials?.refreshToken,
      channelId: config.credentials?.channelId,
      apiKey: process.env.YOUTUBE_API_KEY,
      clientId: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET
    };

    // Search parameters
    this.searchParams = {
      keywords: config.searchParams?.keywords || [],
      channelIds: config.searchParams?.channelIds || [] // Monitor specific channels
    };

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
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
   * Test connection to YouTube API
   */
  async testConnection() {
    try {
      // Test by fetching channel info
      const response = await this.client.get('/channels', {
        params: {
          part: 'snippet,statistics',
          id: this.oauth.channelId,
          key: this.oauth.apiKey
        }
      });

      const channel = response.data.items?.[0];

      if (!channel) {
        return {
          success: false,
          message: 'Channel not found'
        };
      }

      logger.info('[YouTubeConnector] Connection test successful', {
        channelId: channel.id,
        title: channel.snippet.title,
        subscribers: channel.statistics.subscriberCount
      });

      return {
        success: true,
        message: 'Connected successfully',
        channelInfo: {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          subscribers: parseInt(channel.statistics.subscriberCount),
          videoCount: parseInt(channel.statistics.videoCount),
          viewCount: parseInt(channel.statistics.viewCount)
        }
      };

    } catch (error) {
      logger.error('[YouTubeConnector] Connection test failed', {
        error: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Fetch mentions from YouTube
   */
  async fetchMentions(options = {}) {
    try {
      const { since, until, limit = 100 } = options;

      logger.info('[YouTubeConnector] Fetching mentions', {
        channelId: this.oauth.channelId,
        keywords: this.searchParams.keywords,
        since: since?.toISOString(),
        limit
      });

      const mentions = [];

      // 1. Fetch channel's videos
      const videos = await this.fetchChannelVideos({ since, until, limit: Math.floor(limit / 3) });
      mentions.push(...videos);

      // 2. Fetch comments on channel's videos
      for (const video of videos.slice(0, 10)) { // Limit to recent 10 videos
        const comments = await this.fetchVideoComments(video.id, 10);
        mentions.push(...comments);
      }

      // 3. Search for videos mentioning keywords
      if (this.searchParams.keywords.length > 0) {
        const searchResults = await this.searchVideos({ since, until, limit: Math.floor(limit / 3) });
        mentions.push(...searchResults);
      }

      logger.info('[YouTubeConnector] Mentions fetched', {
        total: mentions.length,
        videos: videos.length
      });

      // Normalize all mentions
      return mentions.map(m => this.normalizeMention(m));

    } catch (error) {
      logger.error('[YouTubeConnector] Failed to fetch mentions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch channel's videos
   */
  async fetchChannelVideos(options = {}) {
    try {
      const { since, limit = 30 } = options;

      const params = {
        part: 'snippet,statistics',
        channelId: this.oauth.channelId,
        type: 'video',
        order: 'date',
        maxResults: Math.min(limit, 50), // API max is 50
        key: this.oauth.apiKey
      };

      if (since) {
        params.publishedAfter = since.toISOString();
      }

      const response = await this.client.get('/search', { params });

      const videoIds = response.data.items?.map(item => item.id.videoId) || [];

      // Fetch detailed video info (including stats)
      if (videoIds.length === 0) return [];

      const videosResponse = await this.client.get('/videos', {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(','),
          key: this.oauth.apiKey
        }
      });

      return videosResponse.data.items || [];

    } catch (error) {
      logger.error('[YouTubeConnector] Failed to fetch channel videos', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch comments for a video
   */
  async fetchVideoComments(videoId, limit = 20) {
    try {
      const response = await this.client.get('/commentThreads', {
        params: {
          part: 'snippet',
          videoId,
          textFormat: 'plainText',
          maxResults: Math.min(limit, 100),
          order: 'time',
          key: this.oauth.apiKey
        }
      });

      return response.data.items?.map(thread => ({
        ...thread.snippet.topLevelComment.snippet,
        videoId,
        commentId: thread.snippet.topLevelComment.id,
        type: 'comment'
      })) || [];

    } catch (error) {
      // Comments might be disabled for video
      if (error.response?.status === 403) {
        logger.debug('[YouTubeConnector] Comments disabled for video', { videoId });
        return [];
      }

      logger.error('[YouTubeConnector] Failed to fetch video comments', {
        videoId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Search for videos by keywords
   */
  async searchVideos(options = {}) {
    try {
      const { since, limit = 30 } = options;

      const query = this.searchParams.keywords.join(' OR ');

      const params = {
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'date',
        maxResults: Math.min(limit, 50),
        key: this.oauth.apiKey
      };

      if (since) {
        params.publishedAfter = since.toISOString();
      }

      const response = await this.client.get('/search', { params });

      const videoIds = response.data.items?.map(item => item.id.videoId) || [];

      if (videoIds.length === 0) return [];

      // Fetch detailed video info
      const videosResponse = await this.client.get('/videos', {
        params: {
          part: 'snippet,statistics',
          id: videoIds.join(','),
          key: this.oauth.apiKey
        }
      });

      return videosResponse.data.items || [];

    } catch (error) {
      logger.error('[YouTubeConnector] Failed to search videos', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Normalize YouTube video/comment to standard mention format
   */
  normalizeMention(rawMention) {
    const isComment = rawMention.type === 'comment';

    const normalized = {
      tenant_id: this.tenantId,
      source_id: this.sourceId,
      platform: 'youtube',
      external_id: isComment ? rawMention.commentId : rawMention.id,
      url: isComment
        ? `https://youtube.com/watch?v=${rawMention.videoId}&lc=${rawMention.commentId}`
        : `https://youtube.com/watch?v=${rawMention.id}`,
      content: isComment ? rawMention.textDisplay : (rawMention.snippet?.title || ''),

      // Author info
      author_name: isComment ? rawMention.authorDisplayName : rawMention.snippet?.channelTitle,
      author_handle: isComment ? rawMention.authorChannelId?.value : rawMention.snippet?.channelId,
      author_followers: 0, // Not available in responses
      author_verified: false,

      // Engagement metrics
      likes_count: isComment ? rawMention.likeCount : parseInt(rawMention.statistics?.likeCount || 0),
      comments_count: isComment ? 0 : parseInt(rawMention.statistics?.commentCount || 0),
      shares_count: 0, // YouTube doesn't expose share count

      // Media (videos always have media)
      media_type: isComment ? 'text' : 'video',
      media_urls: isComment ? [] : [rawMention.snippet?.thumbnails?.high?.url || ''],

      // Additional context
      views: isComment ? 0 : parseInt(rawMention.statistics?.viewCount || 0),

      // Timestamps
      published_at: new Date(isComment ? rawMention.publishedAt : rawMention.snippet?.publishedAt),

      // Post type
      post_type: isComment ? 'comment' : 'video',

      // Status
      status: 'new'
    };

    return normalized;
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(callbackUrl, state) {
    const stateValue = state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: this.oauth.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl',
      access_type: 'offline', // Get refresh token
      state: stateValue,
      prompt: 'consent' // Force consent to get refresh token
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code, state) {
    try {
      // Exchange code for access token
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: this.oauth.clientId,
          client_secret: this.oauth.clientSecret,
          redirect_uri: process.env.YOUTUBE_OAUTH_CALLBACK,
          grant_type: 'authorization_code'
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Get user's YouTube channels
      const channelsResponse = await axios.get(`${this.apiBaseUrl}/channels`, {
        params: {
          part: 'snippet',
          mine: true
        },
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const channels = channelsResponse.data.items || [];

      logger.info('[YouTubeConnector] OAuth successful', {
        channelCount: channels.length
      });

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        channels: channels.map(c => ({
          id: c.id,
          title: c.snippet.title,
          description: c.snippet.description
        }))
      };

    } catch (error) {
      logger.error('[YouTubeConnector] OAuth callback failed', {
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
        'https://oauth2.googleapis.com/token',
        {
          client_id: this.oauth.clientId,
          client_secret: this.oauth.clientSecret,
          refresh_token: this.oauth.refreshToken,
          grant_type: 'refresh_token'
        }
      );

      const { access_token, expires_in } = response.data;

      logger.info('[YouTubeConnector] Token refreshed');

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };

    } catch (error) {
      logger.error('[YouTubeConnector] Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Post reply to YouTube comment
   */
  async postReply(commentId, replyText) {
    try {
      // Requires OAuth token (not API key)
      const response = await axios.post(
        `${this.apiBaseUrl}/comments`,
        {
          snippet: {
            parentId: commentId,
            textOriginal: replyText
          }
        },
        {
          params: {
            part: 'snippet'
          },
          headers: {
            'Authorization': `Bearer ${this.oauth.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('[YouTubeConnector] Reply posted', {
        commentId,
        replyId: response.data.id
      });

      return response.data.id;

    } catch (error) {
      logger.error('[YouTubeConnector] Failed to post reply', {
        commentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle rate limit (quota-based)
   */
  handleRateLimit(headers) {
    // YouTube uses quota system, not traditional rate limits
    // Each API call costs different quota units
    // Default quota: 10,000 units per day
    // We can't track exact remaining quota from headers

    this.rateLimit = {
      limit: 10000, // Daily quota units
      remaining: 9000, // Conservative estimate
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Resets daily
    };

    // Check for quota exceeded error
    const errorResponse = headers['x-goog-api-format-version'];
    if (errorResponse === 'quotaExceeded') {
      this.rateLimit.remaining = 0;
      logger.warn('[YouTubeConnector] Quota exceeded');
    }
  }
}

module.exports = YouTubeConnector;
