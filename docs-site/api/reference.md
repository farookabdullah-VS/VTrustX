# REST API Reference

The VTrustX REST API is fully documented via Swagger UI. When the server is running you can explore all endpoints interactively.

## Swagger UI

Start the server and open:

```
http://localhost:3000/api-docs
```

The UI lets you inspect request/response schemas and execute requests directly from the browser.

---

## Base URL

```
https://<your-domain>/api
```

All endpoints require authentication via httpOnly cookies unless marked **public**.

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create a new tenant and admin user |
| POST | `/auth/login` | Authenticate and receive tokens |
| POST | `/auth/refresh` | Rotate access + refresh tokens |
| POST | `/auth/logout` | Revoke refresh token, clear cookies |
| GET | `/auth/google` | Initiate Google OAuth2 flow |
| GET | `/auth/google/callback` | Google OAuth2 callback |
| GET | `/auth/microsoft` | Initiate Microsoft OAuth2 flow |
| GET | `/auth/microsoft/callback` | Microsoft OAuth2 callback |
| GET | `/auth/me` | Get current authenticated user |
| POST | `/auth/change-password` | Change authenticated user's password |

---

## Forms (Surveys)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/forms` | List all forms for the tenant |
| POST | `/forms` | Create a new form |
| GET | `/forms/:id` | Get form by ID |
| PUT | `/forms/:id` | Update a form |
| DELETE | `/forms/:id` | Delete a form and its submissions |
| GET | `/forms/slug/:slug` | Get a published form by slug (**public**) |
| POST | `/forms/:id/publish` | Publish a form directly |
| POST | `/forms/:id/request-approval` | Submit form for Maker-Checker approval |
| POST | `/forms/:id/approve` | Approve and publish a form |
| POST | `/forms/:id/reject` | Reject a pending form |
| POST | `/forms/:id/draft` | Create a new draft version |
| POST | `/forms/:id/check-password` | Verify a password-protected form (**public**) |
| POST | `/forms/:id/cooldown/check` | Check submission cooldown status (**public**) |
| DELETE | `/forms/:id/cooldown/clear` | Clear cooldown restrictions (admin) |
| GET | `/forms/:id/submissions/raw-data` | Fetch raw submission data for Analytics Studio |

---

## Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/daily-stats` | Daily completed/viewed counts (30 days) |
| GET | `/analytics/question-stats` | Per-question completion rates and distributions |
| GET | `/analytics/csat-stats` | CSAT/NPS daily timeline and form breakdown |
| GET | `/analytics/sentiment-timeline` | Hourly sentiment timeline (CX dashboard) |
| GET | `/analytics/detailed-responses` | Last 200 responses as question-answer rows |
| POST | `/analytics/key-drivers` | Pearson correlation key driver analysis |
| POST | `/analytics/text-analytics` | Word cloud and sentiment scoring |
| POST | `/analytics/nps-significance` | NPS Z-test for statistical significance |
| POST | `/analytics/cross-tab` | Cross-tabulation pivot table |
| POST | `/analytics/anomalies` | 2-sigma anomaly detection |
| GET | `/analytics/cache/stats` | Analytics cache statistics |
| GET | `/analytics/cache/health` | Analytics cache health |
| POST | `/analytics/cache/invalidate/:surveyId` | Invalidate cache for a survey |
| POST | `/analytics/query-data` | Paginated submission data with filters |
| POST | `/analytics/reports/:reportId/export/pdf` | Export report to PDF |
| POST | `/analytics/reports/:reportId/export/pptx` | Export report to PowerPoint |

### Power Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analytics/power-analysis/calculate-sample-size` | Calculate required sample size |
| POST | `/analytics/power-analysis/power-curve` | Generate power curve data |
| POST | `/analytics/power-analysis/calculate-mde` | Calculate minimum detectable effect |
| POST | `/analytics/power-analysis/estimate-duration` | Estimate experiment duration |
| GET | `/analytics/power-analysis/:id` | Get power analysis by ID |

---

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users in the tenant |
| POST | `/users` | Create a new user |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update a user |
| DELETE | `/users/:id` | Delete a user |

---

## CRM

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crm/tickets` | List CRM tickets |
| POST | `/crm/tickets` | Create a ticket |
| GET | `/crm/tickets/:id` | Get ticket by ID |
| PUT | `/crm/tickets/:id` | Update a ticket |
| DELETE | `/crm/tickets/:id` | Delete a ticket |

---

## Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/submissions` | Submit a survey response (**public**) |
| GET | `/submissions` | List submissions (tenant-scoped) |
| GET | `/submissions/:id` | Get submission by ID |

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Server error |
