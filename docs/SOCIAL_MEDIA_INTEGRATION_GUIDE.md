# Social Media Integration Guide

**Complete guide to integrating social media platforms into VTrustX Social Listening**

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Implementation](#current-implementation)
3. [Platform Integration Steps](#platform-integration-steps)
4. [Facebook Integration](#facebook-integration)
5. [Instagram Integration](#instagram-integration)
6. [LinkedIn Integration](#linkedin-integration)
7. [YouTube Integration](#youtube-integration)
8. [Testing Guide](#testing-guide)
9. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

### Connector Pattern

VTrustX uses a **Factory Pattern** for social media connectors:

```
ConnectorFactory
    ├── TwitterConnector (✅ Implemented)
    ├── RedditConnector (✅ Implemented)
    ├── TikTokConnector (✅ Implemented)
    ├── FacebookConnector (🚧 Coming Soon)
    ├── InstagramConnector (🚧 Coming Soon)
    ├── LinkedInConnector (🚧 Coming Soon)
    └── YouTubeConnector (🚧 Coming Soon)
```

**Key Files:**
- `server/src/services/connectors/ConnectorFactory.js` - Factory for creating connectors
- `server/src/services/connectors/BaseConnector.js` - Abstract base class
- `server/src/services/connectors/TwitterConnector.js` - Example implementation
- `server/src/services/DataSyncService.js` - Orchestrates syncing

---

## Current Implementation

### ✅ Working Platforms

**1. Twitter (X)**
- Uses Twitter API v2
- OAuth 2.0 authentication
- Real-time mention fetching
- Sentiment analysis via Gemini AI

**2. Reddit**
- Reddit API
- OAuth authentication
- Subreddit monitoring
- Comment tracking

**3. TikTok**
- TikTok Research API
- OAuth 2.0
- Video mention tracking
- Hashtag monitoring

### 🚧 Coming Soon

- Facebook (Meta Graph API)
- Instagram (Instagram Graph API)
- LinkedIn (LinkedIn API)
- YouTube (YouTube Data API v3)

---

## Platform Integration Steps

### Step 1: Register Application

Each platform requires app registration:

**Facebook/Instagram:**
1. Go to https://developers.facebook.com/apps
2. Create New App → Business type
3. Add "Facebook Login" and "Instagram Graph API"
4. Get App ID and App Secret
5. Configure OAuth redirect URI: `https://yourdomain.com/api/oauth/callback/facebook`

**LinkedIn:**
1. Go to https://www.linkedin.com/developers/apps
2. Create New App
3. Request "Marketing Developer Platform" access
4. Get Client ID and Client Secret
5. Add redirect URL: `https://yourdomain.com/api/oauth/callback/linkedin`

**YouTube:**
1. Go to https://console.cloud.google.com
2. Create Project → Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Get Client ID and Client Secret
5. Add redirect URI: `https://yourdomain.com/api/oauth/callback/youtube`

---

### Step 2: Environment Variables

Add to `.env`:

```bash
# Facebook
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/oauth/callback/facebook

# Instagram (uses Facebook credentials)
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret

# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://yourdomain.com/api/oauth/callback/linkedin

# YouTube (uses Google credentials)
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/oauth/callback/youtube
```

---

### Step 3: Create Connector Class

**File:** `server/src/services/connectors/FacebookConnector.js`

```javascript
const BaseConnector = require('./BaseConnector');
const axios = require('axios');

class FacebookConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.apiVersion = 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Test connection to Facebook API
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: { 'Authorization': `Bearer ${this.credentials.accessToken}` }
      });

      return {
        success: true,
        message: `Connected to Facebook as ${response.data.name}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Fetch mentions from Facebook
   * @param {Object} options - { since: Date, limit: number }
   */
  async fetchMentions(options = {}) {
    const mentions = [];
    const { since, limit = 100 } = options;

    try {
      // 1. Search Posts mentioning brand
      const searchUrl = `${this.baseUrl}/search`;
      const searchParams = {
        q: this.searchParams.keywords.join(' OR '),
        type: 'post',
        access_token: this.credentials.accessToken,
        limit: limit,
        fields: 'id,message,created_time,from,likes.summary(true),comments.summary(true),shares'
      };

      if (since) {
        searchParams.since = Math.floor(since.getTime() / 1000);
      }

      const response = await axios.get(searchUrl, { params: searchParams });

      // 2. Transform to standard format
      for (const post of response.data.data || []) {
        mentions.push({
          platform_id: post.id,
          platform: 'facebook',
          author: post.from?.name || 'Unknown',
          author_id: post.from?.id,
          text: post.message || '',
          url: `https://facebook.com/${post.id}`,
          created_at: new Date(post.created_time),
          engagement: {
            likes: post.likes?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.count || 0
          },
          metadata: {
            post_type: 'post',
            raw_data: post
          }
        });
      }

      return mentions;

    } catch (error) {
      console.error('[FacebookConnector] Fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * OAuth authorization URL
   */
  static getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
      state: state,
      scope: 'pages_read_engagement,pages_manage_posts,pages_read_user_content'
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  /**
   * Exchange code for access token
   */
  static async exchangeCodeForToken(code) {
    const response = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
        code: code
      }
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  }
}

module.exports = FacebookConnector;
```

---

### Step 4: Register Connector in Factory

**File:** `server/src/services/connectors/ConnectorFactory.js`

```javascript
const TwitterConnector = require('./TwitterConnector');
const RedditConnector = require('./RedditConnector');
const TikTokConnector = require('./TikTokConnector');
const FacebookConnector = require('./FacebookConnector'); // Add this

class ConnectorFactory {
  static SUPPORTED_PLATFORMS = ['twitter', 'reddit', 'tiktok', 'facebook']; // Add 'facebook'

  static create(platform, config) {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return new TwitterConnector(config);
      case 'reddit':
        return new RedditConnector(config);
      case 'tiktok':
        return new TikTokConnector(config);
      case 'facebook':
        return new FacebookConnector(config); // Add this
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  static isSupported(platform) {
    return this.SUPPORTED_PLATFORMS.includes(platform.toLowerCase());
  }
}

module.exports = ConnectorFactory;
```

---

### Step 5: OAuth Routes

**File:** `server/src/api/routes/oauth/facebook.js`

```javascript
const express = require('express');
const router = express.Router();
const FacebookConnector = require('../../../services/connectors/FacebookConnector');
const { query } = require('../../../infrastructure/database/db');
const authenticate = require('../../middleware/auth');

// Step 1: Redirect to Facebook OAuth
router.get('/auth/facebook', authenticate, (req, res) => {
  const state = Buffer.from(JSON.stringify({
    userId: req.user.id,
    tenantId: req.user.tenant_id,
    timestamp: Date.now()
  })).toString('base64');

  const authUrl = FacebookConnector.getAuthUrl(state);
  res.redirect(authUrl);
});

// Step 2: OAuth callback
router.get('/oauth/callback/facebook', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/settings/social-listening?error=' + error);
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId, tenantId } = stateData;

    // Exchange code for token
    const tokens = await FacebookConnector.exchangeCodeForToken(code);

    // Create source in database
    await query(
      `INSERT INTO sl_sources (tenant_id, platform, name, connection_type, config, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tenantId,
        'facebook',
        'Facebook Page',
        'oauth',
        JSON.stringify({
          credentials: {
            accessToken: tokens.accessToken,
            tokenType: 'Bearer',
            expiresAt: new Date(Date.now() + tokens.expiresIn * 1000)
          },
          searchParams: {
            keywords: ['your-brand-name']
          }
        }),
        'connected'
      ]
    );

    res.redirect('/settings/social-listening?success=facebook_connected');
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.redirect('/settings/social-listening?error=oauth_failed');
  }
});

module.exports = router;
```

**Register routes in `server/index.js`:**

```javascript
app.use('/api', require('./src/api/routes/oauth/facebook'));
```

---

### Step 6: Update Frontend

**File:** `client/src/components/social-listening/tabs/SourcesTab.jsx`

Update platform click handler:

```javascript
onClick={() => {
  if (!platform.available) {
    alert(`${platform.name} integration coming soon! 🚀\n\nWe're working hard to bring you ${platform.name} connectivity. Stay tuned!`);
    return;
  }

  // For Facebook, redirect to OAuth
  if (platform.id === 'facebook') {
    window.location.href = '/api/auth/facebook';
    return;
  }

  // For other platforms...
  alert(`${platform.name} integration coming soon!\n\nYou'll need:\n- API Key\n- Access Token\n- Account credentials`);
  setShowAddModal(false);
}}
```

---

## Facebook Integration

### Requirements

**API Permissions:**
- `pages_read_engagement` - Read page posts and engagement
- `pages_manage_posts` - Manage page posts
- `pages_read_user_content` - Read user-generated content

**Rate Limits:**
- 200 calls per hour per user
- 600 calls per hour per app

### Implementation

```javascript
// FacebookConnector.js - Complete implementation

async fetchMentions(options = {}) {
  const mentions = [];
  const { since, limit = 100 } = options;

  try {
    // 1. Search public posts
    const posts = await this.searchPosts(since, limit);

    // 2. Get page mentions
    const pageMentions = await this.getPageMentions(since, limit);

    // 3. Combine and transform
    mentions.push(...posts, ...pageMentions);

    return mentions;
  } catch (error) {
    throw error;
  }
}

async searchPosts(since, limit) {
  const response = await axios.get(`${this.baseUrl}/search`, {
    params: {
      q: this.searchParams.keywords.join(' OR '),
      type: 'post',
      access_token: this.credentials.accessToken,
      limit: limit,
      since: since ? Math.floor(since.getTime() / 1000) : undefined,
      fields: 'id,message,created_time,from,likes.summary(true),comments.summary(true),shares,permalink_url'
    }
  });

  return (response.data.data || []).map(post => ({
    platform_id: post.id,
    platform: 'facebook',
    author: post.from?.name || 'Unknown',
    author_id: post.from?.id,
    text: post.message || '',
    url: post.permalink_url,
    created_at: new Date(post.created_time),
    engagement: {
      likes: post.likes?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
      shares: post.shares?.count || 0
    }
  }));
}
```

---

## Instagram Integration

### Requirements

**Instagram Graph API:**
- Uses Facebook App credentials
- Requires Instagram Business or Creator account
- Must be connected to Facebook Page

**Permissions:**
- `instagram_basic` - Basic profile info
- `instagram_content_publish` - Publish content
- `pages_read_engagement` - Read comments/mentions

### Implementation

```javascript
// InstagramConnector.js

class InstagramConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://graph.instagram.com';
  }

  async fetchMentions(options = {}) {
    const mentions = [];
    const { since, limit = 100 } = options;

    try {
      // 1. Get Instagram Business Account ID
      const accountId = await this.getBusinessAccountId();

      // 2. Fetch media mentions
      const mediaMentions = await this.getMediaMentions(accountId, since, limit);

      // 3. Fetch hashtag posts
      const hashtagPosts = await this.getHashtagPosts(accountId, since, limit);

      mentions.push(...mediaMentions, ...hashtagPosts);

      return mentions;
    } catch (error) {
      throw error;
    }
  }

  async getBusinessAccountId() {
    const response = await axios.get(`${this.baseUrl}/me`, {
      params: {
        fields: 'id,username',
        access_token: this.credentials.accessToken
      }
    });
    return response.data.id;
  }

  async getMediaMentions(accountId, since, limit) {
    const response = await axios.get(`${this.baseUrl}/${accountId}/tags`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        access_token: this.credentials.accessToken,
        limit: limit
      }
    });

    return (response.data.data || []).map(media => ({
      platform_id: media.id,
      platform: 'instagram',
      author: 'Instagram User',
      text: media.caption || '',
      url: media.permalink,
      created_at: new Date(media.timestamp),
      engagement: {
        likes: media.like_count || 0,
        comments: media.comments_count || 0
      },
      metadata: {
        media_type: media.media_type,
        media_url: media.media_url
      }
    }));
  }
}
```

---

## LinkedIn Integration

### Requirements

**LinkedIn Marketing Developer Platform:**
- Requires company page admin access
- OAuth 2.0 with refresh tokens

**Permissions:**
- `r_organization_social` - Read organization posts
- `w_organization_social` - Write organization posts
- `rw_organization_admin` - Admin access

### Implementation

```javascript
// LinkedInConnector.js

class LinkedInConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://api.linkedin.com/v2';
  }

  async fetchMentions(options = {}) {
    const mentions = [];
    const { since, limit = 100 } = options;

    try {
      // 1. Get organization URN
      const orgUrn = this.credentials.organizationUrn;

      // 2. Fetch organization posts
      const posts = await this.getOrganizationPosts(orgUrn, since, limit);

      // 3. Fetch mentions in comments
      const commentMentions = await this.getCommentMentions(posts);

      mentions.push(...posts, ...commentMentions);

      return mentions;
    } catch (error) {
      throw error;
    }
  }

  async getOrganizationPosts(orgUrn, since, limit) {
    const response = await axios.get(`${this.baseUrl}/shares`, {
      params: {
        q: 'owners',
        owners: orgUrn,
        count: limit,
        sortBy: 'LAST_MODIFIED'
      },
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    return (response.data.elements || []).map(post => ({
      platform_id: post.id,
      platform: 'linkedin',
      author: post.owner?.localizedName || 'LinkedIn User',
      text: post.text?.text || '',
      url: post.content?.contentEntities?.[0]?.entityLocation || '',
      created_at: new Date(post.created?.time),
      engagement: {
        likes: post.likesSummary?.totalLikes || 0,
        comments: post.commentsSummary?.totalComments || 0,
        shares: post.sharesSummary?.totalShares || 0
      }
    }));
  }
}
```

---

## YouTube Integration

### Requirements

**YouTube Data API v3:**
- Google Cloud Project
- OAuth 2.0 credentials
- API key for search

**Quota:**
- 10,000 units per day (default)
- Search costs 100 units per request

### Implementation

```javascript
// YouTubeConnector.js

class YouTubeConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  async fetchMentions(options = {}) {
    const mentions = [];
    const { since, limit = 50 } = options;

    try {
      // 1. Search for videos mentioning keywords
      const videos = await this.searchVideos(since, limit);

      // 2. Search for comments
      const comments = await this.searchComments(since, limit);

      mentions.push(...videos, ...comments);

      return mentions;
    } catch (error) {
      throw error;
    }
  }

  async searchVideos(since, limit) {
    const response = await axios.get(`${this.baseUrl}/search`, {
      params: {
        part: 'snippet',
        q: this.searchParams.keywords.join(' '),
        type: 'video',
        maxResults: limit,
        publishedAfter: since ? since.toISOString() : undefined,
        key: process.env.YOUTUBE_API_KEY
      }
    });

    // Get video statistics
    const videoIds = response.data.items.map(item => item.id.videoId).join(',');
    const statsResponse = await axios.get(`${this.baseUrl}/videos`, {
      params: {
        part: 'statistics',
        id: videoIds,
        key: process.env.YOUTUBE_API_KEY
      }
    });

    const statsMap = {};
    statsResponse.data.items.forEach(item => {
      statsMap[item.id] = item.statistics;
    });

    return response.data.items.map(item => ({
      platform_id: item.id.videoId,
      platform: 'youtube',
      author: item.snippet.channelTitle,
      author_id: item.snippet.channelId,
      text: `${item.snippet.title} - ${item.snippet.description}`,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      created_at: new Date(item.snippet.publishedAt),
      engagement: {
        views: parseInt(statsMap[item.id.videoId]?.viewCount || 0),
        likes: parseInt(statsMap[item.id.videoId]?.likeCount || 0),
        comments: parseInt(statsMap[item.id.videoId]?.commentCount || 0)
      },
      metadata: {
        thumbnail: item.snippet.thumbnails.high.url,
        channel_id: item.snippet.channelId
      }
    }));
  }

  async searchComments(since, limit) {
    // Search comments across YouTube using comment threads
    const response = await axios.get(`${this.baseUrl}/commentThreads`, {
      params: {
        part: 'snippet',
        searchTerms: this.searchParams.keywords.join(' '),
        maxResults: limit,
        order: 'time',
        key: process.env.YOUTUBE_API_KEY
      }
    });

    return (response.data.items || []).map(item => {
      const comment = item.snippet.topLevelComment.snippet;
      return {
        platform_id: item.id,
        platform: 'youtube',
        author: comment.authorDisplayName,
        author_id: comment.authorChannelId?.value,
        text: comment.textDisplay,
        url: `https://www.youtube.com/watch?v=${comment.videoId}&lc=${item.id}`,
        created_at: new Date(comment.publishedAt),
        engagement: {
          likes: comment.likeCount || 0,
          replies: item.snippet.totalReplyCount || 0
        }
      };
    });
  }
}
```

---

## Testing Guide

### Manual Testing Steps

**1. Test OAuth Flow:**
```bash
# Start dev servers
npm run dev

# Navigate to Sources tab
# Click "Connect Platform"
# Verify OAuth redirect
# Check callback success
# Verify source created in database
```

**2. Test Mention Fetching:**
```bash
# Trigger manual sync
POST /api/social-listening/sources/{sourceId}/sync

# Check mentions in database
SELECT * FROM sl_mentions WHERE source_id = '{sourceId}';

# Verify AI sentiment processing
SELECT * FROM sl_mentions WHERE sentiment IS NOT NULL;
```

**3. Test Auto-Sync:**
```bash
# Enable auto-sync in settings
# Wait for cron job (15 min default)
# Check logs for sync execution
# Verify new mentions appear
```

### Unit Tests

**File:** `server/src/services/connectors/__tests__/FacebookConnector.test.js`

```javascript
const FacebookConnector = require('../FacebookConnector');
const axios = require('axios');

jest.mock('axios');

describe('FacebookConnector', () => {
  let connector;

  beforeEach(() => {
    connector = new FacebookConnector({
      sourceId: 'test-source',
      tenantId: 1,
      credentials: {
        accessToken: 'test-token'
      },
      searchParams: {
        keywords: ['test-brand']
      }
    });
  });

  test('should fetch mentions successfully', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            id: '123',
            message: 'Test post about test-brand',
            created_time: '2026-02-16T12:00:00Z',
            from: { id: 'user1', name: 'Test User' },
            likes: { summary: { total_count: 10 } },
            comments: { summary: { total_count: 5 } },
            shares: { count: 2 }
          }
        ]
      }
    });

    const mentions = await connector.fetchMentions({ limit: 10 });

    expect(mentions).toHaveLength(1);
    expect(mentions[0].platform).toBe('facebook');
    expect(mentions[0].author).toBe('Test User');
    expect(mentions[0].engagement.likes).toBe(10);
  });

  test('should handle API errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('API rate limit exceeded'));

    await expect(connector.fetchMentions()).rejects.toThrow('API rate limit exceeded');
  });
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All connectors implemented and tested
- [ ] OAuth flows working in staging
- [ ] Environment variables set in production
- [ ] Rate limits configured
- [ ] Error handling tested
- [ ] Database migrations run
- [ ] Frontend updated with platform availability

