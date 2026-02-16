# Analytics Studio API Reference

Complete API documentation for the Analytics Studio backend endpoints.

**Base URL**: `https://your-app.com/api`
**Authentication**: JWT token in httpOnly cookie or Authorization header
**Content-Type**: `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Reports](#reports)
3. [Report Templates](#report-templates)
4. [Analytics Data](#analytics-data)
5. [Cohort Analysis](#cohort-analysis)
6. [Forecasting](#forecasting)
7. [Export](#export)
8. [Scheduled Reports](#scheduled-reports)
9. [Performance Metrics](#performance-metrics)
10. [Error Handling](#error-handling)

---

## Authentication

All endpoints require authentication unless otherwise specified.

**Methods**:
1. **Cookie**: `access_token` in httpOnly cookie (preferred)
2. **Header**: `Authorization: Bearer <token>`

**Example**:
```bash
curl -H "Authorization: Bearer your-token-here" \
  https://your-app.com/api/reports
```

---

## Reports

### List Reports

Get all reports for the authenticated user's tenant.

**Endpoint**: `GET /api/reports`

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Results per page (default: 50, max: 100)
- `sort` (string, optional): Sort field (default: "created_at")
- `order` (string, optional): "asc" or "desc" (default: "desc")

**Response**:
```json
{
  "reports": [
    {
      "id": "uuid",
      "title": "NPS Dashboard",
      "form_id": "survey-123",
      "layout": [...],
      "widgets": [...],
      "created_at": "2026-02-16T10:00:00Z",
      "updated_at": "2026-02-16T11:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 123,
    "pages": 3
  }
}
```

---

### Get Report

Get a specific report by ID.

**Endpoint**: `GET /api/reports/:id`

**Parameters**:
- `id` (string, required): Report UUID

**Response**:
```json
{
  "id": "uuid",
  "title": "NPS Dashboard",
  "form_id": "survey-123",
  "layout": [
    { "i": "widget-1", "x": 0, "y": 0, "w": 6, "h": 4 }
  ],
  "widgets": [
    {
      "id": "widget-1",
      "type": "kpi",
      "config": {
        "title": "Total Responses",
        "field": "response_count",
        "target": 1000
      }
    }
  ],
  "created_at": "2026-02-16T10:00:00Z",
  "updated_at": "2026-02-16T11:30:00Z"
}
```

---

### Create Report

Create a new report.

**Endpoint**: `POST /api/reports`

**Request Body**:
```json
{
  "title": "My New Report",
  "form_id": "survey-123",
  "layout": [],
  "widgets": []
}
```

**Response**: Returns created report object (201 Created)

---

### Update Report

Update an existing report.

**Endpoint**: `PUT /api/reports/:id`

**Request Body**:
```json
{
  "title": "Updated Title",
  "layout": [...],
  "widgets": [...]
}
```

**Response**: Returns updated report object

---

### Delete Report

Delete a report.

**Endpoint**: `DELETE /api/reports/:id`

**Response**:
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

---

## Report Templates

### List Templates

Get all available report templates.

**Endpoint**: `GET /api/report-templates`

**Query Parameters**:
- `category` (string, optional): Filter by category ("survey", "delivery", "sentiment", "mixed")

**Response**:
```json
[
  {
    "id": 1,
    "name": "NPS Overview Dashboard",
    "description": "Complete NPS analysis with trends and insights",
    "category": "survey",
    "thumbnail_url": "https://...",
    "layout": [...],
    "widgets": [...],
    "usage_count": 245,
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

---

### Create Report from Template

Create a new report based on a template.

**Endpoint**: `POST /api/report-templates/:id/create-report`

**Parameters**:
- `id` (integer, required): Template ID

**Request Body**:
```json
{
  "surveyId": "survey-123",
  "title": "My Custom NPS Report"
}
```

**Response**:
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "title": "My Custom NPS Report",
    ...
  }
}
```

---

## Analytics Data

### Query Survey Data

Query and filter survey response data with pagination.

**Endpoint**: `POST /api/analytics/query-data`

**Request Body**:
```json
{
  "surveyId": "survey-123",
  "page": 1,
  "pageSize": 100,
  "filters": {
    "nps_score": {
      "operator": "greaterThan",
      "value": 8
    },
    "created_at": {
      "operator": "between",
      "value": ["2026-01-01", "2026-02-01"]
    }
  },
  "sort": {
    "field": "created_at",
    "order": "desc"
  }
}
```

**Response**:
```json
{
  "data": [
    {
      "id": "response-1",
      "form_id": "survey-123",
      "response_data": {
        "nps_score": 9,
        "comment": "Great product!"
      },
      "created_at": "2026-02-16T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "totalCount": 1523,
    "totalPages": 16,
    "hasMore": true
  }
}
```

**Filter Operators**:
- `equals`: Exact match
- `contains`: Substring match (case-insensitive)
- `greaterThan`: Numeric greater than
- `lessThan`: Numeric less than
- `between`: Range (requires array of 2 values)
- `in`: Match any value in array

---

### Get Delivery Analytics Overview

Get multi-channel delivery performance metrics.

**Endpoint**: `GET /api/analytics/delivery/overview`

**Query Parameters**:
- `startDate` (string, optional): ISO 8601 date
- `endDate` (string, optional): ISO 8601 date
- `distributionId` (string, optional): Filter by distribution

**Response**:
```json
{
  "overview": {
    "totalSent": 10000,
    "delivered": 9500,
    "bounced": 300,
    "failed": 200,
    "opened": 6000,
    "clicked": 2500,
    "responded": 1200
  },
  "byChannel": {
    "email": {
      "sent": 5000,
      "delivered": 4800,
      "deliveryRate": 96.0,
      "openRate": 65.0,
      "clickRate": 35.0,
      "responseRate": 15.0,
      "healthScore": 85
    },
    "sms": {
      "sent": 3000,
      "delivered": 2950,
      "deliveryRate": 98.3,
      "responseRate": 12.0,
      "healthScore": 92
    },
    "whatsapp": {
      "sent": 2000,
      "delivered": 1950,
      "deliveryRate": 97.5,
      "responseRate": 20.0,
      "healthScore": 88
    }
  },
  "funnel": {
    "sent": 10000,
    "delivered": 9500,
    "opened": 6000,
    "started": 1500,
    "completed": 1200,
    "rates": {
      "deliveryRate": 95.0,
      "startRate": 25.0,
      "completionRate": 80.0,
      "abandonRate": 20.0
    }
  }
}
```

---

### Get Delivery Analytics Timeline

Get delivery metrics over time for charts.

**Endpoint**: `GET /api/analytics/delivery/timeline`

**Query Parameters**:
- `interval` (string, required): "hour", "day", "week", or "month"
- `startDate` (string, optional): ISO 8601 date
- `endDate` (string, optional): ISO 8601 date
- `channel` (string, optional): "email", "sms", or "whatsapp"

**Response**:
```json
[
  {
    "date": "2026-02-16",
    "sent": 450,
    "delivered": 430,
    "opened": 280,
    "responded": 125,
    "deliveryRate": 95.6,
    "responseRate": 29.1
  },
  {
    "date": "2026-02-17",
    "sent": 520,
    "delivered": 495,
    "opened": 320,
    "responded": 145,
    "deliveryRate": 95.2,
    "responseRate": 29.3
  }
]
```

---

## Cohort Analysis

### Analyze Cohorts

Perform cohort analysis on survey responses.

**Endpoint**: `POST /api/analytics/cohort/analyze`

**Request Body**:
```json
{
  "surveyId": "survey-123",
  "cohortBy": "month",
  "metric": "nps",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31"
}
```

**Parameters**:
- `cohortBy`: "day", "week", "month", or "quarter"
- `metric`: "nps", "count", "satisfaction", or custom field name

**Response**:
```json
[
  {
    "cohort": "2026-01",
    "cohortStart": "2026-01-01",
    "cohortEnd": "2026-01-31",
    "totalResponses": 450,
    "metricValue": 42.5,
    "trend": {
      "direction": "up",
      "change": 2.3,
      "percentChange": 5.7
    }
  },
  {
    "cohort": "2026-02",
    "cohortStart": "2026-02-01",
    "cohortEnd": "2026-02-28",
    "totalResponses": 520,
    "metricValue": 44.8,
    "trend": {
      "direction": "up",
      "change": 2.3,
      "percentChange": 5.4
    }
  }
]
```

---

### Analyze Retention

Track respondent retention across cohorts.

**Endpoint**: `POST /api/analytics/cohort/retention`

**Request Body**:
```json
{
  "surveyId": "survey-123",
  "cohortBy": "month",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31"
}
```

**Response**:
```json
[
  {
    "cohort": "2026-01",
    "totalRespondents": 350,
    "retentionRates": {
      "2026-01": 100.0,
      "2026-02": 35.7,
      "2026-03": 28.6,
      "2026-04": 22.9
    }
  }
]
```

---

## Forecasting

### Forecast Trend

Generate trend forecast using linear regression.

**Endpoint**: `POST /api/analytics/forecast/trend`

**Request Body**:
```json
{
  "surveyId": "survey-123",
  "metric": "nps",
  "periods": 7,
  "interval": "day",
  "startDate": "2026-01-01",
  "endDate": "2026-02-16"
}
```

**Parameters**:
- `metric`: Field to forecast
- `periods`: Number of periods to forecast (1-90)
- `interval`: "day", "week", or "month"
- `startDate`/`endDate`: Historical data range (optional)

**Response**:
```json
{
  "historical": [
    { "date": "2026-02-10", "value": 42.5 },
    { "date": "2026-02-11", "value": 43.2 },
    { "date": "2026-02-12", "value": 44.1 }
  ],
  "forecast": [
    {
      "periodLabel": "2026-02-17",
      "predicted": 45.3,
      "lowerBound": 42.1,
      "upperBound": 48.5,
      "confidence": 95
    },
    {
      "periodLabel": "2026-02-18",
      "predicted": 46.1,
      "lowerBound": 42.8,
      "upperBound": 49.4,
      "confidence": 95
    }
  ],
  "regression": {
    "slope": 0.85,
    "intercept": 40.2,
    "r2": 0.89,
    "mse": 1.23
  },
  "trend": {
    "direction": "increasing",
    "strength": "strong",
    "description": "Strong increasing trend with high confidence"
  }
}
```

**Trend Direction**:
- `increasing`: Positive slope
- `decreasing`: Negative slope
- `flat`: Near-zero slope

**Trend Strength**:
- `strong`: R² > 0.7
- `moderate`: R² 0.4-0.7
- `weak`: R² < 0.4

---

### Forecast Moving Average

Generate forecast using moving average.

**Endpoint**: `POST /api/analytics/forecast/moving-average`

**Request Body**:
```json
{
  "surveyId": "survey-123",
  "metric": "nps",
  "periods": 5,
  "window": 3,
  "interval": "day"
}
```

**Parameters**:
- `window`: Moving average window size (2-30)

**Response**:
```json
{
  "historical": [...],
  "movingAverages": [
    { "date": "2026-02-10", "value": 42.3 },
    { "date": "2026-02-11", "value": 43.1 }
  ],
  "forecast": [
    { "periodLabel": "2026-02-17", "predicted": 44.5 },
    { "periodLabel": "2026-02-18", "predicted": 44.5 }
  ],
  "window": 3
}
```

---

### Detect Seasonality

Detect seasonal patterns in data.

**Endpoint**: `POST /api/analytics/forecast/seasonality`

**Request Body**:
```json
{
  "surveyId": "survey-123",
  "metric": "nps",
  "interval": "month"
}
```

**Response**:
```json
{
  "hasSeasonality": true,
  "seasonalIndices": {
    "January": 0.92,
    "February": 0.95,
    "March": 1.08,
    "April": 1.12,
    "May": 1.05,
    ...
  },
  "strength": "moderate",
  "message": "Moderate seasonal pattern detected"
}
```

---

## Export

### Export to PDF

Generate PDF export of a report.

**Endpoint**: `POST /api/analytics/reports/:id/export/pdf`

**Parameters**:
- `id` (string, required): Report UUID

**Request Body**:
```json
{
  "orientation": "landscape",
  "includeCharts": true,
  "includeData": false,
  "dateRange": {
    "start": "2026-01-01",
    "end": "2026-02-16"
  }
}
```

**Response**:
```json
{
  "success": true,
  "fileUrl": "https://storage.googleapis.com/your-bucket/exports/report-123.pdf",
  "expiresAt": "2026-02-23T10:00:00Z",
  "fileSize": 2457600
}
```

**Notes**:
- File URL expires after 7 days
- File auto-deleted after 90 days
- Maximum report size: 50MB

---

### Export to PowerPoint

Generate PowerPoint export of a report.

**Endpoint**: `POST /api/analytics/reports/:id/export/powerpoint`

**Request Body**:
```json
{
  "includeTitleSlide": true,
  "chartsPerSlide": 1,
  "theme": "light"
}
```

**Response**: Same format as PDF export

---

## Scheduled Reports

### List Schedules

Get all scheduled reports.

**Endpoint**: `GET /api/scheduled-reports`

**Response**:
```json
[
  {
    "id": 1,
    "report_id": "uuid",
    "schedule_type": "weekly",
    "schedule_config": {
      "dayOfWeek": 1,
      "time": "09:00"
    },
    "recipients": ["user@example.com"],
    "format": "pdf",
    "is_active": true,
    "last_run_at": "2026-02-09T09:00:00Z",
    "next_run_at": "2026-02-16T09:00:00Z"
  }
]
```

---

### Create Schedule

Create a new scheduled report.

**Endpoint**: `POST /api/scheduled-reports`

**Request Body**:
```json
{
  "report_id": "uuid",
  "schedule_type": "weekly",
  "schedule_config": {
    "dayOfWeek": 1,
    "time": "09:00"
  },
  "recipients": ["user@example.com", "manager@example.com"],
  "format": "pdf",
  "is_active": true
}
```

**Schedule Types**:
- `daily`: Runs every day at specified time
- `weekly`: Runs on specified day of week
- `monthly`: Runs on specified day of month
- `custom`: Uses cron expression

**Response**: Returns created schedule object

---

### Update Schedule

Update an existing schedule.

**Endpoint**: `PUT /api/scheduled-reports/:id`

**Request Body**: Same as create, all fields optional

---

### Delete Schedule

Delete a schedule.

**Endpoint**: `DELETE /api/scheduled-reports/:id`

**Response**:
```json
{
  "success": true,
  "message": "Schedule deleted successfully"
}
```

---

## Performance Metrics

### Submit Client Performance Report

Submit client-side performance metrics for monitoring.

**Endpoint**: `POST /api/performance/client-report`

**Authentication**: Not required

**Request Body**:
```json
{
  "timestamp": "2026-02-16T10:00:00Z",
  "page": "analytics-studio",
  "version": "new",
  "userAgent": "Mozilla/5.0...",
  "summary": {
    "totalMeasurements": 15,
    "memoryUsage": {
      "usedJSHeapSize": 45000000,
      "jsHeapSizeLimit": 2197815296,
      "usedPercent": "2.05"
    }
  },
  "metrics": {
    "render": [
      { "label": "widget-render", "duration": 342, "type": "render" }
    ],
    "api": [
      { "label": "api:reports", "duration": 825, "type": "api" }
    ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Performance report received"
}
```

---

## Error Handling

### Error Response Format

All errors return consistent JSON format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation failed
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

### Common Error Codes

- `AUTH_REQUIRED`: Authentication token missing
- `AUTH_INVALID`: Invalid or expired token
- `PERMISSION_DENIED`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `VALIDATION_ERROR`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

### Rate Limiting

**Limits**:
- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Admin: 5000 requests/hour

**Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1676547600
```

---

## Versioning

**Current Version**: v1
**Base URL**: `/api` (implicit v1)
**Future Versions**: `/api/v2`, `/api/v3`, etc.

**Deprecation Policy**:
- 6 months notice before deprecation
- Old versions supported for 12 months after deprecation notice
- Breaking changes only in major versions

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for API changes and version history.

---

**Last Updated**: February 16, 2026
**API Version**: v1.0.0
