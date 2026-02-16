# Social Media Listening Enhancement Plan

**Current Status:** 60% Complete
**Target:** 100% Feature Complete
**Timeline:** 6-8 weeks (1 developer)
**Priority:** HIGH (completes core platform offering)

---

## Current Implementation Summary

### ✅ What's Working (60% Complete)

**Platforms (3/7):**
- Twitter/X (OAuth 2.0 PKCE, Search API v2, 180 req/15min)
- Reddit (OAuth 2.0, Subreddit monitoring, 60 req/min)
- TikTok (TikTok for Business API, Video analytics, 100 req/sec)

**Features:**
- 7-tab dashboard (Overview, Mentions, Topics, Influencers, Competitors, Alerts, Sources)
- AI processing pipeline (5 services: Sentiment, Intent, Topics, Entities, Language)
- 30+ REST API endpoints
- Alert engine (5 types: sentiment, keyword, influencer, volume spike, competitor)
- Crisis detection with AI-powered risk scoring
- Automated data sync (every 15 minutes)
- CTL integration for unified alerting

**Database:**
- 9 tables fully implemented
- All indexes created
- Multi-tenant architecture

---

## 🎯 Enhancement Phases

### **Phase 2A: Complete Platform Coverage**
**Priority:** CRITICAL | **Timeline:** 2-3 weeks | **Effort:** 40 hours

#### Objective
Implement remaining 4 platform connectors to achieve 100% platform coverage.

#### Platforms to Implement

**1. Facebook Connector** (Week 1: Days 1-2)
- **API:** Facebook Graph API v18.0
- **Authentication:** OAuth 2.0 with long-lived tokens
- **Rate Limit:** 200 calls/hour per app
- **Endpoints:**
  - `/me/accounts` - Get managed pages
  - `/{page-id}/posts` - Fetch posts with `{field}` expansion
  - `/{post-id}/comments` - Fetch comments
  - `/{page-id}/insights` - Get page analytics
- **OAuth Scopes:**
  - `pages_read_engagement` - Read page content
  - `pages_manage_engagement` - Reply to comments/messages
  - `pages_read_user_content` - Read page posts
- **Challenges:**
  - Token refresh (60-day expiry)
  - Multi-page management
  - Comment threading
- **Implementation:**
  ```javascript
  // server/src/services/connectors/FacebookConnector.js
  class FacebookConnector extends BasePlatformConnector {
    async connect() {
      // OAuth 2.0 flow
      // Exchange code for access token
      // Get long-lived token (60 days)
    }

    async fetchMentions(queryKeywords) {
      // Search page posts for keywords
      // Fetch post comments
      // Normalize to standard mention format
    }

    async postResponse(mentionId, content) {
      // POST /{comment-id}/comments
      // POST /{post-id}/comments
    }
  }
  ```

**2. Instagram Connector** (Week 1: Days 3-4)
- **API:** Instagram Graph API
- **Authentication:** OAuth 2.0 via Facebook Login (requires Facebook app)
- **Rate Limit:** 200 calls/hour
- **Endpoints:**
  - `/me/accounts` → `/{page-id}/instagram_accounts` - Get IG business accounts
  - `/{ig-user-id}/media` - Fetch media
  - `/{media-id}/comments` - Fetch comments
  - `/{media-id}/insights` - Get engagement metrics
- **OAuth Scopes:**
  - `instagram_basic` - Basic profile access
  - `instagram_manage_comments` - Read/reply to comments
  - `instagram_manage_insights` - Analytics data
- **Challenges:**
  - Requires Facebook Business account
  - Stories have 24-hour expiry
  - No keyword search API (must monitor own account)
- **Implementation:**
  ```javascript
  // server/src/services/connectors/InstagramConnector.js
  class InstagramConnector extends BasePlatformConnector {
    async connect() {
      // OAuth via Facebook Login
      // Get Instagram business account ID
      // Store long-lived token
    }

    async fetchMentions(queryKeywords) {
      // Fetch own account media
      // Filter comments for keywords/mentions
      // Fetch tagged posts (limited)
      // Normalize to standard format
    }

    async postResponse(mentionId, content) {
      // POST /{comment-id}/replies
    }
  }
  ```

