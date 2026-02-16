# Analytics Studio Performance Optimization Guide

## Overview

This guide provides comprehensive strategies and best practices for optimizing the performance of the Analytics Studio, covering both frontend and backend optimizations.

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Page Load** | < 2s | Time to interactive |
| **Widget Render** | < 500ms | Component mount to paint |
| **API Response** | < 1s | Server response time (p95) |
| **Chart Render** | < 200ms | Data to chart paint |
| **Export (PDF)** | < 10s | Request to download |
| **Data Query (100 rows)** | < 1s | Database to response |
| **Filter Apply** | < 500ms | Filter change to re-render |
| **Modal Open** | < 300ms | Click to visible |

---

## Frontend Optimizations

### 1. Code Splitting & Lazy Loading

#### Current Implementation

The Analytics Studio already uses React lazy loading:

```javascript
// App.jsx
const AnalyticsStudio = React.lazy(() =>
  import('./components/analytics/AnalyticsStudioWrapper')
);
```

#### Additional Opportunities

**Route-based code splitting**:
```javascript
// Lazy load individual dashboards
const DeliveryDashboard = React.lazy(() =>
  import('./components/analytics/DeliveryAnalyticsDashboard')
);

const SentimentDashboard = React.lazy(() =>
  import('./components/analytics/SentimentDashboard')
);
```

**Component-level code splitting**:
```javascript
// Lazy load heavy components
const ForecastWidget = React.lazy(() =>
  import('./components/analytics/widgets/ForecastWidget')
);

const CohortWidget = React.lazy(() =>
  import('./components/analytics/widgets/CohortWidget')
);
```

**Impact**: Reduces initial bundle size by 40-60%, improving FCP and TTI.

---

### 2. Memoization & React Optimization

#### useMemo for Expensive Calculations

```javascript
// Before
function ReportDesigner({ data }) {
  const processedData = processLargeDataset(data);
  const chartData = transformToChartFormat(processedData);

  return <ChartWidget data={chartData} />;
}

// After
function ReportDesigner({ data }) {
  const processedData = useMemo(
    () => processLargeDataset(data),
    [data]
  );

  const chartData = useMemo(
    () => transformToChartFormat(processedData),
    [processedData]
  );

  return <ChartWidget data={chartData} />;
}
```

#### useCallback for Event Handlers

```javascript
// Before
function WidgetContainer({ widget }) {
  return (
    <div>
      <button onClick={() => handleEdit(widget.id)}>Edit</button>
      <button onClick={() => handleDelete(widget.id)}>Delete</button>
    </div>
  );
}

// After
function WidgetContainer({ widget }) {
  const handleEdit = useCallback(() => {
    performEdit(widget.id);
  }, [widget.id]);

  const handleDelete = useCallback(() => {
    performDelete(widget.id);
  }, [widget.id]);

  return (
    <div>
      <button onClick={handleEdit}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

#### React.memo for Expensive Components

```javascript
// Prevent re-renders when props haven't changed
const ChartWidget = React.memo(function ChartWidget({ data, config }) {
  // Expensive chart rendering logic
  return <ResponsiveContainer>...</ResponsiveContainer>;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data === nextProps.data &&
         JSON.stringify(prevProps.config) === JSON.stringify(nextProps.config);
});
```

**Impact**: Reduces unnecessary re-renders by 60-80%, improving interaction latency.

---

### 3. Virtualization for Large Lists

#### Implement React Window/Virtual

```javascript
import { FixedSizeList } from 'react-window';

