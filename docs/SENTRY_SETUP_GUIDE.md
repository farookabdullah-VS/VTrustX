# 🔍 Sentry Setup Guide for VTrustX

Complete step-by-step guide to configure Sentry error tracking and performance monitoring.

---

## 📋 **What You'll Get**

✅ **Automatic Error Tracking** - Catch and log all errors
✅ **Performance Monitoring (APM)** - Track API response times
✅ **Session Replay** - See exactly what users did before errors
✅ **Release Tracking** - Monitor errors by version
✅ **User Context** - Know which users experienced issues
✅ **Stack Traces** - Full error details with source maps
✅ **Breadcrumbs** - User actions leading to errors
✅ **Real-time Alerts** - Get notified immediately

---

## 🚀 **Step 1: Create Sentry Account** (5 minutes)

### **1.1 Sign Up**

1. Go to **https://sentry.io**
2. Click **"Get Started"** or **"Sign Up"**
3. Choose one of:
   - Sign up with GitHub (recommended)
   - Sign up with Google
   - Sign up with email

4. **Select plan:**
   - **Developer (Free)**: 5,000 errors/month + 10,000 transactions
   - **Team ($26/month)**: 50,000 errors/month + 100,000 transactions
   - **Business**: Custom pricing

   *Recommendation: Start with Free plan, upgrade if needed*

5. Complete email verification if using email signup

---

## 🏗️ **Step 2: Create Backend Project** (3 minutes)

### **2.1 Create New Project**

1. After login, click **"Create Project"**

2. **Select Platform:** Choose **"Node.js"**

3. **Configure Project:**
   ```
   Project Name: VTrustX-Backend
   Team: [Your team name or Default]
   Alert Frequency: On Every New Issue (recommended)
   ```

4. Click **"Create Project"**

### **2.2 Get Backend DSN**

You'll see a screen with initialization code. **Copy the DSN** - it looks like:
```
https://1234567890abcdef1234567890abcdef@o123456.ingest.sentry.io/7654321
```

**Save this DSN** - you'll need it for the backend `.env` file.

---

## 💻 **Step 3: Create Frontend Project** (3 minutes)

### **3.1 Create Second Project**

1. Click **"Projects"** in the sidebar
2. Click **"Create Project"** button
3. **Select Platform:** Choose **"React"**
4. **Configure Project:**
   ```
   Project Name: VTrustX-Frontend
   Team: [Same team as backend]
   Alert Frequency: On Every New Issue
   ```

5. Click **"Create Project"**

### **3.2 Get Frontend DSN**

Copy the frontend DSN (different from backend DSN):
```
https://abcdef1234567890abcdef1234567890@o123456.ingest.sentry.io/7654322
```

**Save this DSN** separately.

---

## ⚙️ **Step 4: Configure Backend** (2 minutes)

### **4.1 Update `.env` File**

Edit `server/.env` and add:

```bash
# Sentry Configuration (Backend)
SENTRY_DSN=https://YOUR_BACKEND_DSN@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0

# Optional: Traces sample rate (0.1 = 10% of transactions)
SENTRY_TRACES_SAMPLE_RATE=0.1

# Optional: Profiles sample rate
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

**Replace `YOUR_BACKEND_DSN`** with the actual DSN from Step 2.2.

### **4.2 Environment-Specific Configuration**

Create different configs for dev/staging/production:

**For Development** (`server/.env.development`):
```bash
SENTRY_DSN=https://YOUR_BACKEND_DSN@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0  # Track 100% in dev
```

**For Production** (`server/.env.production`):
```bash
SENTRY_DSN=https://YOUR_BACKEND_DSN@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # Track 10% in prod
```

---

## 🎨 **Step 5: Configure Frontend** (2 minutes)

### **5.1 Update `.env` File**

Edit `client/.env` and add:

```bash
# Sentry Configuration (Frontend)
VITE_SENTRY_DSN=https://YOUR_FRONTEND_DSN@o123456.ingest.sentry.io/7654322
VITE_ENVIRONMENT=production
VITE_SENTRY_RELEASE=1.0.0

