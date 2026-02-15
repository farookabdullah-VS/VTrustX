# Performance Monitoring & CDN Setup Guide

Complete implementation guide for performance monitoring and CDN configuration in VTrustX.

---

## 📊 **Performance Monitoring**

### **Overview**

The performance monitoring system tracks:
- **API Response Times** - Request duration, p95/p99 latency, slow endpoints
- **Database Queries** - Query execution time, slow query detection
- **System Resources** - Memory usage, CPU usage, uptime
- **Frontend Performance** - Page load times, FCP, LCP, API call latency
- **Custom Metrics** - Application-specific measurements

---

## 🚀 **Setup Instructions**

### **Step 1: Run Database Migration**

```bash
cd server
npm run migrate
```

This creates two tables:
- `performance_metrics` - Stores all performance data
- `performance_alerts` - Stores performance degradation alerts

### **Step 2: Configure Environment Variables**

Add to `.env`:

```bash
# Performance Monitoring
PERFORMANCE_TRACKING_ENABLED=true

# Frontend Performance Tracking
VITE_PERFORMANCE_TRACKING=true
```

### **Step 3: Enable Performance Middleware**

**File**: `server/index.js` or `server/src/server.js`

```javascript
const { performanceTracking } = require('./src/api/middleware/performanceTracking');
const performanceRouter = require('./src/api/routes/performance');

// Apply performance tracking middleware (before routes)
app.use(performanceTracking);

// Mount performance API routes
app.use('/api/performance', performanceRouter);
```

### **Step 4: Wrap Database Query Function (Optional)**

For database query tracking, wrap your query function:

**File**: `server/src/infrastructure/database/db.js`

```javascript
const { wrapDatabaseQuery } = require('../api/middleware/performanceTracking');

// Wrap the query function
const originalQuery = pool.query.bind(pool);
const wrappedQuery = wrapDatabaseQuery(originalQuery);

module.exports = {
    query: wrappedQuery,
    // ... other exports
};
```

### **Step 5: Initialize Frontend Tracking**

**File**: `client/src/main.jsx`

```javascript
import performanceTracker from './utils/performanceTracking';

// Initialize performance tracking
if (import.meta.env.VITE_PERFORMANCE_TRACKING === 'true') {
    console.log('[Performance] Tracking enabled');
}

// ... rest of your app initialization
```

### **Step 6: Add Performance Dashboard Route**

**File**: `client/src/routes.jsx` or `client/src/App.jsx`

```javascript
import PerformanceDashboard from './components/PerformanceDashboard';

// Add route
{
    path: '/performance',
    element: <PerformanceDashboard />
}
```

---

## 📈 **Using Performance Monitoring**

### **Backend - Track Custom Metrics**

```javascript
const performanceMonitor = require('./infrastructure/monitoring/PerformanceMonitor');

// Track custom metric
performanceMonitor.trackCustomMetric(
    'email_service',           // category
    'send_time',               // metric name
    emailSendDuration,         // value (ms)
    { recipientCount: 100 }    // metadata
);
```

### **Frontend - Track User Interactions**

```javascript
import { usePerformanceTracking } from './utils/performanceTracking';

function MyComponent() {
    const { trackInteraction } = usePerformanceTracking();

    const handleClick = () => {
        trackInteraction('button_click', 'surveys', 'create_survey', 1);
        // ... rest of your logic
    };
}
```

### **Frontend - Track Component Renders**

```javascript
import { usePerformanceTracking } from './utils/performanceTracking';
import { useEffect } from 'react';

function MyComponent() {
    const { trackComponentRender } = usePerformanceTracking();

    useEffect(() => {
        const startTime = Date.now();

        return () => {
            const renderTime = Date.now() - startTime;
            trackComponentRender('MyComponent', renderTime);
        };
    }, []);
}
```

---

## 🔔 **Performance Alerts**

Alerts are automatically generated when:
- Average response time > 2000ms for 5+ minutes
- Error rate > 5% for any endpoint
- Database queries > 1000ms consistently
- Memory usage > 85%

