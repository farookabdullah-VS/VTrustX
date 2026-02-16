# Analytics Studio API Documentation

**Version:** 2.0
**Last Updated:** February 16, 2026
**Base URL:** `/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Report Templates](#report-templates)
3. [Reports & Data](#reports--data)
4. [Export](#export)
5. [Scheduled Reports](#scheduled-reports)
6. [Advanced Analytics](#advanced-analytics)
7. [Cache Management](#cache-management)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Examples](#examples)

---

## Authentication

All Analytics Studio API endpoints require authentication via JWT in httpOnly cookies.

**Headers:**
```http
Cookie: access_token=<jwt_token>
X-CSRF-Token: <csrf_token>
```

**Authentication Errors:**
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions

---

## Report Templates

### GET `/api/report-templates`

Get all public report templates.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category: `survey`, `delivery`, `sentiment`, `mixed` |

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "NPS Dashboard",
    "description": "Comprehensive NPS analysis with trends, distribution, and detractor management",
    "category": "survey",
    "layout": [
      {"i":"nps-score","x":0,"y":0,"w":3,"h":2},
      {"i":"response-count","x":3,"y":0,"w":3,"h":2}
    ],
    "widgets": [
      {
        "id": "nps-score",
        "type": "kpi",
        "config": {
          "title": "Net Promoter Score",
          "metric": "nps",
          "showTrend": true
        }
      }
    ],
    "thumbnail_url": "/templates/nps-overview.png",
    "is_public": true,
    "usage_count": 156,
    "created_at": "2026-02-15T10:00:00Z"
  }
]
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/report-templates?category=survey" \
  --cookie "access_token=$TOKEN"
```

---

### POST `/api/report-templates/:templateId/create-report`

Create a new report from a template.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `templateId` | integer | Template ID |

**Request Body:**
```json
{
  "surveyId": "form-uuid-123",
  "title": "Q1 2026 NPS Report"
}
```

**Response:** `201 Created`
```json
{
  "id": "report-uuid-456",
  "tenant_id": 1,
  "title": "Q1 2026 NPS Report",
  "form_id": "form-uuid-123",
  "layout": [...],
  "widgets": [...],
  "created_at": "2026-02-16T14:30:00Z"
}
```

**Errors:**
- `404 Not Found` - Template not found
- `400 Bad Request` - Invalid surveyId or missing title

---

## Reports & Data

### POST `/api/analytics/query-data`

Query survey response data with pagination and filtering.

**Request Body:**
```json
{
  "surveyId": "form-uuid-123",
  "filters": {
    "region": ["North", "South"],
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-02-16"
    }
  },
  "page": 1,
  "pageSize": 100
}
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "response-1",
      "form_id": "form-uuid-123",
      "respondent_email": "user@example.com",
      "data": {
        "nps_score": 9,
        "feedback": "Excellent service!"
      },
      "created_at": "2026-02-15T08:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "totalCount": 523,
    "totalPages": 6,
    "hasMore": true,
    "from": 1,
    "to": 100
  }
}
```

**Query Parameters:**
- `page` (default: 1, min: 1)
- `pageSize` (default: 100, max: 500)

**Caching:**
- Count queries: cached for 5 minutes
- Data queries: cached for 10 minutes (based on filters hash)

---

### GET `/api/reports`

Get all reports for the authenticated user's tenant.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `formId` | string | Filter by survey ID |
| `limit` | integer | Results per page (default: 20, max: 100) |
| `offset` | integer | Pagination offset (default: 0) |