**3. LinkedIn Connector** (Week 2: Days 1-2)
- **API:** LinkedIn API v2
- **Authentication:** OAuth 2.0
- **Rate Limit:** Varies by membership tier (throttling applies)
- **Endpoints:**
  - `/me` - Get profile
  - `/organizations/{id}/ugcPosts` - Fetch company posts
  - `/ugcPosts/{id}/comments` - Fetch comments
  - `/shares?q=owners&owners={id}` - Fetch shares
  - `/analyticsV2` - Analytics data
- **OAuth Scopes:**
  - `r_organization_social` - Read company posts
  - `w_organization_social` - Post as company
  - `rw_organization_admin` - Manage company page
- **Challenges:**
  - No public keyword search API
  - Must monitor own company page
  - Rate limits vary by account type
  - UGC posts API (newer version)
- **Implementation:**
  ```javascript
  // server/src/services/connectors/LinkedInConnector.js
  class LinkedInConnector extends BasePlatformConnector {
    async connect() {
      // OAuth 2.0 flow
      // Get company page URN
      // Store access token (60-day expiry)
    }

    async fetchMentions(queryKeywords) {
      // Fetch company UGC posts
      // Filter for keywords/mentions
      // Fetch post comments
      // Normalize to standard format
    }

    async postResponse(mentionId, content) {
      // POST /ugcPosts/{id}/comments
    }
  }
  ```

**4. YouTube Connector** (Week 2: Days 3-4)
- **API:** YouTube Data API v3
- **Authentication:** OAuth 2.0
- **Rate Limit:** 10,000 quota units/day (1 query = 100 units)
- **Endpoints:**
  - `/search?q={keywords}&type=video` - Search videos
  - `/videos?id={id}` - Get video details
  - `/commentThreads?videoId={id}` - Fetch comments
  - `/channels?mine=true` - Get own channel
- **OAuth Scopes:**
  - `youtube.readonly` - Read public data
  - `youtube.force-ssl` - Manage videos/comments
- **Challenges:**
  - Quota limits (optimize queries)
  - Comment threading (replies to replies)
  - Video transcription not included (would need additional API)
- **Implementation:**
  ```javascript
  // server/src/services/connectors/YouTubeConnector.js
  class YouTubeConnector extends BasePlatformConnector {
    async connect() {
      // OAuth 2.0 flow
      // Get channel ID
      // Store refresh token
    }

    async fetchMentions(queryKeywords) {
      // Search videos by keywords
      // Fetch video comments
      // Monitor own channel
      // Normalize to standard format
    }

    async postResponse(mentionId, content) {
      // POST /comments
    }
  }
  ```

#### Implementation Checklist

**Week 1:**
- [ ] Day 1-2: FacebookConnector implementation
  - [ ] OAuth 2.0 flow
  - [ ] Page connection
  - [ ] Fetch posts/comments
  - [ ] Response posting
  - [ ] Unit tests (10 tests)

- [ ] Day 3-4: InstagramConnector implementation
  - [ ] OAuth via Facebook
  - [ ] Business account connection
  - [ ] Media/comment fetching
  - [ ] Response posting
  - [ ] Unit tests (10 tests)

**Week 2:**
- [ ] Day 1-2: LinkedInConnector implementation
  - [ ] OAuth 2.0 flow
  - [ ] Company page connection
  - [ ] UGC posts/comments fetching
  - [ ] Response posting
  - [ ] Unit tests (10 tests)

- [ ] Day 3-4: YouTubeConnector implementation
  - [ ] OAuth 2.0 flow
  - [ ] Channel connection
  - [ ] Video/comment fetching
  - [ ] Response posting
  - [ ] Unit tests (10 tests)

**Week 3:**
- [ ] Day 1: Update ConnectorFactory.js to register new connectors
- [ ] Day 2: Update SourcesTab UI to show all 7 platforms
- [ ] Day 3: Integration testing (all platforms)
- [ ] Day 4: Update documentation
- [ ] Day 5: Deploy to staging for QA

#### Files to Create/Modify

**New Files:**
```
server/src/services/connectors/FacebookConnector.js      (400 lines)
server/src/services/connectors/InstagramConnector.js     (400 lines)
server/src/services/connectors/LinkedInConnector.js      (400 lines)
server/src/services/connectors/YouTubeConnector.js       (400 lines)
server/src/services/connectors/__tests__/FacebookConnector.test.js
server/src/services/connectors/__tests__/InstagramConnector.test.js
server/src/services/connectors/__tests__/LinkedInConnector.test.js
server/src/services/connectors/__tests__/YouTubeConnector.test.js
```