### Production Setup

**1. Update Environment:**
```bash
# Set production OAuth redirect URLs
FACEBOOK_REDIRECT_URI=https://prod.yourdomain.com/api/oauth/callback/facebook
INSTAGRAM_REDIRECT_URI=https://prod.yourdomain.com/api/oauth/callback/instagram
LINKEDIN_REDIRECT_URI=https://prod.yourdomain.com/api/oauth/callback/linkedin
YOUTUBE_REDIRECT_URI=https://prod.yourdomain.com/api/oauth/callback/youtube
```

**2. Update Platform Apps:**
- Add production redirect URLs to each platform's app settings
- Verify app is in production mode (not development)
- Request necessary permissions if not auto-approved

**3. Enable in Frontend:**

Update `SystemSettings.jsx` and `SourcesTab.jsx`:
```javascript
{ name: 'facebook', available: true },
{ name: 'instagram', available: true },
{ name: 'linkedin', available: true },
{ name: 'youtube', available: true }
```

**4. Monitor:**
- Check sync logs for errors
- Monitor API rate limits
- Track mention volume
- Review AI sentiment accuracy

---

## Cost Estimates

### API Pricing (as of 2026)

**Facebook/Instagram:**
- Free up to rate limits
- 200 calls/hour/user

**LinkedIn:**
- Free with Marketing Developer Platform
- Usage tracked per organization