**Response:** `200 OK`
```json
{
  "reports": [
    {
      "id": "report-uuid-789",
      "title": "Monthly NPS Report",
      "form_id": "form-uuid-123",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": "2026-02-15T16:45:00Z",
      "widgetCount": 8
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

### GET `/api/reports/:reportId`

Get a specific report by ID.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `reportId` | string (UUID) | Report ID |

**Response:** `200 OK`
```json
{
  "id": "report-uuid-789",
  "tenant_id": 1,
  "title": "Monthly NPS Report",
  "form_id": "form-uuid-123",
  "layout": [...],
  "widgets": [...],
  "filters": {},
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-02-15T16:45:00Z"
}
```

**Errors:**
- `404 Not Found` - Report not found or access denied

---

### POST `/api/reports`

Create a new report.

**Request Body:**
```json
{
  "title": "New Custom Report",
  "formId": "form-uuid-123",
  "layout": [],
  "widgets": []
}
```

**Response:** `201 Created`
```json
{
  "id": "report-uuid-new",
  "title": "New Custom Report",
  "form_id": "form-uuid-123",
  "layout": [],
  "widgets": [],
  "created_at": "2026-02-16T15:00:00Z"
}
```

---

### PUT `/api/reports/:reportId`

Update an existing report.

**Request Body:**
```json
{
  "title": "Updated Report Title",
  "layout": [...],
  "widgets": [...]
}
```

**Response:** `200 OK`
```json
{
  "id": "report-uuid-789",
  "title": "Updated Report Title",
  "updated_at": "2026-02-16T15:10:00Z"
}
```

---

### DELETE `/api/reports/:reportId`

Delete a report.

**Response:** `204 No Content`

---

## Export

### POST `/api/analytics/export/pdf`

Export a report to PDF format.

**Request Body:**
```json
{
  "reportId": "report-uuid-789",
  "options": {
    "orientation": "landscape",
    "includeCharts": true,
    "pageSize": "A4"
  }
}
```

**Options:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `orientation` | string | "landscape" | "landscape" or "portrait" |
| `includeCharts` | boolean | true | Include chart visualizations |
| `pageSize` | string | "A4" | "A4", "Letter", etc. |
| `margins` | object | `{top: 20, right: 20, bottom: 20, left: 20}` | Page margins in mm |

**Response:** `200 OK`
```json
{
  "url": "https://storage.googleapis.com/vtrustx-exports/report-789-1708099200.pdf?signed_url_expires=...",
  "filename": "Monthly_NPS_Report_2026-02-16.pdf",
  "size": 245760,
  "expiresAt": "2026-02-23T15:20:00Z"
}
```

**Processing Time:** 5-10 seconds for typical reports

**File Expiration:** Signed URLs expire after 7 days

**Errors:**
- `404 Not Found` - Report not found
- `500 Internal Server Error` - PDF generation failed (check Puppeteer installation)

---

### POST `/api/analytics/export/powerpoint`

Export a report to PowerPoint format.

**Request Body:**
```json
{
  "reportId": "report-uuid-789",
  "options": {
    "theme": "default",
    "includeNotes": false
  }
}
```

**Options:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `theme` | string | "default" | Presentation theme |
| `includeNotes` | boolean | false | Include speaker notes |
| `layout` | string | "LAYOUT_WIDE" | Slide layout preset |

**Response:** `200 OK`
```json
{
  "url": "https://storage.googleapis.com/vtrustx-exports/report-789-1708099200.pptx?signed_url_expires=...",
  "filename": "Monthly_NPS_Report_2026-02-16.pptx",
  "size": 512000,
  "expiresAt": "2026-02-23T15:25:00Z"
}
```

**Processing Time:** 8-15 seconds

---

### POST `/api/analytics/export/excel`

Export raw survey data to Excel format.

**Request Body:**
```json
{
  "surveyId": "form-uuid-123",
  "filters": {},
  "includeMetadata": true
}
```

**Response:** `200 OK`
```json
{
  "url": "https://storage.googleapis.com/vtrustx-exports/survey-123-1708099200.xlsx",
  "filename": "Survey_Responses_2026-02-16.xlsx",
  "rowCount": 523,
  "size": 89600,
  "expiresAt": "2026-02-23T15:30:00Z"
}
```

---

## Scheduled Reports

### GET `/api/analytics/schedules`

Get all scheduled reports for the tenant.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `isActive` | boolean | Filter by active status |
| `reportId` | string | Filter by report ID |

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "tenant_id": 1,
    "report_id": "report-uuid-789",
    "title": "Weekly NPS Report",
    "schedule_type": "weekly",
    "schedule_config": {
      "time": "09:00",
      "dayOfWeek": 1,
      "timezone": "America/New_York"
    },
    "recipients": ["manager@example.com", "team@example.com"],
    "format": "pdf",
    "is_active": true,
    "last_run_at": "2026-02-12T09:00:00Z",
    "last_run_status": "success",
    "next_run_at": "2026-02-19T09:00:00Z",
    "created_at": "2026-01-15T10:00:00Z"
  }
]
```