**Modified Files:**
```
server/src/services/connectors/ConnectorFactory.js
client/src/components/social-listening/SourcesTab.jsx
docs/SOCIAL_LISTENING_PLATFORMS.md (NEW)
```

---

### **Phase 7: Export Functionality**
**Priority:** HIGH | **Timeline:** 1 week | **Effort:** 16 hours

#### Objective
Enable users to export mentions and analytics in CSV and PDF formats.

#### Features

**1. CSV Export** (Days 1-2)
- **Endpoints:**
  - `POST /api/v1/social-listening/export/mentions/csv` - Export mentions
  - `POST /api/v1/social-listening/export/analytics/csv` - Export analytics

- **Mention CSV Columns:**
  ```
  ID, Date, Platform, Author, Content, Sentiment, Sentiment Score,
  Intent, Topics, Likes, Comments, Shares, Reach, URL
  ```

- **Analytics CSV Columns:**
  ```
  Date, Total Mentions, Positive, Neutral, Negative, Avg Sentiment,
  Top Topic, Platform Breakdown
  ```

- **Implementation:**
  ```javascript
  // server/src/api/routes/social_listening/export.js
  router.post('/mentions/csv', authenticate, async (req, res) => {
    const { filters, dateRange } = req.body;
    const mentions = await fetchMentions(filters);
    const csv = convertToCSV(mentions);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mentions.csv"');
    res.send(csv);
  });
  ```

**2. PDF Export** (Days 3-4)
- **Library:** Use `pdfkit` or `puppeteer` for generation
- **Report Types:**
  - **Executive Summary**: KPIs, charts, top mentions
  - **Detailed Report**: Full mention list with analytics
  - **Crisis Report**: Crisis timeline with risk score

- **Implementation:**
  ```javascript
  // server/src/services/ReportGenerator.js
  class ReportGenerator {
    async generateExecutiveSummary(tenantId, dateRange) {
      const data = await fetchAnalytics(tenantId, dateRange);
      const pdf = new PDFDocument();

      // Add cover page
      // Add KPI section
      // Add charts (sentiment trend, volume trend)
      // Add top mentions

      return pdf;
    }
  }
  ```

**3. Frontend Integration** (Day 5)
- Add "Export" button to MentionsTab (CSV)
- Add "Generate Report" button to OverviewTab (PDF)
- Show download progress indicator
- Handle large exports (chunked download)

#### Files to Create/Modify

**New Files:**
```
server/src/api/routes/social_listening/export.js        (200 lines)
server/src/services/ReportGenerator.js                  (400 lines)
```

**Modified Files:**
```
client/src/components/social-listening/MentionsTab.jsx
client/src/components/social-listening/OverviewTab.jsx
server/src/api/routes/social_listening/index.js
```

---

### **Phase 8: Real-Time Updates**
**Priority:** MEDIUM | **Timeline:** 1 week | **Effort:** 20 hours

#### Objective
Replace polling with real-time WebSocket/SSE updates for instant mention delivery.

#### Architecture

**1. WebSocket Server** (Days 1-2)
- **Library:** `socket.io` or `ws`
- **Rooms:** Tenant-based isolation
- **Events:**
  - `mention:new` - New mention received
  - `mention:updated` - Mention status/sentiment changed
  - `alert:triggered` - Alert triggered
  - `sync:started` - Data sync started
  - `sync:completed` - Data sync completed

- **Implementation:**
  ```javascript
  // server/src/services/WebSocketService.js
  class WebSocketService {
    constructor(io) {
      this.io = io;
    }

    emitToTenant(tenantId, event, data) {
      this.io.to(`tenant:${tenantId}`).emit(event, data);
    }

    broadcastNewMention(tenantId, mention) {
      this.emitToTenant(tenantId, 'mention:new', mention);
    }
  }
  ```

**2. SSE Integration** (Days 3-4)
- **Endpoint:** `GET /api/v1/social-listening/stream`
- **Events:** Same as WebSocket
- **Fallback:** Use SSE for clients without WebSocket support

- **Implementation:**
  ```javascript
  // server/src/api/routes/social_listening/stream.js
  router.get('/stream', authenticate, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const eventStream = createEventStream(req.user.tenant_id);
    eventStream.pipe(res);
  });
  ```