# Optional: Session replay sample rates
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
```

**Replace `YOUR_FRONTEND_DSN`** with the actual DSN from Step 3.2.

### **5.2 Environment-Specific Configuration**

**For Development** (`client/.env.development`):
```bash
VITE_SENTRY_DSN=https://YOUR_FRONTEND_DSN@o123456.ingest.sentry.io/7654322
VITE_ENVIRONMENT=development
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.5  # 50% in dev
```

**For Production** (`client/.env.production`):
```bash
VITE_SENTRY_DSN=https://YOUR_FRONTEND_DSN@o123456.ingest.sentry.io/7654322
VITE_ENVIRONMENT=production
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1  # 10% in prod
```

---

## 🔄 **Step 6: Restart Servers** (1 minute)

### **6.1 Restart Backend**

```bash
cd server

# If using npm run dev
npm run dev

# If using pm2
pm2 restart vtrustx-backend

# If using Docker
docker-compose restart backend
```

### **6.2 Restart Frontend**

```bash
cd client

# Development
npm run dev

# Production build
npm run build
```

---

## ✅ **Step 7: Test Sentry Integration** (5 minutes)

### **7.1 Test Backend Error Tracking**

Create a test error endpoint temporarily:

**Option A: Use existing error** (recommended)
Just trigger any API error (wrong credentials, invalid data, etc.)

**Option B: Create test endpoint** (for testing only)
```javascript
// Add to server/src/api/routes/test.js
router.get('/sentry-test', (req, res) => {
    throw new Error('Sentry test error from backend!');
});
```

Then visit: `http://localhost:3000/api/test/sentry-test`

### **7.2 Test Frontend Error Tracking**

Create a test button in any component:

```javascript
// Add temporarily to Dashboard or any component
<button onClick={() => {
    throw new Error('Sentry test error from frontend!');
}}>
    Test Sentry
</button>
```

Click the button and check Sentry dashboard.

### **7.3 Verify in Sentry Dashboard**

1. Go to **https://sentry.io**
2. Click on **"Issues"** in sidebar
3. You should see your test errors appear within seconds:
   - **Backend error** in VTrustX-Backend project
   - **Frontend error** in VTrustX-Frontend project

---

## 📊 **Step 8: Enable Performance Monitoring** (Already Configured!)

Performance monitoring is **already enabled** in your configuration. It tracks:

### **Backend APM:**
- ✅ API endpoint response times
- ✅ Database query performance
- ✅ External API calls
- ✅ HTTP request duration

### **Frontend APM:**
- ✅ Page load times
- ✅ Component render times
- ✅ API call latency
- ✅ Navigation timing

**View Performance Data:**
1. Go to Sentry dashboard
2. Click **"Performance"** in sidebar
3. See transaction traces and slow operations

---

## 🎬 **Step 9: Enable Session Replay** (Already Configured!)

Session Replay is **already enabled** for the frontend. It records:

- ✅ Mouse movements and clicks
- ✅ Page navigation
- ✅ Console logs
- ✅ Network requests
- ✅ DOM mutations

**View Session Replays:**
1. Go to Sentry dashboard
2. Click on any error in **"Issues"**
3. Click **"Replays"** tab
4. Watch the video of what the user did before the error

**Privacy Settings:**
- Text is **NOT masked** by default (set `maskAllText: false`)
- Media is **blocked** (set `blockAllMedia: true`)
- Sensitive data is automatically redacted

---

## 👤 **Step 10: Set Up User Context** (Already Configured!)

User context is **already integrated** with AuthContext. When users log in:

```javascript
// This happens automatically in AuthContext.jsx
import { setUser } from './config/sentry';

// After successful login
setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    tenant_id: user.tenant_id
});
```

