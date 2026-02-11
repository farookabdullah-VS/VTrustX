# Social Media Marketing Module - Implementation Guide

## Overview
A comprehensive Social Media Marketing module has been developed for RayiX, enabling multi-platform campaign management with persona targeting integration.

## Files Created

### Frontend Components
1. **`client/src/components/SocialMediaMarketing.jsx`** (Main Module)
   - Campaign management dashboard
   - Multi-platform support (Facebook, Instagram, Twitter, LinkedIn, YouTube)
   - Persona targeting integration
   - Content calendar (placeholder)
   - Analytics dashboard
   - Content library

### Backend API   
2. **`server/src/api/routes/social_media.js`**
   - Campaign CRUD operations
   - Post management
   - Analytics endpoints

### Database Migration
3. **`server/scripts/migrate_social_media.js`**
   - Creates 4 tables:
     - `social_media_campaigns`
     - `social_media_posts`
     - `social_media_content_library`
     - `social_media_analytics`

## Features Implemented

### 1. Campaign Management
✅ **Create Campaign Wizard** (4-step process):
- Step 1: Basic Info (name, description, dates, objective)
- Step 2: Platform Selection (visual cards for each platform)
- Step 3: Targeting (PersonaSelector integration)
- Step 4: Review & Create

✅ **Campaign Dashboard**:
- Grid view of all campaigns
- Status filtering (all, active, scheduled, completed)
- Campaign cards with:
  - Platform icons
  - Stats (posts, reach, engagement)
  - Quick actions (View, Edit, Duplicate)

### 2. Multi-Platform Support
Supported Platforms:
- 📘 Facebook
- 📷 Instagram
- 🐦 Twitter
- 💼 LinkedIn
- 📹 YouTube

Each platform has:
- Unique branding color
- Platform-specific icon
- Visual selection interface

### 3. Persona Targeting Integration
✅ **PersonaSelector Component** integrated
- Select target personas for campaigns
- View audience statistics in real-time
- Preview persona demographics
- Calculate total reach and engagement

### 4. Analytics Dashboard
Metrics tracked:
- Total Reach
- Engagement Rate
- Clicks
- Conversions

Displays:
- Trend indicators (+/- percentages)
- Color-coded performance
- Placeholder for charts

### 5. Content Calendar
- Placeholder for calendar view
- Scheduled posts management
- Visual timeline (coming soon)

### 6. Content Library
- Upload and manage media assets
- Tag-based organization
- Thumbnail previews
- File metadata tracking

## Database Schema

### social_media_campaigns
```sql
- id (UUID, PK)
- tenant_id (VARCHAR)
- name (VARCHAR)
- description (TEXT)
- platforms (JSONB) - Array of platform IDs
- target_personas (JSONB) - Array of persona IDs
- status (VARCHAR) - draft, active, scheduled, completed
- start_date, end_date (DATE)
- budget (DECIMAL)
- objective (VARCHAR) - awareness, engagement, traffic, conversions, leads
- posts_count, reach, engagement_rate (metrics)
- created_by, created_at, updated_at
```

### social_media_posts
```sql
- id (UUID, PK)
- campaign_id (UUID, FK)
- content (TEXT)
- platforms (JSONB)
- media_urls (JSONB)
- scheduled_time, published_time (TIMESTAMP)
- status (VARCHAR)
- likes, comments, shares, reach (metrics)
- created_at, updated_at
```

### social_media_content_library
```sql
- id (UUID, PK)
- tenant_id (VARCHAR)
- name, type, url, thumbnail_url
- file_size, dimensions
- tags (JSONB)
- created_by, created_at
```

### social_media_analytics
```sql
- id (UUID, PK)
- campaign_id, post_id (UUID, FK)
- platform (VARCHAR)
- metric_date (DATE)
- impressions, reach, engagement, clicks, conversions
- spend (DECIMAL)
- created_at
```

## API Endpoints

### Campaigns
- `GET /api/v1/social-media/campaigns` - List all campaigns
- `GET /api/v1/social-media/campaigns/:id` - Get single campaign
- `POST /api/v1/social-media/campaigns` - Create campaign
- `PUT /api/v1/social-media/campaigns/:id` - Update campaign
- `DELETE /api/v1/social-media/campaigns/:id` - Delete campaign

### Posts
- `GET /api/v1/social-media/campaigns/:campaignId/posts` - List posts
- `POST /api/v1/social-media/posts` - Create post

### Analytics
- `GET /api/v1/social-media/analytics/overview` - Overall analytics
- `GET /api/v1/social-media/analytics/campaigns/:id` - Campaign analytics

## Integration Steps

### 1. Run Database Migration
```bash
cd d:\RayiX\server
$env:DB_PORT="5432"; $env:DB_PASSWORD="RayiX@2030"; $env:DB_NAME="rayix-db"; node scripts/migrate_social_media.js
```

### 2. Update App.jsx
Add the import:
```javascript
import { SocialMediaMarketing } from './components/SocialMediaMarketing';
```

Add to view rendering:
```javascript
{view === 'social-media-marketing' && <SocialMediaMarketing />}
```

### 3. Update Sidebar.jsx
Add to the personas section items array:
```javascript
{ id: 'social-media-marketing', label: 'Social Media Marketing', icon: <Share2 size={16} /> }
```