**3. Frontend Integration** (Day 5)
- Update MentionsTab to listen for `mention:new`
- Update OverviewTab to listen for `sync:completed` (refresh KPIs)
- Add toast notifications for new mentions
- Show live "Syncing..." indicator

#### Files to Create/Modify

**New Files:**
```
server/src/services/WebSocketService.js                  (200 lines)
server/src/api/routes/social_listening/stream.js        (150 lines)
client/src/hooks/useSocialListeningStream.js            (100 lines)
```

**Modified Files:**
```
server/index.js (add Socket.io initialization)
client/src/components/social-listening/MentionsTab.jsx
client/src/components/social-listening/OverviewTab.jsx
server/src/services/DataSyncService.js (emit WebSocket events)
```

---

### **Phase 9: Response Posting to Platforms**
**Priority:** HIGH | **Timeline:** 1 week | **Effort:** 16 hours

#### Objective
Enable users to post responses directly to social platforms from the dashboard.

#### Implementation

**1. Connector Methods** (Days 1-3)
- Add `postResponse(mentionId, content)` to all 7 connectors
- Handle platform-specific formats (character limits, media attachments)
- Rate limit enforcement
- Error handling (permission errors, invalid mentions)

- **Platform Specifics:**
  - **Twitter:** 280 character limit, media attachments
  - **Reddit:** Markdown support, nested replies
  - **TikTok:** Comment replies only (no direct messages)
  - **Facebook:** Rich text, media attachments
  - **Instagram:** 2,200 character limit
  - **LinkedIn:** 3,000 character limit
  - **YouTube:** 10,000 character limit

**2. Backend API** (Day 4)
- **Endpoint:** `POST /api/v1/social-listening/mentions/:id/respond`
- **Validation:**
  - Check mention status (not already responded)
  - Verify platform connection active
  - Validate content length
  - Check rate limits

- **Implementation:**
  ```javascript
  // server/src/api/routes/social_listening/responses.js
  router.post('/mentions/:id/respond', authenticate, async (req, res) => {
    const { content, mediaUrls } = req.body;
    const mention = await getMention(id, tenantId);
    const connector = ConnectorFactory.getConnector(mention.platform);

    const response = await connector.postResponse(mention.external_id, content);

    await saveMentionResponse(mention.id, content, response.external_id);

    res.json({ success: true, response });
  });
  ```

**3. Frontend Integration** (Day 5)
- Update ResponseDialog to actually post (not just draft)
- Show posting status (posting, success, error)
- Display posted response in mention detail
- Track response metrics

#### Files to Modify

**Modified Files:**
```
server/src/services/connectors/TwitterConnector.js
server/src/services/connectors/RedditConnector.js
server/src/services/connectors/TikTokConnector.js
server/src/services/connectors/FacebookConnector.js
server/src/services/connectors/InstagramConnector.js
server/src/services/connectors/LinkedInConnector.js
server/src/services/connectors/YouTubeConnector.js
server/src/api/routes/social_listening/responses.js
client/src/components/social-listening/ResponseDialog.jsx
```

---

### **Phase 10: Advanced Workflow Automation**
**Priority:** LOW | **Timeline:** 2 weeks | **Effort:** 40 hours

#### Objective
Automate repetitive tasks based on mention triggers.

#### Features

**1. Workflow Builder** (Week 1)
- **Triggers:**
  - New mention received
  - Mention sentiment threshold
  - Mention from influencer
  - Volume spike detected
  - Crisis detected

- **Conditions:**
  - Sentiment = X
  - Platform = X
  - Author followers > X
  - Keywords contain X
  - Time of day

- **Actions:**
  - Auto-respond with template
  - Create ticket in CTL
  - Send email notification
  - Assign to team member
  - Tag mention
  - Change status
  - Escalate to crisis team

**2. Template Library** (Week 2)
- Pre-defined response templates
- Variable substitution ({{author}}, {{brand}}, etc.)
- Multi-language templates
- A/B testing templates

**3. UI Components**
- Workflow builder interface (drag-drop nodes)
- Template editor
- Workflow execution logs

---

## Testing Strategy

### Unit Tests
- 10 tests per connector (70 tests total)
- Export service tests (10 tests)
- WebSocket service tests (8 tests)
- Response posting tests (14 tests)

### Integration Tests
- End-to-end platform connection flow (7 tests)
- Mention sync and AI processing flow (5 tests)
- Alert triggering and action flow (5 tests)
- Export generation flow (4 tests)