This allows you to:
- See which users experienced errors
- Filter errors by user or tenant
- Contact affected users directly
- Track error rates per user segment

---

## 📧 **Step 11: Configure Alerts** (5 minutes)

### **11.1 Create Alert Rules**

1. Go to **Settings** → **Projects** → **VTrustX-Backend**
2. Click **"Alerts"** → **"Create Alert Rule"**

**Recommended Alert Rules:**

**Alert 1: High Error Rate**
```
When: Error count
Condition: Is greater than 10
In: 1 minute
Then: Send notification to [your email]
```

**Alert 2: New Issue**
```
When: A new issue is created
Then: Send notification to [your email/Slack]
```

**Alert 3: Performance Degradation**
```
When: P95 response time
Condition: Is greater than 2000ms
For: /api/* endpoints
In: 5 minutes
Then: Send notification
```

### **11.2 Notification Channels**

Set up notification channels:
1. **Email** (enabled by default)
2. **Slack** (recommended):
   - Go to Settings → Integrations
   - Click "Slack"
   - Authorize Slack workspace
   - Choose channel for alerts
3. **PagerDuty** (for critical production)
4. **Discord** / **Microsoft Teams** (optional)

---

## 🔐 **Security Best Practices**

### **1. Filter Sensitive Data**

Sentry configuration already filters:
- ✅ Cookies
- ✅ Authorization headers
- ✅ Passwords in error messages

### **2. Add Custom Filtering**

Edit `server/src/config/sentry.js` to add custom filters:

```javascript
beforeSend(event, hint) {
    // Remove API keys from error context
    if (event.extra) {
        delete event.extra.apiKey;
        delete event.extra.secret;
    }

    // Remove sensitive query parameters
    if (event.request?.query_string) {
        event.request.query_string = event.request.query_string
            .replace(/token=[^&]+/gi, 'token=[REDACTED]')
            .replace(/password=[^&]+/gi, 'password=[REDACTED]');
    }

    return event;
}
```

### **3. Data Scrubbing in Sentry**

1. Go to **Settings** → **Data Privacy**
2. Enable **"Data Scrubbing"**
3. Add patterns to scrub:
   ```
   password
   api_key
   secret
   token
   credit_card
   ssn
   ```

---

## 📈 **Monitoring in Production**

### **Daily Monitoring Checklist:**
- [ ] Check error rate (should be < 1% of requests)
- [ ] Review new issues
- [ ] Check performance degradation
- [ ] Review slow transactions
- [ ] Verify alert notifications are working

### **Weekly Review:**
- [ ] Analyze error trends
- [ ] Identify most common errors
- [ ] Review error by user segment
- [ ] Check session replay patterns
- [ ] Update alert thresholds if needed

### **Monthly Tasks:**
- [ ] Review Sentry quota usage
- [ ] Upgrade plan if needed (approaching limits)
- [ ] Archive resolved issues
- [ ] Update error fingerprinting rules
- [ ] Review team access and permissions

---

## 🔧 **Advanced Configuration**

### **Source Maps for Stack Traces**

**Frontend (Vite):**

Edit `client/vite.config.js`:

```javascript
export default defineConfig({
    build: {
        sourcemap: true, // Generate source maps
    },
    plugins: [
        // Sentry plugin to upload source maps
        sentryVitePlugin({
            org: 'your-org',
            project: 'vtrustx-frontend',
            authToken: process.env.SENTRY_AUTH_TOKEN,
        })
    ]
});
```

Install plugin:
```bash
npm install --save-dev @sentry/vite-plugin
```

**Backend (Node.js):**

Source maps are automatically supported for TypeScript/compiled code.

### **Release Tracking**

Automatically track releases:

```bash
# Install Sentry CLI
npm install --save-dev @sentry/cli

# Create release
npx sentry-cli releases new "vtrustx@1.0.0"

# Associate commits
npx sentry-cli releases set-commits "vtrustx@1.0.0" --auto

# Deploy
npx sentry-cli releases deploys "vtrustx@1.0.0" new -e production
```