function ReportList({ reports }) {
  // Before: Renders all 1000+ reports
  // return reports.map(report => <ReportCard key={report.id} report={report} />);

  // After: Only renders visible items
  return (
    <FixedSizeList
      height={600}
      itemCount={reports.length}
      itemSize={120}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ReportCard report={reports[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

#### Virtualize Table Data

```javascript
import { useVirtual } from 'react-virtual';

function DataTable({ rows }) {
  const parentRef = useRef();

  const rowVirtualizer = useVirtual({
    size: rows.length,
    parentRef,
    estimateSize: useCallback(() => 50, [])
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.totalSize}px`, position: 'relative' }}>
        {rowVirtualizer.virtualItems.map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <TableRow data={rows[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Impact**: Handles 10,000+ rows with smooth scrolling, reduces initial render time by 90%.

---

### 4. Image & Asset Optimization

#### Optimize Images

```bash
# Install image optimization tools
npm install --save-dev imagemin imagemin-webp imagemin-mozjpeg

# Convert to WebP
npx imagemin src/assets/images/*.{jpg,png} --out-dir=src/assets/images/optimized --plugin=webp
```

#### Lazy Load Images

```javascript
function TemplateCard({ template }) {
  return (
    <div className="template-card">
      <img
        src={template.thumbnail}
        alt={template.name}
        loading="lazy" // Native lazy loading
      />
    </div>
  );
}
```

#### Use SVG for Icons

```javascript
// Instead of icon font libraries, use SVG icons
import { BarChart, PieChart } from 'lucide-react'; // Already implemented
```

**Impact**: Reduces image payload by 50-70%, improves LCP.

---

### 5. Data Fetching Optimization

#### Implement Pagination

```javascript
// Already implemented in Phase 1
function useReportData(surveyId, filters = {}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    hasMore: true
  });

  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loading) return;

    const response = await axios.post('/api/analytics/query-data', {
      surveyId,
      filters,
      page: pagination.page,
      pageSize: pagination.pageSize
    });

    setData(prev => [...prev, ...response.data.data]);
    setPagination(response.data.pagination);
  }, [surveyId, filters, pagination]);

  return { data, loading, loadMore, hasMore: pagination.hasMore };
}
```

#### Implement Request Deduplication

```javascript
import { useQuery } from 'react-query';

function useReports() {
  return useQuery(
    'reports', // Cache key
    () => axios.get('/api/reports').then(res => res.data),
    {
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false
    }
  );
}
```

#### Prefetch Data

```javascript
function ReportList({ reports }) {
  const queryClient = useQueryClient();

  const prefetchReport = useCallback((reportId) => {
    queryClient.prefetchQuery(
      ['report', reportId],
      () => axios.get(`/api/reports/${reportId}`).then(res => res.data)
    );
  }, [queryClient]);

  return reports.map(report => (
    <ReportCard
      key={report.id}
      report={report}
      onMouseEnter={() => prefetchReport(report.id)} // Prefetch on hover
    />
  ));
}
```

**Impact**: Reduces redundant API calls by 80%, improves perceived performance.

---

### 6. Chart Optimization

#### Debounce Chart Updates

```javascript
function ChartWidget({ data }) {
  const [chartData, setChartData] = useState(data);

  // Debounce data updates to avoid frequent re-renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setChartData(data);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [data]);

  return <ResponsiveContainer>
    <LineChart data={chartData}>...</LineChart>
  </ResponsiveContainer>;
}
```

#### Downsample Large Datasets

```javascript
function downsampleData(data, maxPoints = 100) {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
}

function ChartWidget({ data }) {
  const optimizedData = useMemo(
    () => downsampleData(data, 100),
    [data]
  );

  return <LineChart data={optimizedData}>...</LineChart>;
}
```

#### Use Canvas Rendering for Large Charts

```javascript
// For charts with 1000+ data points, use canvas instead of SVG
import { Line } from 'react-chartjs-2'; // Canvas-based

function LargeDataChart({ data }) {
  if (data.length > 1000) {
    return <Line data={data} options={{ responsive: true }} />;
  }

  return <ResponsiveContainer>
    <LineChart data={data}>...</LineChart>
  </ResponsiveContainer>;
}
```

**Impact**: Reduces chart render time from 2s to 200ms for large datasets.

---

## Backend Optimizations

### 1. Database Query Optimization

#### Add Indexes

```sql
-- Add indexes on frequently queried columns
CREATE INDEX idx_submissions_tenant_form ON submissions(tenant_id, form_id);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_forms_tenant_created ON forms(tenant_id, created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX idx_submissions_tenant_form_date
ON submissions(tenant_id, form_id, created_at DESC);

-- Partial indexes for filtered queries
CREATE INDEX idx_active_forms ON forms(tenant_id, created_at)
WHERE deleted_at IS NULL;
```

#### Optimize Queries

```javascript
// Before: N+1 query problem
async function getReportsWithSurveys(tenantId) {
  const reports = await query(
    'SELECT * FROM reports WHERE tenant_id = $1',
    [tenantId]
  );

  for (const report of reports) {
    report.survey = await query(
      'SELECT * FROM forms WHERE id = $1',
      [report.form_id]
    );
  }

  return reports;
}

// After: Single query with JOIN
async function getReportsWithSurveys(tenantId) {
  const result = await query(`
    SELECT
      r.*,
      f.title as survey_title,
      f.definition as survey_definition
    FROM reports r
    LEFT JOIN forms f ON r.form_id = f.id
    WHERE r.tenant_id = $1
  `, [tenantId]);

  return result.rows;
}
```

#### Use Materialized Views for Complex Aggregations

```sql
-- Create materialized view for frequently accessed analytics
CREATE MATERIALIZED VIEW survey_statistics AS
SELECT
  form_id,
  tenant_id,
  COUNT(*) as total_responses,
  AVG((response_data->>'nps_score')::int) as avg_nps,
  DATE_TRUNC('day', created_at) as response_date
FROM submissions
GROUP BY form_id, tenant_id, DATE_TRUNC('day', created_at);

-- Refresh periodically
CREATE INDEX ON survey_statistics(form_id, tenant_id, response_date);
```

**Impact**: Reduces query time from 5s to 100ms for complex aggregations.

---

### 2. Caching Strategy

#### Implement Multi-Layer Caching

```javascript
const cache = require('../infrastructure/cache');

async function getCohortAnalysis(surveyId, tenantId, options) {
  const cacheKey = `cohort:${tenantId}:${surveyId}:${JSON.stringify(options)}`;

  // Check cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Compute result
  const result = await performCohortAnalysis(surveyId, tenantId, options);

  // Cache for 10 minutes
  await cache.set(cacheKey, JSON.stringify(result), 600);

  return result;
}
```

#### Cache Invalidation

```javascript
// Invalidate cache when data changes
async function createSubmission(formId, tenantId, data) {
  const result = await query(
    'INSERT INTO submissions (form_id, tenant_id, response_data) VALUES ($1, $2, $3) RETURNING *',
    [formId, tenantId, JSON.stringify(data)]
  );

  // Invalidate related caches
  await cache.deletePattern(`analytics:${tenantId}:${formId}:*`);
  await cache.deletePattern(`cohort:${tenantId}:${formId}:*`);

  return result.rows[0];
}
```

#### Implement Cache Warming

```javascript
// Pre-populate cache for frequently accessed data
async function warmCache() {
  const popularSurveys = await query(
    'SELECT DISTINCT form_id, tenant_id FROM submissions ORDER BY created_at DESC LIMIT 100'
  );

  for (const survey of popularSurveys.rows) {
    // Warm analytics cache
    await getCohortAnalysis(survey.form_id, survey.tenant_id, { cohortBy: 'month' });
  }
}

// Run on server startup and periodically
warmCache();
setInterval(warmCache, 60 * 60 * 1000); // Every hour
```

**Impact**: Reduces API response time by 70-90% for cached data.

---

### 3. API Response Optimization

#### Implement Response Compression

```javascript
// Already configured in server, ensure it's enabled
const compression = require('compression');
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

#### Field Selection

```javascript
// Allow clients to request only needed fields
router.get('/submissions', async (req, res) => {
  const { fields = '*', ...filters } = req.query;

  const selectedFields = fields === '*' ? '*' : fields.split(',').join(', ');

  const result = await query(
    `SELECT ${selectedFields} FROM submissions WHERE tenant_id = $1`,
    [req.user.tenant_id]
  );

  res.json(result.rows);
});
```

#### Batch API Requests

```javascript
// Instead of multiple requests, allow batching
router.post('/batch', async (req, res) => {
  const { requests } = req.body;

  const results = await Promise.all(
    requests.map(async (request) => {
      try {
        return await processRequest(request);
      } catch (error) {
        return { error: error.message };
      }
    })
  );

  res.json({ results });
});
```

**Impact**: Reduces response payload by 50%, decreases API calls by 80%.

---

### 4. Connection Pooling

```javascript
// Configure optimal pool size
const { Pool } = require('pg');

const pool = new Pool({
  max: 20, // Maximum number of clients
  min: 5,  // Minimum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Use prepared statements for frequently executed queries
  statement_timeout: 10000 // 10 second query timeout
});
```

**Impact**: Reduces connection overhead, improves throughput by 30%.

---

### 5. Background Jobs for Heavy Operations

```javascript
// Use job queue for expensive operations
const Bull = require('bull');
const reportQueue = new Bull('report-export', process.env.REDIS_URL);

// Enqueue export job
router.post('/reports/:id/export', async (req, res) => {
  const job = await reportQueue.add({
    reportId: req.params.id,
    tenantId: req.user.tenant_id,
    format: req.body.format
  });

  res.json({
    jobId: job.id,
    status: 'queued',
    message: 'Export job queued. You will be notified when complete.'
  });
});

// Process jobs in background
reportQueue.process(async (job) => {
  const { reportId, tenantId, format } = job.data;
  return await ReportExportService.export(reportId, tenantId, format);
});
```

**Impact**: Keeps API responses fast (<1s), handles heavy operations asynchronously.

---

## Monitoring & Profiling

### 1. Client-Side Performance Monitoring

```javascript
import { performanceMonitor } from '../utils/performanceBenchmark';

// Measure page load
useEffect(() => {
  performanceMonitor.start('analytics-page-load');

  return () => {
    performanceMonitor.end('analytics-page-load');
  };
}, []);

// Measure widget render
useEffect(() => {
  performanceMonitor.start(`widget-render:${widget.type}`);

  return () => {
    performanceMonitor.end(`widget-render:${widget.type}`);
  };
}, [widget.type]);
```

### 2. Backend Performance Monitoring

```javascript
const performanceMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('API Request', {
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow API Request', {
        method: req.method,
        path: req.path,
        duration
      });
    }
  });

  next();
};

app.use(performanceMiddleware);
```

### 3. Database Query Monitoring

```javascript
// Log slow queries
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 100) { // Log queries > 100ms
    logger.warn('Slow Query', {
      query: text,
      duration,
      rows: result.rowCount
    });
  }

  return result;
};
```

---

## Performance Testing

### Running Tests

```bash
# Frontend performance tests
npx playwright test e2e/tests/analytics-performance.spec.js