**View Alerts:**
```bash
GET /api/performance/alerts?resolved=false
```

**Resolve Alert:**
```bash
PUT /api/performance/alerts/:id/resolve
```

---

## 📊 **API Endpoints**

### **Get Metrics Summary**
```
GET /api/performance/metrics
Authorization: Bearer <admin_token>
```

### **Get Statistics**
```
GET /api/performance/statistics?hours=24&tenant_id=1
Authorization: Bearer <admin_token>
```

### **Get Slowest Endpoints**
```
GET /api/performance/slowest?limit=10&hours=24
Authorization: Bearer <admin_token>
```

### **Get Performance Timeline**
```
GET /api/performance/timeline?hours=24&interval=hour
Authorization: Bearer <admin_token>
```

### **Get System Information**
```
GET /api/performance/system
Authorization: Bearer <admin_token>
```

---

## 🌐 **CDN Configuration**

### **Overview**

The CDN system optimizes static asset delivery with:
- **Automatic cache control headers**
- **Multi-provider support** (Cloudflare, CloudFront, Custom)
- **Cache purging API**
- **Asset URL transformation**

### **Step 1: Configure Environment Variables**

Add to `.env`:

```bash
# CDN Configuration
CDN_ENABLED=true
CDN_PROVIDER=cloudflare               # Options: cloudflare, cloudfront, custom
CDN_BASE_URL=https://cdn.yourdomain.com
CDN_ASSET_PATH=/assets

# Cloudflare (if using)
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token

# Custom CDN (if using)
CDN_PURGE_URL=https://your-cdn.com/api/purge
CDN_PURGE_API_KEY=your_api_key
```

### **Step 2: Enable CDN Middleware**

**File**: `server/index.js` or `server/src/server.js`

```javascript
const cdnConfig = require('./src/config/cdn');

// Apply CDN cache middleware (before static files)
app.use(cdnConfig.cacheMiddleware());

// Serve static files
app.use('/assets', express.static('public/assets'));
```

### **Step 3: Use CDN URLs in Frontend**

**File**: `client/vite.config.js`

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
    base: process.env.VITE_CDN_ENABLED === 'true'
        ? process.env.VITE_CDN_BASE_URL
        : '/',
    build: {
        rollupOptions: {
            output: {
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js'
            }
        }
    }
});
```

Add to `.env.production`:

```bash
VITE_CDN_ENABLED=true
VITE_CDN_BASE_URL=https://cdn.yourdomain.com
```

### **Step 4: Build with CDN URLs**

```bash
cd client
npm run build
```

Assets will be built with CDN URLs in production.

---

## 🔄 **CDN Cache Purging**

### **Purge Specific Files**

```javascript
const cdnConfig = require('./config/cdn');

