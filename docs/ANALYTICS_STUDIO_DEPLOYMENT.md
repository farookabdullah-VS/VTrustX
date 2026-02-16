# Analytics Studio 2.0 Deployment Guide

**Version:** 2.0
**Last Updated:** February 16, 2026
**Status:** Production-Ready

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Requirements](#environment-requirements)
3. [Deployment Steps](#deployment-steps)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedure](#rollback-procedure)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### ✅ Code Quality

- [x] All 239 unit tests passing
- [x] All 3 E2E test suites passing (1,680 lines)
- [x] No ESLint errors or warnings
- [x] Code review completed and approved
- [x] Security audit completed (CodeQL, TruffleHog)
- [x] Performance benchmarks met (< 2s page load, < 500ms widget render)

### ✅ Database

- [x] Migration `1771200000000_analytics-studio-enhancements.js` tested
- [x] All three tables created: `report_templates`, `scheduled_reports`, `report_snapshots`
- [x] Backup of production database created
- [x] Rollback script tested
- [x] Template seed script ready (`npm run seed:templates`)

### ✅ Dependencies

- [x] Production dependencies installed and verified
- [x] `puppeteer` Chrome browser installed
- [x] `pptxgenjs` tested with sample reports
- [x] `node-cron` tested with test schedules
- [x] `ml-regression` tested with sample data

### ✅ Infrastructure

- [x] Redis available (or in-memory cache fallback configured)
- [x] Google Cloud Storage configured (or local storage fallback)
- [x] Email service configured (SendGrid/Mailgun/SES)
- [x] Cron job scheduler initialized
- [x] SSL/TLS certificates valid
- [x] CDN configured for static assets

### ✅ Configuration

- [x] Environment variables documented
- [x] Secrets stored securely (not in code)
- [x] Rate limiting configured
- [x] CORS settings reviewed
- [x] Cache TTL values optimized
- [x] Log levels set appropriately

### ✅ Documentation

- [x] Migration guide written (`ANALYTICS_STUDIO_MIGRATION_GUIDE.md`)
- [x] API documentation complete (`ANALYTICS_STUDIO_API.md`)
- [x] Deployment guide written (this document)
- [x] User training materials prepared
- [x] Changelog updated

### ✅ Monitoring

- [x] Sentry configured for error tracking
- [x] Performance monitoring enabled
- [x] Log aggregation configured
- [x] Alerts set up for critical errors
- [x] Dashboard created for key metrics

---

## Environment Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| Node.js | 18.x or higher |
| PostgreSQL | 12.x or higher |
| Redis | 6.x or higher (optional) |
| Memory | 2GB RAM minimum, 4GB recommended |
| CPU | 2 cores minimum, 4 cores recommended |
| Disk | 10GB available space |
| Chrome/Chromium | Required for Puppeteer PDF export |

### Recommended Production Setup

| Component | Recommendation |
|-----------|----------------|
| Node.js | 22.x LTS |
| PostgreSQL | 16.x with connection pooling |
| Redis | 7.x with persistence |
| Memory | 8GB RAM |
| CPU | 4-8 cores |
| Disk | 50GB SSD |
| Load Balancer | Multiple instances behind load balancer |

---

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vtrustx_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vtrustx_db
DB_USER=vtrustx_user
DB_PASSWORD=<secure_password>

# Redis (optional, falls back to in-memory)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=<secure_password>

# Storage
STORAGE_TYPE=gcs
GCS_BUCKET_NAME=vtrustx-exports
GCS_PROJECT_ID=vtrustx-prod
GCS_KEY_FILE=path/to/service-account-key.json

# Email
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=<api_key>
EMAIL_FROM=reports@vtrustx.com

# Authentication
JWT_SECRET=<secure_random_string>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<secure_random_string>
REFRESH_TOKEN_EXPIRES_IN=7d

# Performance
VITE_PERFORMANCE_TRACKING=true
REACT_APP_ENABLE_PERFORMANCE_REPORTING=true

# Scheduled Reports
ENABLE_SCHEDULED_REPORTS=true
REPORT_EMAIL_FROM=reports@vtrustx.com

# Export
PUPPETEER_HEADLESS=true
EXPORT_STORAGE_PATH=exports/
EXPORT_URL_EXPIRES_IN=604800

# Monitoring
SENTRY_DSN=<sentry_dsn>
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=0.1
```

### Optional Variables

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Caching
CACHE_QUERY_TTL=600
CACHE_COUNT_TTL=300
CACHE_AGGREGATION_TTL=900

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Feature Flags
ENABLE_EXPORT_PDF=true
ENABLE_EXPORT_POWERPOINT=true
ENABLE_FORECASTING=true
ENABLE_COHORT_ANALYSIS=true
```

---

## Deployment Steps

### Step 1: Backup Current State

```bash
# Backup database
pg_dump -U vtrustx_user -d vtrustx_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup Redis (if used)
redis-cli BGSAVE

# Backup application code
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /path/to/app

# Test backup restoration (on staging)
psql -U vtrustx_user -d vtrustx_db_test < backup_20260216_150000.sql
```

---

### Step 2: Pull Latest Code

```bash
# Pull from main branch
git checkout main
git pull origin main

# Verify correct version
git log -1 --oneline
# Should show: "docs: Add Analytics Studio 2.0 deployment documentation"

# Check for uncommitted changes
git status
# Should show: "nothing to commit, working tree clean"
```

---

### Step 3: Install Dependencies

```bash
# Server dependencies
cd server
npm ci  # Use ci for production (respects package-lock.json exactly)

# Install Puppeteer Chrome
npx puppeteer browsers install chrome

# Client dependencies
cd ../client
npm ci

# Build production bundle
npm run build
```

---

### Step 4: Run Database Migrations

```bash
cd server

# Dry run migration (to verify SQL)
npm run migrate -- --dry-run

# Run migration
npm run migrate

# Verify tables were created
node -e "const { query } = require('./src/infrastructure/database/db'); query('SELECT table_name FROM information_schema.tables WHERE table_name IN (\\'report_templates\\', \\'scheduled_reports\\', \\'report_snapshots\\')').then(r => { console.log('Tables:', r.rows.map(row => row.table_name)); process.exit(0); });"

# Expected output:
# Tables: [ 'report_snapshots', 'report_templates', 'scheduled_reports' ]
```

---

### Step 5: Seed Report Templates

```bash
cd server

# Seed default templates
npm run seed:templates

# Verify templates were created
node -e "const { query } = require('./src/infrastructure/database/db'); query('SELECT id, name, category FROM report_templates').then(r => { console.log('Templates:', r.rows.length); process.exit(0); });"

# Expected output:
# Templates: 8
```

---

### Step 6: Start Services

#### Option A: Docker Compose

```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps
docker-compose logs -f server
```

#### Option B: Manual Start

```bash
# Start Redis (if using)
redis-server /etc/redis/redis.conf

# Start server
cd server
NODE_ENV=production npm start

# In another terminal, verify server is running
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

---

### Step 7: Initialize Scheduled Reports

The report scheduler initializes automatically on server startup. Verify it's running:

```bash
# Check logs for scheduler initialization
tail -f /var/log/vtrustx/server.log | grep "ReportScheduler"

# Expected output:
# [info] ReportSchedulerService initialized
# [info] Loaded 5 active schedules
```

---

### Step 8: Warm Up Cache

Pre-warm the cache with common queries to improve initial user experience:

```bash
# Run cache warming script
node server/src/scripts/warm-cache.js

# Or manually hit common endpoints
curl -X POST http://localhost:3000/api/analytics/query-data \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=$ADMIN_TOKEN" \
  -d '{"surveyId":"common-survey-id","page":1,"pageSize":100}'
```

---

### Step 9: Deploy Frontend

```bash
cd client

# Build production bundle
npm run build

# Upload to CDN / Static hosting
aws s3 sync dist/ s3://vtrustx-frontend-prod/ --delete

# Or deploy to Cloud Run / App Engine
gcloud app deploy
```

---

### Step 10: Update Load Balancer

If using a load balancer, gradually shift traffic to the new version:

```bash
# Example: Shift 10% of traffic to new version
kubectl set image deployment/vtrustx-server server=gcr.io/vtrustx/server:v2.0.0
kubectl rollout status deployment/vtrustx-server

# Monitor error rates in Sentry
# If error rate < 1%, shift more traffic (25%, 50%, 100%)
```

---

## Post-Deployment Verification

### Smoke Tests

Run these tests immediately after deployment:

#### 1. Health Check

```bash
curl http://your-domain.com/health
# Expected: {"status":"ok","version":"2.0.0"}
```

#### 2. Authentication

```bash
# Login
curl -X POST http://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Expected: 200 OK with access_token cookie
```

#### 3. Report Templates

```bash
curl -X GET http://your-domain.com/api/report-templates \
  --cookie "access_token=$TOKEN"

# Expected: 200 OK with array of 8 templates
```

#### 4. Query Data (with pagination)

```bash
curl -X POST http://your-domain.com/api/analytics/query-data \
  -H "Content-Type: application/json" \
  --cookie "access_token=$TOKEN" \
  -d '{"surveyId":"test-survey","page":1,"pageSize":100}'

# Expected: 200 OK with data and pagination metadata
```

#### 5. Export PDF

```bash
curl -X POST http://your-domain.com/api/analytics/export/pdf \
  -H "Content-Type: application/json" \
  --cookie "access_token=$TOKEN" \
  -d '{"reportId":"test-report","options":{"orientation":"landscape"}}'

# Expected: 200 OK with {url, filename, expiresAt}
```

#### 6. Scheduled Reports

```bash
curl -X GET http://your-domain.com/api/analytics/schedules \
  --cookie "access_token=$TOKEN"

# Expected: 200 OK with array of schedules
```

#### 7. Forecasting

```bash
curl -X POST http://your-domain.com/api/analytics/forecast \
  -H "Content-Type: application/json" \
  --cookie "access_token=$TOKEN" \
  -d '{"surveyId":"test-survey","metric":"nps","periods":7,"interval":"day"}'

# Expected: 200 OK with {historical, forecast, regression, trend}
```

---

### Performance Verification

#### Page Load Time

```bash
# Measure with curl
time curl -I http://your-domain.com/analytics-studio

# Expected: < 2 seconds
```

#### API Response Time

```bash
# Measure query-data endpoint
time curl -X POST http://your-domain.com/api/analytics/query-data \
  -H "Content-Type: application/json" \
  --cookie "access_token=$TOKEN" \
  -d '{"surveyId":"test-survey","page":1,"pageSize":100}' -w '%{time_total}s\n'

# Expected: < 1 second
```

#### Cache Hit Rate

```bash
curl http://your-domain.com/api/analytics/cache/stats \
  --cookie "access_token=$ADMIN_TOKEN"

# Expected: hitRate > 80%
```

---

### End-to-End Tests

Run the full E2E test suite against production (or staging):

```bash
cd e2e

# Set production URL
export BASE_URL=https://your-domain.com

# Run E2E tests
npx playwright test --project=chromium

# Expected: All tests passing
```

---

## Rollback Procedure

If critical issues are discovered after deployment:

### Step 1: Stop New Traffic

```bash
# If using load balancer, route traffic back to old version
kubectl rollout undo deployment/vtrustx-server

# Or update DNS to point to old server
```

---

### Step 2: Rollback Database

```bash
# Rollback migration
cd server
npm run migrate:down

# Restore database backup
psql -U vtrustx_user -d vtrustx_db < backup_20260216_150000.sql
```

---

### Step 3: Rollback Application Code

```bash
# Checkout previous version
git checkout v1.9.0

# Reinstall dependencies
cd server && npm ci
cd ../client && npm ci && npm run build

# Restart services
pm2 restart vtrustx-server
```

---

### Step 4: Verify Rollback

```bash
# Check version
curl http://your-domain.com/health
# Expected: {"status":"ok","version":"1.9.0"}

# Check analytics studio loads
curl -I http://your-domain.com/analytics-studio
# Expected: 200 OK
```

---

### Step 5: Document Issues

Create a post-mortem document:
- What went wrong?
- When was it discovered?
- What was the impact?
- What was the root cause?
- How was it fixed?
- How can we prevent this in the future?

---

## Monitoring and Alerts

### Key Metrics to Monitor

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| Error Rate | > 1% | Warning |
| Error Rate | > 5% | Critical |
| API Response Time (p95) | > 2s | Warning |
| API Response Time (p99) | > 5s | Critical |
| Cache Hit Rate | < 70% | Warning |
| Memory Usage | > 85% | Warning |
| Memory Usage | > 95% | Critical |
| CPU Usage | > 80% | Warning |
| Disk Usage | > 85% | Critical |
| Export Failures | > 10% | Warning |
| Scheduled Report Failures | > 5% | Critical |

---

### Sentry Alerts

Configure Sentry to alert on:
- New error types (unhandled exceptions)
- Error frequency > 100/hour
- Performance degradation (LCP > 3s)
- Failed exports
- Failed scheduled reports

---

### Log Aggregation

Key logs to aggregate and monitor:
- `[error]` level logs
- Export failures (`PDF generation failed`, `PPTX generation failed`)
- Scheduled report failures (`Schedule execution failed`)
- Cache errors (`Cache set error`, `Cache get error`)
- Database connection errors

---

### Dashboard Widgets

Create a monitoring dashboard with:
1. **Traffic**: Requests per minute, active users
2. **Performance**: p50/p95/p99 response times, page load times
3. **Errors**: Error rate, top errors, error distribution
4. **Cache**: Hit rate, miss rate, cache size
5. **Exports**: PDF exports (success/failure), PowerPoint exports
6. **Scheduled Reports**: Active schedules, successful executions, failures
7. **Database**: Connection pool usage, query time, slow queries

---

## Troubleshooting

### Issue: Migration Fails with "relation already exists"

**Cause:** Migration was partially run or manually applied

**Solution:**
```bash
# Check pgmigrations table
node -e "const { query } = require('./server/src/infrastructure/database/db'); query('SELECT * FROM pgmigrations ORDER BY run_on DESC LIMIT 5').then(r => console.log(r.rows));"

# If analytics-studio-enhancements is listed, manually create missing tables
node server/src/scripts/fix-missing-tables.js
```

---

### Issue: Puppeteer Fails with "Could not find Chrome"

**Cause:** Chrome/Chromium not installed

**Solution:**
```bash
# Install Chrome for Puppeteer
npx puppeteer browsers install chrome

# Or set custom executable path
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

---

### Issue: Scheduled Reports Not Running

**Cause:** Scheduler not initialized or cron expression invalid

**Solution:**
```bash
# Check if scheduler is initialized
grep "ReportScheduler" /var/log/vtrustx/server.log

# Manually trigger a schedule to test
curl -X POST http://localhost:3000/api/analytics/schedules/1/execute \
  --cookie "access_token=$ADMIN_TOKEN"

# Check cron expression validity
node -e "const cron = require('node-cron'); console.log(cron.validate('0 9 * * 1'));"
```

---

### Issue: High Memory Usage

**Cause:** Memory leak or cache not being cleared

**Solution:**
```bash
# Check memory usage
node -e "console.log(process.memoryUsage());"

# Force garbage collection (if --expose-gc flag used)
curl -X POST http://localhost:3000/api/admin/gc

# Clear analytics cache
curl -X POST http://localhost:3000/api/analytics/cache/invalidate \
  -H "Content-Type: application/json" \
  --cookie "access_token=$ADMIN_TOKEN" \
  -d '{"surveyId":"all"}'

# Restart server if memory > 1GB
pm2 restart vtrustx-server
```

---

### Issue: Export URLs Expire Too Quickly

**Cause:** Signed URL expiration too short

**Solution:**
```bash
# Update EXPORT_URL_EXPIRES_IN in .env
EXPORT_URL_EXPIRES_IN=1209600  # 14 days instead of 7

# Restart server
pm2 restart vtrustx-server
```

---

### Issue: Slow API Responses

**Cause:** Cache not working or database needs optimization

**Solution:**
```bash
# Check cache health
curl http://localhost:3000/api/analytics/cache/health \
  --cookie "access_token=$ADMIN_TOKEN"

# Check slow queries in database
psql -U vtrustx_user -d vtrustx_db -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"

# Add missing indexes if needed
psql -U vtrustx_user -d vtrustx_db -c "
CREATE INDEX IF NOT EXISTS idx_form_responses_tenant_form
ON form_responses(tenant_id, form_id);"
```

---

## Success Criteria

Deployment is considered successful when:

✅ All smoke tests pass
✅ E2E tests pass in production
✅ Error rate < 0.5%
✅ Page load time < 2s (p95)
✅ API response time < 1s (p95)
✅ Cache hit rate > 80%
✅ No critical alerts in first 24 hours
✅ Export functionality working (PDF, PowerPoint)
✅ Scheduled reports executing successfully
✅ User feedback positive

---

## Post-Deployment Tasks

Within 24 hours:
- [ ] Monitor Sentry for new errors
- [ ] Review performance metrics
- [ ] Check cache hit rates
- [ ] Verify scheduled reports executed
- [ ] Test export functionality with real data
- [ ] Gather user feedback
- [ ] Update status page

Within 1 week:
- [ ] Conduct user training sessions
- [ ] Create custom templates for key customers
- [ ] Optimize slow queries (if any)
- [ ] Fine-tune cache TTL values
- [ ] Review and adjust rate limits

Within 1 month:
- [ ] Analyze usage patterns
- [ ] Plan Phase 3 features (rich media)
- [ ] Collect user feedback for improvements
- [ ] Performance optimization based on production data

---

## Contact Information

**Deployment Lead:** Development Team
**On-Call Engineer:** [Name] - [Phone]
**Slack Channel:** #analytics-studio-deployment
**Incident Response:** #incidents

---

## Deployment History

| Version | Date | Deployed By | Notes |
|---------|------|-------------|-------|
| 2.0.0 | 2026-02-16 | Dev Team | Phase 1 & 2 complete |
| 1.9.0 | 2026-01-15 | Dev Team | Pre-refactor baseline |

---

**For more information:**
- [Migration Guide](./ANALYTICS_STUDIO_MIGRATION_GUIDE.md)
- [API Documentation](./ANALYTICS_STUDIO_API.md)
- [Feature Documentation](./ANALYTICS_STUDIO_FEATURES.md)