---

### POST `/api/analytics/schedules`

Create a new scheduled report.

**Request Body:**
```json
{
  "reportId": "report-uuid-789",
  "title": "Weekly NPS Report",
  "scheduleType": "weekly",
  "scheduleConfig": {
    "time": "09:00",
    "dayOfWeek": 1,
    "timezone": "America/New_York"
  },
  "recipients": ["manager@example.com"],
  "format": "pdf"
}
```

**Schedule Types:**
| Type | Required Config Fields |
|------|------------------------|
| `daily` | `time` |
| `weekly` | `time`, `dayOfWeek` (0-6, 0=Sunday) |
| `monthly` | `time`, `dayOfMonth` (1-31) |
| `custom` | `expression` (cron expression) |

**Response:** `201 Created`
```json
{
  "id": 2,
  "reportId": "report-uuid-789",
  "title": "Weekly NPS Report",
  "next_run_at": "2026-02-19T09:00:00Z",
  "created_at": "2026-02-16T15:40:00Z"
}
```

**Errors:**
- `400 Bad Request` - Invalid schedule configuration or cron expression
- `404 Not Found` - Report not found

---

### PUT `/api/analytics/schedules/:scheduleId`

Update a scheduled report.

**Request Body:**
```json
{
  "is_active": false,
  "recipients": ["new-manager@example.com"],
  "schedule_config": {
    "time": "10:00",
    "dayOfWeek": 2
  }
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "is_active": false,
  "next_run_at": "2026-02-20T10:00:00Z",
  "updated_at": "2026-02-16T15:45:00Z"
}
```

---

### DELETE `/api/analytics/schedules/:scheduleId`

Delete a scheduled report.

**Response:** `204 No Content`

---

### POST `/api/analytics/schedules/:scheduleId/execute`

Manually trigger a scheduled report (admin only).

**Response:** `200 OK`
```json
{
  "success": true,
  "executionTime": "2026-02-16T15:50:00Z",
  "emailsSent": 2
}
```

---

## Advanced Analytics

### POST `/api/analytics/cohorts`

Perform cohort analysis on survey responses.

**Request Body:**
```json
{
  "surveyId": "form-uuid-123",
  "groupBy": "month",
  "metric": "nps",
  "startDate": "2025-06-01",
  "endDate": "2026-02-16"
}
```

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `surveyId` | string | Survey to analyze |
| `groupBy` | string | `"day"`, `"week"`, `"month"`, `"quarter"` |
| `metric` | string | Metric to aggregate: `"nps"`, `"csat"`, `"count"`, etc. |
| `startDate` | string (ISO) | Optional start date |
| `endDate` | string (ISO) | Optional end date |

**Response:** `200 OK`
```json
{
  "cohorts": [
    {
      "cohort": "2025-06",
      "cohortLabel": "June 2025",
      "totalResponses": 142,
      "avgNPS": 43,
      "trend": "up",
      "trendPercent": 5.2
    },
    {
      "cohort": "2025-07",
      "cohortLabel": "July 2025",
      "totalResponses": 158,
      "avgNPS": 45,
      "trend": "up",
      "trendPercent": 4.7
    }
  ],
  "summary": {
    "totalCohorts": 9,
    "avgNPS": 44.2,
    "trend": "positive",
    "overallGrowth": 12.5
  }
}
```

**Caching:** Cached for 15 minutes

---

### POST `/api/analytics/forecast`

Generate predictive forecast for a metric using linear regression.

**Request Body:**
```json
{
  "surveyId": "form-uuid-123",
  "metric": "nps",
  "periods": 7,
  "interval": "day"
}
```

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `surveyId` | string | Survey to analyze |
| `metric` | string | Metric to forecast: `"nps"`, `"csat"`, `"response_rate"` |
| `periods` | integer | Number of periods to forecast (1-30) |
| `interval` | string | `"day"`, `"week"`, `"month"` |
| `confidence` | number | Confidence level (default: 0.95 for 95%) |