Add to your CI/CD pipeline (GitHub Actions):

```yaml
- name: Create Sentry release
  uses: getsentry/action-release@v1
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: vtrustx-backend
  with:
    environment: production
    version: ${{ github.ref }}
```

---

## 🐛 **Troubleshooting**

### **Issue: Errors not appearing in Sentry**

**Check 1: Verify DSN is set**
```bash
# Backend
echo $SENTRY_DSN

# Frontend (in browser console)
console.log(import.meta.env.VITE_SENTRY_DSN)
```

**Check 2: Check initialization logs**
Look for:
```
Sentry initialized { environment: 'production', release: '1.0.0' }
```

**Check 3: Trigger test error**
```javascript
// Backend
throw new Error('Test error');

// Frontend
throw new Error('Test error');
```

**Check 4: Check network tab**
Look for requests to `ingest.sentry.io` - should return 200 OK

### **Issue: Too many events (quota exceeded)**

**Solution 1: Adjust sample rates**
```bash
# Reduce to 5% of transactions
SENTRY_TRACES_SAMPLE_RATE=0.05
```

**Solution 2: Filter errors**
```javascript
ignoreErrors: [
    'NetworkError',
    'ChunkLoadError',
    'ResizeObserver',
]
```

**Solution 3: Upgrade plan**
If you're getting genuine errors, upgrade to Team plan.

### **Issue: Session replays not working**

**Check 1: Verify replay integration**
```javascript
// Should be in client/src/config/sentry.js
Sentry.replayIntegration({
    maskAllText: false,
    blockAllMedia: true,
})
```

**Check 2: Check sample rates**
```bash
VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0  # Must be > 0
```

**Check 3: Test in production mode**
Replays might not work in development mode.

---

## 📚 **Additional Resources**

- **Sentry Documentation**: https://docs.sentry.io/
- **Node.js SDK**: https://docs.sentry.io/platforms/node/
- **React SDK**: https://docs.sentry.io/platforms/javascript/guides/react/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/
- **Session Replay**: https://docs.sentry.io/product/session-replay/
- **Best Practices**: https://docs.sentry.io/product/best-practices/

---

## ✅ **Configuration Checklist**

### **Setup Complete:**
- [ ] Sentry account created
- [ ] Backend project created
- [ ] Frontend project created
- [ ] Backend DSN added to `.env`
- [ ] Frontend DSN added to `.env`
- [ ] Servers restarted
- [ ] Test errors sent successfully
- [ ] Errors visible in Sentry dashboard
- [ ] Performance monitoring enabled
- [ ] Session replay enabled
- [ ] User context configured
- [ ] Alert rules created
- [ ] Team notified about Sentry setup

### **Production Checklist:**
- [ ] Production DSNs configured
- [ ] Sample rates set appropriately (0.1 recommended)
- [ ] Data scrubbing enabled
- [ ] Source maps uploaded
- [ ] Release tracking configured
- [ ] CI/CD integration added
- [ ] Team has access to Sentry dashboard
- [ ] Monitoring schedule established

---

## 🎉 **You're All Set!**

Sentry is now fully configured for VTrustX:

✅ **Backend** - Tracking all API errors and performance
✅ **Frontend** - Tracking React errors with session replay
✅ **User Context** - See which users are affected
✅ **Alerts** - Get notified immediately
✅ **Performance** - Track slow operations

**Next Steps:**
1. Monitor the Sentry dashboard daily
2. Triage and fix errors as they come in
3. Review performance data weekly
4. Set up Slack integration for team alerts

---

**Status:** ✅ Ready for Production
**Documentation Version:** 1.0.0
**Last Updated:** February 15, 2026

**Need Help?** Visit https://sentry.io/support or check Sentry docs.