Make sure to import Share2:
```javascript
import { ..., Share2 } from 'lucide-react';
```

### 4. Deploy
```powershell
.\deploy.ps1
```

## Usage Guide

### Creating a Campaign

1. **Navigate** to Social Media Marketing from sidebar
2. **Click** "Create Campaign" button
3. **Step 1 - Basic Info**:
   - Enter campaign name
   - Add description
   - Set start/end dates
   - Choose objective (awareness, engagement, etc.)
4. **Step 2 - Platforms**:
   - Click platform cards to select/deselect
   - Multiple platforms can be selected
5. **Step 3 - Targeting**:
   - Use PersonaSelector to choose target personas
   - View audience statistics
   - Set budget (optional)
6. **Step 4 - Review**:
   - Review all settings
   - Click "Create Campaign"

### Managing Campaigns

- **Filter**: Use status filters (all, active, scheduled, completed)
- **View**: Click "View" button on campaign card
- **Edit**: Click edit icon
- **Duplicate**: Click copy icon to clone campaign

### Analytics

- Navigate to Analytics tab
- View overall metrics:
  - Total Reach
  - Engagement Rate
  - Clicks
  - Conversions
- Each metric shows trend (+/- percentage)

## Design Features

### Visual Excellence
✅ Modern gradient backgrounds
✅ Platform-specific branding colors
✅ Smooth hover animations
✅ Progress indicators
✅ Status badges with color coding
✅ Responsive grid layouts

### User Experience
✅ 4-step wizard with progress tracking
✅ Visual platform selection
✅ Real-time audience stats
✅ Inline editing capabilities
✅ Quick action buttons
✅ Empty state messaging

### Accessibility
✅ Semantic HTML structure
✅ Clear labels and descriptions
✅ Keyboard navigation support
✅ Color contrast compliance
✅ Icon + text labels

## Future Enhancements

### Phase 2 (Recommended)
1. **Content Calendar**:
   - Full calendar view
   - Drag-and-drop scheduling
   - Multi-day campaigns
   - Recurring posts

2. **Post Composer**:
   - Rich text editor
   - Image/video upload
   - Preview for each platform
   - Hashtag suggestions
   - Emoji picker

3. **Advanced Analytics**:
   - Interactive charts (Chart.js/Recharts)
   - Date range filtering
   - Export to PDF/Excel
   - Comparative analysis
   - ROI calculator

4. **Social Listening**:
   - Keyword monitoring
   - Sentiment analysis
   - Competitor tracking
   - Trend detection

5. **Automation**:
   - Auto-posting scheduler
   - Best time to post AI
   - Content recycling
   - Response templates

6. **Platform Integration**:
   - OAuth connections to social platforms
   - Direct publishing
   - Real-time metrics sync
   - Comment management

### Phase 3 (Advanced)
1. **AI Content Generation**:
   - Auto-generate post copy
   - Image generation
   - Hashtag optimization
   - A/B testing suggestions

2. **Influencer Management**:
   - Influencer database
   - Campaign collaboration
   - Performance tracking

3. **Social Commerce**:
   - Product tagging
   - Shoppable posts
   - Conversion tracking

## Technical Notes

### State Management
- Uses React hooks (useState, useEffect)
- Local state for modal and form data
- API calls with axios

### Styling
- Inline styles for maximum flexibility
- Consistent color palette
- Responsive design patterns
- Mobile-first approach

### Performance
- Lazy loading for large lists
- Optimized re-renders
- Efficient data fetching
- Indexed database queries

### Security
- Authentication required (authenticate middleware)
- Tenant isolation
- Input validation
- SQL injection prevention (parameterized queries)

## Testing Checklist

### Frontend
- [ ] Campaign creation wizard (all 4 steps)
- [ ] Platform selection (multiple platforms)
- [ ] Persona targeting integration
- [ ] Campaign filtering
- [ ] Campaign cards display
- [ ] Analytics metrics display
- [ ] Responsive design (mobile/tablet/desktop)

### Backend
- [ ] Create campaign API
- [ ] List campaigns API
- [ ] Update campaign API
- [ ] Delete campaign API
- [ ] Create post API
- [ ] Analytics API
- [ ] Tenant isolation

### Database
- [ ] Migration script execution
- [ ] Table creation
- [ ] Index creation
- [ ] Demo data insertion
- [ ] Foreign key constraints

## Support

### Component Props

**SocialMediaMarketing** (No props - standalone component)

**CampaignCard**
```javascript
<CampaignCard 
    campaign={object}      // Campaign data
    onRefresh={function}   // Refresh callback
/>
```

**CreateCampaignModal**
```javascript
<CreateCampaignModal 
    onClose={function}     // Close callback
    onSuccess={function}   // Success callback
/>
```

## Deployment Status

**Files Modified**:
- ✅ `server/index.js` - Added social media routes
- ✅ `client/src/components/Sidebar.jsx` - Added Share2 icon import

**Files to Modify** (Manual):
- ⏳ `client/src/components/Sidebar.jsx` - Add menu item to personas section
- ⏳ `client/src/App.jsx` - Add SocialMediaMarketing component

**Database**:
- ⏳ Run migration script

**Deployment**:
- ⏳ Run `.\deploy.ps1`

---

**Implementation Date**: January 15, 2026
**Status**: ✅ Core Development Complete - Integration Pending
**Version**: 1.0.0