**YouTube:**
- Free tier: 10,000 quota units/day
- Search: 100 units/request = 100 searches/day
- Paid: $0.10 per 1,000 additional units

### Recommendations

**Low Volume (<1K mentions/day):**
- Use free tiers
- 15-minute sync intervals
- Cost: $0/month

**Medium Volume (1K-10K/day):**
- Free tiers + occasional overage
- 5-10 minute sync intervals
- Cost: ~$20-50/month

**High Volume (>10K/day):**
- Paid API tiers required
- Real-time webhooks where available
- Cost: $200-500/month

---

## Support Resources

### Documentation Links

- **Facebook Graph API:** https://developers.facebook.com/docs/graph-api
- **Instagram Graph API:** https://developers.facebook.com/docs/instagram-api
- **LinkedIn API:** https://learn.microsoft.com/en-us/linkedin/
- **YouTube Data API:** https://developers.google.com/youtube/v3

### Common Issues

**OAuth Errors:**
- Verify redirect URI matches exactly (including protocol)
- Check app is in production mode
- Ensure all permissions requested are approved

**Rate Limit Errors:**
- Implement exponential backoff
- Cache API responses
- Use webhooks where available

**Token Expiration:**
- Implement refresh token flow
- Store expiration dates
- Auto-refresh before expiry

---

## Next Steps

1. **Choose Platform:** Start with Facebook (easiest integration)
2. **Register App:** Complete developer registration
3. **Implement Connector:** Follow code examples above
4. **Test OAuth:** Verify authentication flow works
5. **Test Syncing:** Fetch test mentions
6. **Deploy:** Update production environment
7. **Monitor:** Track performance and errors

**Estimated Time per Platform:**
- Development: 2-3 days
- Testing: 1 day
- Deployment: 0.5 day
- **Total:** ~1 week per platform

---

## 🎉 Ready to Start?

Pick your first platform and follow this guide step-by-step. The architecture is designed to make adding new platforms straightforward!

**Questions?** Refer to the example implementations in:
- `server/src/services/connectors/TwitterConnector.js`
- `server/src/services/connectors/RedditConnector.js`
- `server/src/services/connectors/TikTokConnector.js`
