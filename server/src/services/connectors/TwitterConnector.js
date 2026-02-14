/**
 * Twitter/X Platform Connector
 *
 * Connects to Twitter API v2 to fetch mentions
 * Uses OAuth 2.0 for authentication
 */

const BasePlatformConnector = require('./BasePlatformConnector');
const axios = require('axios');
const crypto = require('crypto');

class TwitterConnector extends BasePlatformConnector {
  constructor(config) {
    super({ ...config, platform: 'twitter' });

    this.apiBaseUrl = 'https://api.twitter.com/2';
    this.oauth = {
      clientId: process.env.TWITTER_CLIENT_ID || config.credentials.clientId,
      clientSecret: process.env.TWITTER_CLIENT_SECRET || config.credentials.clientSecret,
      accessToken: config.credentials.accessToken,
      refreshToken: config.credentials.refreshToken
    };

    // Initialize axios instance with auth
    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.oauth.accessToken}`,
        'User-Agent': 'VTrustX-SocialListening/1.0'
      }
    });

    // Add response interceptor for rate limiting
    this.client.interceptors.response.use(
      (response) => {
        this.handleRateLimit(response.headers);
        return response;
      },
      (error) => {
        if (error.response) {
          this.handleRateLimit(error.response.headers);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test connection to Twitter API
   */
  async testConnection() {
    try {
      const response = await this.client.get('/users/me');

      if (response.data && response.data.data) {
        this.log('Connection test successful', {
          username: response.data.data.username,
          userId: response.data.data.id
        });

        return {
          success: true,
          message: `Connected as @${response.data.data.username}`,
          user: response.data.data
        };
      }

      return { success: false, message: 'Invalid response from Twitter API' };

    } catch (error) {
      this.logError('Connection test', error);
      return {
        success: false,
        message: error.response?.data?.detail || error.message
      };
    }
  }

  /**
   * Fetch mentions from Twitter
   */
  async fetchMentions(options = {}) {
    try {
      const { sinceId, maxId, limit = 100, since, until } = options;

      // Build search query from searchParams
      const query = this.buildSearchQuery();

      if (!query) {
        throw new Error('No search keywords configured');
      }

      // Build request parameters
      const params = {
        query,
        max_results: Math.min(limit, 100), // Twitter max is 100 per request
        'tweet.fields': 'author_id,created_at,public_metrics,entities,geo,lang,possibly_sensitive,referenced_tweets',
        'user.fields': 'username,name,public_metrics,verified,profile_image_url,url',
        'media.fields': 'url,preview_image_url,type,alt_text',
        'place.fields': 'full_name,country,country_code,geo,place_type',
        expansions: 'author_id,attachments.media_keys,geo.place_id,referenced_tweets.id'
      };

      // Add pagination
      if (sinceId) params.since_id = sinceId;
      if (maxId) params.until_id = maxId;

      // Add date filters
      if (since) params.start_time = since.toISOString();
      if (until) params.end_time = until.toISOString();

      this.log('Fetching mentions', {
        query,
        limit,
        sinceId,
        maxId
      });

      const response = await this.client.get('/tweets/search/recent', { params });

      // Check for rate limiting
      if (this.isRateLimited()) {
        this.log('Rate limited', {
          resetAt: this.rateLimits.resetAt,
          timeUntilReset: Math.round(this.getTimeUntilReset() / 1000) + 's'
        });
      }

      // Parse response
      const tweets = response.data.data || [];
      const includes = response.data.includes || {};
      const users = includes.users || [];
      const media = includes.media || [];
      const places = includes.places || [];

      // Create user lookup map
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      // Create media lookup map
      const mediaMap = {};
      media.forEach(m => {
        mediaMap[m.media_key] = m;
      });

      // Create place lookup map
      const placeMap = {};
      places.forEach(place => {
        placeMap[place.id] = place;
      });

      // Normalize tweets
      const mentions = tweets.map(tweet => this.normalizeTweet(tweet, userMap, mediaMap, placeMap));

      this.log('Mentions fetched', {
        count: mentions.length,
        rateLimitRemaining: this.rateLimits.remaining
      });

      return mentions;

    } catch (error) {
      this.logError('Fetch mentions', error);

      // Check for specific errors
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please reconnect your Twitter account.');
      }

      throw error;
    }
  }

  /**
   * Build search query from search parameters
   */
  buildSearchQuery() {
    const { keywords = [], excludedKeywords = [], hashtags = [], mentions = [], languages = [] } = this.searchParams;

    const queryParts = [];

    // Add keywords (OR condition)
    if (keywords.length > 0) {
      const keywordQuery = keywords.map(k => `"${k}"`).join(' OR ');
      queryParts.push(`(${keywordQuery})`);
    }

    // Add hashtags (OR condition)
    if (hashtags && hashtags.length > 0) {
      const hashtagQuery = hashtags.map(h => `#${h}`).join(' OR ');
      queryParts.push(`(${hashtagQuery})`);
    }

    // Add mentions (OR condition)
    if (mentions && mentions.length > 0) {
      const mentionQuery = mentions.map(m => `@${m}`).join(' OR ');
      queryParts.push(`(${mentionQuery})`);
    }

    // Add excluded keywords
    if (excludedKeywords && excludedKeywords.length > 0) {
      excludedKeywords.forEach(k => {
        queryParts.push(`-"${k}"`);
      });
    }

    // Add language filter
    if (languages && languages.length > 0) {
      const langQuery = languages.map(l => `lang:${l}`).join(' OR ');
      queryParts.push(`(${langQuery})`);
    }

    // Exclude retweets by default
    queryParts.push('-is:retweet');

    return queryParts.join(' ');
  }

  /**
   * Normalize a Twitter tweet to common mention format
   */
  normalizeTweet(tweet, userMap, mediaMap, placeMap) {
    const author = userMap[tweet.author_id] || {};
    const metrics = tweet.public_metrics || {};
    const place = tweet.geo?.place_id ? placeMap[tweet.geo.place_id] : null;

    // Extract media URLs
    const mediaUrls = [];
    if (tweet.attachments && tweet.attachments.media_keys) {
      tweet.attachments.media_keys.forEach(key => {
        const m = mediaMap[key];
        if (m) {
          mediaUrls.push(m.url || m.preview_image_url);
        }
      });
    }

    return this.normalizeMention({
      id: tweet.id,
      external_id: tweet.id,
      url: `https://twitter.com/${author.username}/status/${tweet.id}`,
      text: tweet.text,
      content: tweet.text,
      author: {
        name: author.name,
        username: author.username,
        followers_count: author.public_metrics?.followers_count || 0,
        url: `https://twitter.com/${author.username}`,
        verified: author.verified,
        profile_image: author.profile_image_url
      },
      created_at: tweet.created_at,
      published_at: new Date(tweet.created_at),
      likes_count: metrics.like_count || 0,
      retweet_count: metrics.retweet_count || 0,
      reply_count: metrics.reply_count || 0,
      comments_count: metrics.reply_count || 0,
      shares_count: metrics.retweet_count || 0,
      reach: metrics.impression_count,
      media_urls: mediaUrls,
      location: place ? place.full_name : null,
      language: tweet.lang,
      possibly_sensitive: tweet.possibly_sensitive,
      raw_data: tweet
    });
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(callbackUrl, state) {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.oauth.clientId,
      redirect_uri: callbackUrl,
      scope: 'tweet.read users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return {
      authUrl,
      state,
      codeVerifier // Store this for later use in callback
    };
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code, codeVerifier) {
    try {
      const params = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.oauth.clientId,
        redirect_uri: process.env.TWITTER_CALLBACK_URL,
        code_verifier: codeVerifier
      });

      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.oauth.clientId}:${this.oauth.clientSecret}`).toString('base64')}`
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };

    } catch (error) {
      this.logError('OAuth callback', error);
      throw new Error('Failed to exchange authorization code: ' + error.message);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.oauth.refreshToken,
        client_id: this.oauth.clientId
      });

      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.oauth.clientId}:${this.oauth.clientSecret}`).toString('base64')}`
          }
        }
      );

      const { access_token, expires_in } = response.data;

      // Update client with new token
      this.oauth.accessToken = access_token;
      this.client.defaults.headers['Authorization'] = `Bearer ${access_token}`;

      return {
        accessToken: access_token,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };

    } catch (error) {
      this.logError('Refresh token', error);
      throw new Error('Failed to refresh access token: ' + error.message);
    }
  }

  /**
   * Generate code verifier for PKCE
   */
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate code challenge from verifier for PKCE
   */
  generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
}

module.exports = TwitterConnector;