### E2E Tests (Playwright)
- Platform OAuth connection
- Mention fetching and display
- Response posting
- Export download
- Real-time update reception

---

## Deployment Plan

### Phase 2A Deployment (Platform Connectors)
1. Deploy to staging
2. Test OAuth flows for all 4 new platforms
3. Run integration tests
4. Deploy to production
5. Update user documentation

### Phase 7 Deployment (Export)
1. Test large exports (10k+ mentions)
2. Verify PDF rendering
3. Deploy to production

### Phase 8 Deployment (Real-Time)
1. Load test WebSocket server (1000 concurrent connections)
2. Deploy WebSocket server
3. Update client to use WebSocket
4. Monitor connection stability

### Phase 9 Deployment (Response Posting)
1. Test response posting on all platforms
2. Verify rate limit handling
3. Deploy to production

---

## Success Metrics

**Phase 2A:**
- [x] 7/7 platforms fully functional
- [x] OAuth connection success rate > 95%
- [x] Data sync success rate > 99%

**Phase 7:**
- [x] Export completion time < 30s for 10k mentions
- [x] PDF generation success rate > 98%

**Phase 8:**
- [x] WebSocket connection uptime > 99.5%
- [x] Mention delivery latency < 5s

**Phase 9:**
- [x] Response posting success rate > 95%
- [x] Response delivery latency < 10s

**Phase 10:**
- [x] Workflow execution success rate > 98%
- [x] Template response rate > 80%

---

## Timeline Summary

| Phase | Priority | Timeline | Effort | Status |
|-------|----------|----------|--------|--------|
| 2A: Platform Connectors | CRITICAL | 2-3 weeks | 40h | ⏳ Not Started |
| 7: Export | HIGH | 1 week | 16h | ⏳ Not Started |
| 8: Real-Time | MEDIUM | 1 week | 20h | ⏳ Not Started |
| 9: Response Posting | HIGH | 1 week | 16h | ⏳ Not Started |
| 10: Workflow Automation | LOW | 2 weeks | 40h | ⏳ Not Started |

**Total Time to 100% Complete:** 7-9 weeks (1 developer)
**Total Effort:** ~132 hours

---

## Budget Estimate

**Development:**
- Developer rate: $75/hr
- Total hours: 132h
- **Development cost: $9,900**

**API Costs (Monthly):**
- Twitter API: $0-100/month (depending on volume)
- Reddit API: Free
- TikTok API: Free (business accounts only)
- Facebook API: Free
- Instagram API: Free
- LinkedIn API: Free
- YouTube API: Free
- **Total API costs: $0-100/month**

**Infrastructure:**
- WebSocket server: $20/month (increased instance size)
- Storage (PDF exports): $10/month
- **Total infra costs: $30/month**

**Grand Total:**
- One-time development: $9,900
- Recurring monthly: $30-130

---

## Risk Assessment

### High Risk
- **Platform API Changes:** Social platforms frequently update APIs
  - **Mitigation:** Use official SDKs, monitor changelog, automated testing

- **Rate Limits:** Hitting rate limits with high-volume accounts
  - **Mitigation:** Implement exponential backoff, queue system, paid tiers

### Medium Risk
- **OAuth Token Expiry:** Tokens expire requiring re-authentication
  - **Mitigation:** Auto-refresh mechanism, user notifications

- **Data Volume:** Large accounts (millions of followers) generate massive data
  - **Mitigation:** Pagination, background processing, data retention policies

### Low Risk
- **WebSocket Scalability:** Many concurrent connections
  - **Mitigation:** Horizontal scaling, load balancer

---

## Conclusion

This enhancement plan will bring Social Media Listening from **60% to 100% complete**, making it a **market-leading feature** with:
- **7 major platform integrations**
- **Real-time monitoring and alerts**
- **AI-powered insights and crisis detection**
- **Automated workflows and responses**
- **Comprehensive analytics and reporting**

**Recommended Approach:** Start with **Phase 2A (Platform Connectors)** as it provides the most immediate value (40% completion jump). Then prioritize **Phase 7 (Export)** and **Phase 9 (Response Posting)** as these are high-value user-facing features.

**ROI:** This feature will differentiate VTrustX from competitors, increase customer retention, and enable upsell opportunities (premium tiers with higher rate limits, more platforms).