// Purge specific assets
await cdnConfig.purgeCached([
    'assets/logo.png',
    'assets/styles-abc123.css',
    'assets/app-def456.js'
]);
```

### **API Endpoint for Cache Purge**

```
POST /api/cdn/purge
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "paths": [
        "assets/logo.png",
        "assets/styles-abc123.css"
    ]
}
```

---

## 🔧 **Cache Control Headers**

Automatic cache headers by file type:

| File Type | Max-Age | Immutable |
|-----------|---------|-----------|
| Images (jpg, png, svg, webp) | 1 year | ✅ |
| Fonts (woff, woff2, ttf) | 1 year | ✅ |
| Scripts (js, mjs) | 1 year | ✅ |
| Styles (css) | 1 year | ✅ |
| Documents (pdf, doc, xls) | 1 day | ❌ |
| Default | 1 hour | ❌ |

---

## 📦 **Cloudflare Setup (Example)**

1. **Create Cloudflare Account** at https://cloudflare.com
2. **Add Your Domain** to Cloudflare
3. **Get Zone ID**: Dashboard → Overview → Zone ID
4. **Create API Token**:
   - Dashboard → My Profile → API Tokens
   - Create Token → "Edit zone DNS" template
   - Add permissions: Cache Purge
5. **Add to `.env`**:
   ```bash
   CDN_ENABLED=true
   CDN_PROVIDER=cloudflare
   CDN_BASE_URL=https://yourdomain.com
   CLOUDFLARE_ZONE_ID=your_zone_id_here
   CLOUDFLARE_API_TOKEN=your_api_token_here
   ```

---

## 📊 **Performance Dashboard**

Access the performance dashboard at:
```
https://yourdomain.com/performance
```

**Features:**
- Real-time metrics updates (30-second refresh)
- Time range selection (1 hour to 1 week)
- Slowest endpoints table
- System resource monitoring
- Active alerts management
- Performance timeline charts

**Required Role:** `admin` or `super_admin`

---

## 🔍 **Monitoring Best Practices**

### **1. Set Up Alerts**

Monitor key metrics and respond to alerts:
- Response time > 2000ms
- Error rate > 5%
- Memory usage > 85%
- Slow queries > 1000ms

### **2. Review Slowest Endpoints Daily**

Check the slowest endpoints list and optimize:
- Add database indexes
- Optimize queries
- Add caching
- Implement pagination

### **3. Track Custom Business Metrics**

Add custom metrics for business-critical operations:
```javascript
performanceMonitor.trackCustomMetric(
    'business',
    'survey_completion_rate',
    completionRate,
    { surveyId, tenantId }
);
```

### **4. Use CDN for All Static Assets**

Ensure all images, fonts, scripts, and styles are served via CDN:
- Reduces server load
- Improves page load times
- Better geographic distribution

### **5. Monitor Frontend Performance**

Track Core Web Vitals:
- **LCP (Largest Contentful Paint)** - Target: < 2.5s
- **FID (First Input Delay)** - Target: < 100ms
- **CLS (Cumulative Layout Shift)** - Target: < 0.1

---

## 🗄️ **Database Maintenance**

Performance metrics are automatically cleaned up after 30 days. To manually clean:

```sql
-- Delete metrics older than 30 days
SELECT cleanup_old_performance_metrics();

-- Or manually:
DELETE FROM performance_metrics
WHERE timestamp < NOW() - INTERVAL '30 days';
```

To change retention period, update the function in migration file.

---

## 🐛 **Troubleshooting**

### **Issue: Metrics not appearing**

1. Check middleware is applied:
   ```javascript
   app.use(performanceTracking);
   ```

2. Verify migration ran:
   ```bash
   npm run migrate
   ```

3. Check database connection:
   ```bash
   psql -U postgres -d vtrustx_db -c "SELECT COUNT(*) FROM performance_metrics;"
   ```

### **Issue: CDN URLs not working**

1. Verify environment variables:
   ```bash
   echo $CDN_ENABLED
   echo $CDN_BASE_URL
   ```

2. Check build output includes CDN URLs:
   ```bash
   cd client/dist
   grep -r "cdn.yourdomain.com" .
   ```

3. Test CDN connectivity:
   ```bash
   curl -I https://cdn.yourdomain.com/assets/logo.png
   ```

### **Issue: High memory usage**

1. Check for memory leaks in in-memory cache
2. Clear metrics cache:
   ```bash
   curl -X DELETE http://localhost:3000/api/performance/metrics \
     -H "Authorization: Bearer <admin_token>"
   ```

3. Restart server to reset metrics

---

## 📚 **Additional Resources**

- **Performance API Documentation**: `http://localhost:3000/api-docs`
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Web Vitals**: https://web.dev/vitals/
- **Node.js Performance**: https://nodejs.org/api/perf_hooks.html

---

## ✅ **Post-Implementation Checklist**

- [ ] Database migration completed
- [ ] Environment variables configured
- [ ] Performance middleware applied
- [ ] Performance routes mounted
- [ ] Frontend tracking initialized
- [ ] Performance dashboard accessible
- [ ] CDN configured (if using)
- [ ] Cache headers verified
- [ ] Alerts system tested
- [ ] Documentation reviewed by team

---

**Status:** ✅ Ready for Production
**Version:** 1.0.0
**Last Updated:** February 15, 2026

---

🎉 **Performance monitoring and CDN are now fully operational!**