**Response:** `200 OK`
```json
{
  "historical": [
    {"period": 0, "periodLabel": "2026-02-09", "value": 42},
    {"period": 1, "periodLabel": "2026-02-10", "value": 44},
    {"period": 2, "periodLabel": "2026-02-11", "value": 43}
  ],
  "forecast": [
    {
      "period": 8,
      "periodLabel": "2026-02-17",
      "predicted": 46,
      "lowerBound": 41,
      "upperBound": 51,
      "confidence": 95
    },
    {
      "period": 9,
      "periodLabel": "2026-02-18",
      "predicted": 47,
      "lowerBound": 42,
      "upperBound": 52,
      "confidence": 95
    }
  ],
  "regression": {
    "slope": 0.85,
    "intercept": 40.2,
    "r2": 0.82,
    "mse": 2.1
  },
  "trend": {
    "direction": "increasing",
    "description": "Positive trend",
    "strength": "moderate"
  }
}
```

**Errors:**
- `400 Bad Request` - Insufficient data for forecasting (min 5 data points)
- `422 Unprocessable Entity` - Invalid metric or interval

---

### POST `/api/analytics/key-drivers`

Analyze key drivers of a target metric using correlation analysis.

**Request Body:**
```json
{
  "surveyId": "form-uuid-123",
  "targetMetric": "satisfaction",
  "candidateFields": ["product_quality", "customer_service", "price", "delivery"]
}
```

**Response:** `200 OK`
```json
{
  "drivers": [
    {
      "field": "customer_service",
      "fieldLabel": "Customer Service",
      "correlation": 0.78,
      "impact": "high",
      "direction": "positive"
    },
    {
      "field": "product_quality",
      "fieldLabel": "Product Quality",
      "correlation": 0.65,
      "impact": "high",
      "direction": "positive"
    }
  ],
  "summary": {
    "topDriver": "customer_service",
    "avgCorrelation": 0.58
  }
}
```

---

### POST `/api/analytics/text-analytics`

Analyze text responses with word frequency and sentiment.

**Request Body:**
```json
{
  "surveyId": "form-uuid-123",
  "textField": "feedback",
  "sentimentMetric": "sentiment_score",
  "maxWords": 50
}
```

**Response:** `200 OK`
```json
{
  "words": [
    {
      "text": "excellent",
      "value": 42,
      "sentiment": "positive",
      "sentimentScore": 0.85
    },
    {
      "text": "service",
      "value": 38,
      "sentiment": "neutral",
      "sentimentScore": 0.05
    }
  ],
  "summary": {
    "totalWords": 150,
    "uniqueWords": 89,
    "avgSentiment": 0.62,
    "sentimentDistribution": {
      "positive": 65,
      "neutral": 20,
      "negative": 15
    }
  }
}
```

---

## Cache Management

### GET `/api/analytics/cache/stats`

Get analytics cache statistics (admin only).

**Response:** `200 OK`
```json
{
  "hits": 1523,
  "misses": 342,
  "sets": 385,
  "deletes": 12,
  "errors": 0,
  "hitRate": 81.6,
  "totalOperations": 1865
}
```

---

### GET `/api/analytics/cache/health`

Get cache health status (admin only).

**Response:** `200 OK`
```json
{
  "isHealthy": true,
  "redis": {
    "connected": true,
    "memoryUsage": "12.5 MB",
    "keys": 247
  },
  "fallback": {
    "inUse": false,
    "entries": 0
  }
}
```

---

### POST `/api/analytics/cache/invalidate`

Invalidate cache for a specific survey (admin only).

**Request Body:**
```json
{
  "surveyId": "form-uuid-123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "deletedKeys": 15,
  "pattern": "analytics:*:form-uuid-123:*"
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service outage |

### Example Error Response

```json
{
  "error": "Report not found or access denied",
  "code": "NOT_FOUND",
  "details": {
    "reportId": "report-invalid-123",
    "tenantId": 1
  }
}
```

---

## Rate Limiting

Analytics endpoints are rate-limited to prevent abuse:

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Query Data | 100 requests | 1 minute |
| Export | 10 requests | 1 minute |
| Scheduled Reports | 20 requests | 1 minute |
| Advanced Analytics | 30 requests | 1 minute |
| Cache Management | 5 requests | 1 minute |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708099800
```

**Rate Limit Exceeded Response:**
```json
{
  "error": "Rate limit exceeded. Please try again in 42 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 42
}
```

---

## Examples

### Example 1: Create Report from Template

