# Sentry Error Tracking Setup

This document explains how to configure Sentry for error tracking and performance monitoring in RayiX.

## Overview

Sentry is integrated into both the backend (Node.js/Express) and frontend (React) to provide:

- **Error Tracking**: Automatic capture of unhandled errors and exceptions
- **Performance Monitoring**: Track slow API calls, database queries, and page loads
- **Session Replay**: Replay user sessions to understand bugs (frontend only)
- **User Context**: Associate errors with specific users and tenants
- **Release Tracking**: Track errors by version/release

## Getting Started

### 1. Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create two projects:
   - **Backend** (Node.js platform)
   - **Frontend** (React platform)
3. Copy the DSN (Data Source Name) for each project

### 2. Configure Backend

Add to `server/.env`:

```env
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
SENTRY_RELEASE=1.0.0  # Optional: Track errors by release version
NODE_ENV=production
```

**What happens:**
- Sentry initializes automatically when the server starts
- All unhandled errors (HTTP 500+) are captured
- Performance traces are collected (10% sample rate in production)
- User context is set from JWT tokens

**Files:**
- `server/src/config/sentry.js` - Sentry configuration
- `server/index.js` - Initialization and middleware integration

### 3. Configure Frontend

Add to `client/.env.production`:

```env
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_SENTRY_RELEASE=1.0.0  # Optional: Track errors by release version
VITE_ENVIRONMENT=production
```

**What happens:**
- Sentry initializes when the app loads
- Unhandled errors are captured automatically
- User context is set on login (email, user ID, tenant ID)
- Session replay captures user interactions (errors only in production)
- Performance traces are collected (10% sample rate in production)

**Files:**
- `client/src/config/sentry.js` - Sentry configuration
- `client/src/main.jsx` - Initialization and ErrorBoundary
- `client/src/contexts/AuthContext.jsx` - User context integration

### 4. Local Development

Sentry is **disabled by default** in development (no DSN required).

To test Sentry locally:
1. Add `SENTRY_DSN` to `.env`
2. Set `NODE_ENV=development` (or leave unset)
3. Errors will be sent with 100% sample rate

## Usage

### Automatic Error Capture

Most errors are captured automatically:

**Backend:**
- Unhandled promise rejections
- Express middleware errors
- HTTP 500+ errors

**Frontend:**
- Unhandled JavaScript errors
- React component errors (via ErrorBoundary)
- Unhandled promise rejections

### Manual Error Capture

#### Backend

```javascript
const { captureException, captureMessage } = require('./src/config/sentry');

// Capture an exception
try {
  // risky operation
} catch (error) {
  captureException(error, { extra: { context: 'data' } });
}

// Capture a message
captureMessage('Something unusual happened', 'warning', { userId: 123 });
```

#### Frontend

```javascript
import { captureException, captureMessage } from './config/sentry';

// Capture an exception
try {
  // risky operation
} catch (error) {
  captureException(error, { extra: { context: 'data' } });
}

// Capture a message
captureMessage('User performed unusual action', 'info', { action: 'delete_all' });
```

### User Context

User context is **automatically set** when users log in:

**Backend:** Extracted from JWT tokens in auth middleware
**Frontend:** Set in `AuthContext` on login

Manual user context (if needed):

```javascript
// Frontend
import { setUser, clearUser } from './config/sentry';

setUser({
  id: user.id,
  email: user.email,
  username: user.username,
  tenant_id: user.tenant_id,
});

// On logout
clearUser();
```

## Configuration Options

### Backend (`server/src/config/sentry.js`)

- **tracesSampleRate**: Performance monitoring sample rate (0.1 = 10%)
- **profilesSampleRate**: Profiling sample rate (0.1 = 10%)
- **ignoreErrors**: Array of error patterns to ignore (CSRF, rate limits, etc.)
- **beforeSend**: Filter/sanitize errors before sending (removes cookies, auth headers)

### Frontend (`client/src/config/sentry.js`)

- **tracesSampleRate**: Performance monitoring sample rate (0.1 = 10%)
- **replaysSessionSampleRate**: Session replay sample rate (0.1 = 10%)
- **replaysOnErrorSampleRate**: Replay on error (1.0 = 100%)
- **ignoreErrors**: Array of error patterns to ignore (browser extensions, network errors, etc.)
- **beforeSend**: Filter/sanitize errors before sending (removes PII)

## CI/CD Integration

### Automated Releases

Update `.github/workflows/backend-ci.yml` and `.github/workflows/frontend-ci.yml`:

```yaml
- name: Create Sentry Release
  run: |
    curl -sL https://sentry.io/get-cli/ | bash
    export SENTRY_RELEASE=$(git rev-parse --short HEAD)
    sentry-cli releases new $SENTRY_RELEASE
    sentry-cli releases set-commits $SENTRY_RELEASE --auto
    sentry-cli releases finalize $SENTRY_RELEASE
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: your-project
```

### Source Maps (Frontend)

To get readable stack traces, upload source maps:

1. Install Sentry Vite plugin:
   ```bash
   npm install --save-dev @sentry/vite-plugin
   ```

2. Update `vite.config.js`:
   ```javascript
   import { sentryVitePlugin } from '@sentry/vite-plugin';

   export default defineConfig({
     build: {
       sourcemap: true,
     },
     plugins: [
       sentryVitePlugin({
         org: 'your-org',
         project: 'your-project',
         authToken: process.env.SENTRY_AUTH_TOKEN,
       }),
     ],
   });
   ```

## Monitoring & Alerts

### Recommended Alerts

Set up alerts in Sentry dashboard:

1. **New Issues** - Alert on first occurrence of new errors
2. **High Volume** - Alert when error frequency spikes
3. **Critical Errors** - Alert on errors tagged as critical
4. **Performance Degradation** - Alert on slow transactions

### Dashboard Widgets

Create a dashboard with:
- Error frequency over time
- Top errors by volume
- Errors by user/tenant
- Performance metrics (P50, P95, P99)
- Session replay count

## Filtering PII

Both backend and frontend configs include `beforeSend` filters to remove:
- Cookies
- Authorization headers
- Passwords
- API keys
- Email addresses (configurable)

**Always review** error reports for sensitive data before sharing.

## Cost Optimization

Free tier: 5,000 errors/month, 10,000 performance traces/month

To stay within limits:
- Use sample rates (10% in production recommended)
- Filter out common/expected errors (rate limits, network errors)
- Set quotas per project in Sentry settings
- Use spike protection to avoid surprise bills

## Troubleshooting

### Errors not appearing in Sentry

1. Check DSN is correct in `.env`
2. Check `NODE_ENV` is set to `production` (or `development` for testing)
3. Check network requests in browser DevTools (look for sentry.io requests)
4. Check server logs for "Sentry initialized" message
5. Manually trigger an error to test:
   ```javascript
   throw new Error('Sentry test error');
   ```

### Too many errors

1. Review `ignoreErrors` patterns in config files
2. Lower sample rates in production
3. Set quotas in Sentry project settings
4. Filter by environment (disable for `test`, `development`)

### Source maps not working

1. Ensure `sourcemap: true` in Vite config
2. Upload source maps via Sentry CLI or Vite plugin
3. Check release name matches between upload and runtime

## Support

- [Sentry Docs](https://docs.sentry.io/)
- [Sentry Node.js Guide](https://docs.sentry.io/platforms/node/)
- [Sentry React Guide](https://docs.sentry.io/platforms/javascript/guides/react/)