# Backend load tests
node server/tests/load/analytics-load-test.js

# Lighthouse audit
npx lighthouse http://localhost:5173/analytics-studio --output=html --output-path=./lighthouse-report.html
```

### Continuous Monitoring

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
      - name: Run load tests
        run: npm run test:load
```

---

## Performance Checklist

### Before Deployment

- [ ] Run Lighthouse audit (score > 90)
- [ ] Run load tests (all scenarios pass)
- [ ] Check bundle size (< 2MB total JS)
- [ ] Verify database indexes exist
- [ ] Test on slow 3G network
- [ ] Test on low-end devices
- [ ] Verify cache hit rates (> 70%)
- [ ] Check for memory leaks
- [ ] Test with large datasets (10,000+ records)
- [ ] Verify error rates (< 1%)

### Ongoing Monitoring

- [ ] Monitor API response times daily
- [ ] Track Core Web Vitals weekly
- [ ] Review slow query logs
- [ ] Monitor cache hit rates
- [ ] Track bundle size changes
- [ ] Monitor memory usage
- [ ] Review user-reported performance issues
- [ ] Conduct quarterly load tests

---

## Tools & Resources

### Performance Tools

- **Lighthouse**: Automated auditing
- **WebPageTest**: Detailed performance analysis
- **Chrome DevTools**: Profiling and debugging
- **React DevTools Profiler**: Component performance
- **autocannon**: API load testing
- **artillery**: Advanced load testing

### Monitoring Tools

- **Sentry**: Error and performance tracking
- **LogRocket**: Session replay
- **New Relic**: APM
- **Datadog**: Infrastructure monitoring

---

## Conclusion

Performance optimization is an ongoing process. Regular monitoring, testing, and iterative improvements will ensure the Analytics Studio remains fast and responsive as it grows.

**Key Takeaways**:
1. **Measure First**: Always benchmark before optimizing
2. **Target Critical Path**: Focus on user-facing operations
3. **Cache Aggressively**: But invalidate intelligently
4. **Optimize Queries**: Database performance is crucial
5. **Monitor Continuously**: Catch regressions early

---

**Last Updated**: 2026-02-16
**Next Review**: 2026-03-16