```javascript
// 1. Get templates
const templates = await axios.get('/api/report-templates?category=survey');
const npsTemplate = templates.data.find(t => t.name.includes('NPS'));

// 2. Create report from template
const report = await axios.post(`/api/report-templates/${npsTemplate.id}/create-report`, {
  surveyId: 'form-uuid-123',
  title: 'Q1 2026 NPS Dashboard'
});

console.log('Report created:', report.data.id);
```

---

### Example 2: Query Data with Pagination

```javascript
let allData = [];
let page = 1;
let hasMore = true;

while (hasMore) {
  const response = await axios.post('/api/analytics/query-data', {
    surveyId: 'form-uuid-123',
    filters: { region: ['North'] },
    page,
    pageSize: 100
  });

  allData = allData.concat(response.data.data);
  hasMore = response.data.pagination.hasMore;
  page++;
}

console.log(`Loaded ${allData.length} responses`);
```

---

### Example 3: Export Report to PDF

```javascript
// Generate PDF export
const exportResult = await axios.post('/api/analytics/export/pdf', {
  reportId: 'report-uuid-789',
  options: {
    orientation: 'landscape',
    includeCharts: true
  }
});

// Download PDF
window.open(exportResult.data.url, '_blank');

// URL expires in 7 days
console.log('Expires at:', exportResult.data.expiresAt);
```

---

### Example 4: Schedule Weekly Report

```javascript
// Create schedule
const schedule = await axios.post('/api/analytics/schedules', {
  reportId: 'report-uuid-789',
  title: 'Weekly NPS Report',
  scheduleType: 'weekly',
  scheduleConfig: {
    time: '09:00',
    dayOfWeek: 1, // Monday
    timezone: 'America/New_York'
  },
  recipients: [
    'manager@example.com',
    'team-lead@example.com'
  ],
  format: 'pdf'
});

console.log('Next run:', schedule.data.next_run_at);

// Later: Deactivate schedule
await axios.put(`/api/analytics/schedules/${schedule.data.id}`, {
  is_active: false
});
```

---

### Example 5: Forecast NPS for Next Week

```javascript
// Get forecast
const forecast = await axios.post('/api/analytics/forecast', {
  surveyId: 'form-uuid-123',
  metric: 'nps',
  periods: 7,
  interval: 'day'
});

console.log('Current NPS:', forecast.data.historical.slice(-1)[0].value);
console.log('Predicted NPS (7 days):', forecast.data.forecast.slice(-1)[0].predicted);
console.log('Trend:', forecast.data.trend.direction, forecast.data.trend.strength);
console.log('Model accuracy (R²):', forecast.data.regression.r2);
```

---

### Example 6: Analyze Cohorts

```javascript
// Get monthly cohort analysis
const cohorts = await axios.post('/api/analytics/cohorts', {
  surveyId: 'form-uuid-123',
  groupBy: 'month',
  metric: 'nps',
  startDate: '2025-06-01',
  endDate: '2026-02-16'
});

// Display cohorts
cohorts.data.cohorts.forEach(cohort => {
  console.log(`${cohort.cohortLabel}: ${cohort.avgNPS} (${cohort.trend} ${cohort.trendPercent}%)`);
});

console.log('Overall growth:', cohorts.data.summary.overallGrowth + '%');
```

---

## Changelog

### v2.0.0 (February 16, 2026)

**New Endpoints:**
- Report Templates: GET, POST create-report
- Export: POST /pdf, POST /powerpoint
- Scheduled Reports: GET, POST, PUT, DELETE, POST /execute
- Advanced Analytics: POST /cohorts, POST /forecast
- Cache Management: GET /stats, GET /health, POST /invalidate

**Updated Endpoints:**
- POST /query-data: Added pagination support (`page`, `pageSize`, `pagination` response)

**Deprecations:**
- None (all existing endpoints remain backwards compatible)

---

## Support

- **API Issues:** Create a GitHub issue with `api` label
- **Questions:** #api-support Slack channel
- **Documentation Bugs:** Submit a PR to `/docs`

---

**For more information, see:**
- [Migration Guide](./ANALYTICS_STUDIO_MIGRATION_GUIDE.md)
- [Feature Documentation](./ANALYTICS_STUDIO_FEATURES.md)
- [Developer Guide](./ANALYTICS_STUDIO_DEVELOPMENT.md)
