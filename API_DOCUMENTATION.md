# VTrustX API Documentation

> Comprehensive REST API reference for the VTrustX Customer Experience Management Platform.
>
> **Base URL:** `/api`
>
> **Authentication:** Endpoints marked with **Auth: Yes** require a valid JWT token in the `Authorization: Bearer <token>` header. Some endpoints additionally require specific role-based permissions (noted where applicable).

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Tenants](#2-tenants)
3. [Users](#3-users)
4. [Roles](#4-roles)
5. [Forms (Surveys)](#5-forms-surveys)
6. [Submissions](#6-submissions)
7. [Quotas](#7-quotas)
8. [Workflows](#8-workflows)
9. [AI Services](#9-ai-services)
10. [AI Providers](#10-ai-providers)
11. [Agent Chat (Voice/Video Agent)](#11-agent-chat-voicevideo-agent)
12. [Insights](#12-insights)
13. [Analytics](#13-analytics)
14. [Reports](#14-reports)
15. [Exports](#15-exports)
16. [Folders](#16-folders)
17. [Shared Dashboards](#17-shared-dashboards)
18. [CRM (Ticketing System)](#18-crm-ticketing-system)
19. [Contacts](#19-contacts)
20. [Calls](#20-calls)
21. [CX Personas](#21-cx-personas)
22. [Customer 360](#22-customer-360)
23. [Customer Journeys (Orchestration)](#23-customer-journeys-orchestration)
24. [Customer Journey Mapping (CJM)](#24-customer-journey-mapping-cjm)
25. [CJM Export](#25-cjm-export)
26. [Plans & Pricing](#26-plans--pricing)
27. [Subscriptions & Billing](#27-subscriptions--billing)
28. [Settings](#28-settings)
29. [Admin (Global Administration)](#29-admin-global-administration)
30. [Files](#30-files)
31. [Integrations](#31-integrations)
32. [Notifications](#32-notifications)
33. [Email](#33-email)
34. [Distributions](#34-distributions)
35. [Reputation Management](#35-reputation-management)
36. [Directory (Contact 360)](#36-directory-contact-360)
37. [TextIQ (Text Analytics)](#37-textiq-text-analytics)
38. [Actions (Action Plans)](#38-actions-action-plans)

---

## 1. Authentication

Base path: `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Register a new user account and create a tenant organization |
| `POST` | `/auth/login` | No | Authenticate with username and password, returns JWT token |
| `GET` | `/auth/google` | No | Initiate Google OAuth2 authentication flow |
| `GET` | `/auth/google/callback` | No | Google OAuth2 callback handler, sets auth cookie and redirects |
| `GET` | `/auth/microsoft` | No | Initiate Microsoft OAuth2 authentication flow |
| `GET` | `/auth/microsoft/callback` | No | Microsoft OAuth2 callback handler, sets auth cookie and redirects |
| `GET` | `/auth/me` | No | Retrieve current user from httpOnly auth cookie (OAuth flow completion) |
| `POST` | `/auth/change-password` | Yes | Change the authenticated user's password (requires current password) |

---

## 2. Tenants

Base path: `/api/tenants`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/tenants/register` | No | Register a new organization with admin user (self-service onboarding) |

---

## 3. Users

Base path: `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users` | Yes | List all users for the tenant (supports search, status, role filters, pagination). Requires `users:view` permission |
| `POST` | `/users` | Yes | Create a new user (enforces plan user limits, hashes password). Requires `users:create` permission |
| `PUT` | `/users/:id` | Yes | Update user details (username, password, role, email, phone, status). Requires `users:update` permission |
| `PATCH` | `/users/:id/status` | Yes | Toggle user status (active, inactive, suspended). Requires `users:update` permission |
| `DELETE` | `/users/:id` | Yes | Delete a user (prevents self-deletion). Requires `users:delete` permission |

---

## 4. Roles

Base path: `/api/roles`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/roles` | Yes | List all custom roles for the tenant |
| `POST` | `/roles` | Yes | Create a new role with custom permissions |
| `PUT` | `/roles/:id` | Yes | Update role name, description, and permissions |
| `DELETE` | `/roles/:id` | Yes | Delete a role |

---

## 5. Forms (Surveys)

Base path: `/api/forms`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/forms` | Yes | List all forms for the tenant, ordered by last update. Requires `forms:view` permission |
| `GET` | `/forms/slug/:slug` | No | Get a published form by its public slug (for respondents). Enforces IP whitelist and publish status |
| `GET` | `/forms/:id` | Yes | Get a specific form by ID. Requires `forms:view` permission |
| `GET` | `/forms/:id/submissions/raw-data` | Yes | Get flattened raw submission data for a form (for Analytics Studio) |
| `POST` | `/forms` | Yes | Create a new form/survey. Requires `forms:create` permission |
| `PUT` | `/forms/:id` | Yes | Update form definition, settings, and configuration. Requires `forms:update` permission |
| `POST` | `/forms/:id/publish` | Yes | Directly publish a form (admin override). Requires `forms:update` permission |
| `POST` | `/forms/:id/request-approval` | Yes | Submit form for maker-checker approval workflow |
| `POST` | `/forms/:id/approve` | Yes | Approve a pending form (checker role, cannot approve own request) |
| `POST` | `/forms/:id/reject` | Yes | Reject a pending form approval request |
| `POST` | `/forms/:id/draft` | Yes | Create a new draft version of an existing form |
| `POST` | `/forms/:id/check-password` | No | Verify password for a password-protected form |
| `DELETE` | `/forms/:id` | Yes | Delete a form and all its submissions. Requires `forms:delete` permission |

---

## 6. Submissions

Base path: `/api/submissions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/submissions` | Yes | List submissions for the tenant (supports formId filter, pagination) |
| `GET` | `/submissions/:id` | Yes | Get a specific submission by ID |
| `GET` | `/submissions/:id/audit` | Yes | Get audit logs for a specific submission |
| `POST` | `/submissions` | No | Create a new submission (public endpoint for respondents). Validates quotas and response limits, triggers AI analysis and workflows |
| `PUT` | `/submissions/:id` | Yes | Update submission data |
| `PUT` | `/submissions/:id/analysis` | Yes | Store AI analysis results for a submission (internal service endpoint) |
| `DELETE` | `/submissions/:id` | Yes | Delete a specific submission |
| `DELETE` | `/submissions` | Yes | Delete all submissions for a form (requires formId query parameter) |

---

## 7. Quotas

Base path: `/api/quotas`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/quotas?formId=` | Yes | List all quotas for a specific form (with dynamic period counts) |
| `POST` | `/quotas` | Yes | Create a new quota rule with criteria matching, period resets, and actions |
| `PUT` | `/quotas/:id` | Yes | Update a quota rule (recalculates current count based on new criteria) |
| `DELETE` | `/quotas/:id` | Yes | Delete a quota rule |

---

## 8. Workflows

Base path: `/api/workflows`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/workflows` | Yes | List all automation workflows for the tenant (optional formId filter) |
| `GET` | `/workflows/:id` | Yes | Get a specific workflow by ID |
| `POST` | `/workflows` | Yes | Create a new automation workflow with trigger events, conditions, and actions |
| `PUT` | `/workflows/:id` | Yes | Update workflow name, conditions, and actions |
| `DELETE` | `/workflows/:id` | Yes | Delete a workflow |

---

## 9. AI Services

Base path: `/api/ai`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ai/generate` | Yes | Generate survey/form definition or text completion using AI |
| `POST` | `/ai/agent-interact` | Yes | Forward agent interaction prompts to the AI service |
| `POST` | `/ai/transcribe` | Yes | Transcribe audio file to text (uploads audio via multipart form) |
| `POST` | `/ai/upload-video` | Yes | Upload and transcribe video recording (stores file and transcript) |
| `POST` | `/ai/analyze-survey` | Yes | Generate AI executive analysis report for survey submissions (sentiment, strengths, weaknesses, recommendations) |

---

## 10. AI Providers

Base path: `/api/ai-providers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/ai-providers` | Yes | List all configured AI providers (API keys are masked) |
| `GET` | `/ai-providers/active` | Yes | Get the currently active AI provider |
| `POST` | `/ai-providers` | Yes | Add a new AI provider configuration (API key is encrypted at rest) |
| `POST` | `/ai-providers/:id/activate` | Yes | Set a specific provider as the active one (deactivates all others) |
| `DELETE` | `/ai-providers/:id` | Yes | Remove an AI provider configuration |

---

## 11. Agent Chat (Voice/Video Agent)

Base path: `/api/agent-chat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/agent-chat/forms` | Yes | List available surveys for the voice/video agent dropdown |
| `POST` | `/agent-chat/start` | No | Start a new AI agent survey session (greeting stage) |
| `POST` | `/agent-chat/chat` | No | Process a user message in an active agent session (handles greeting, consent, and survey stages) |
| `POST` | `/agent-chat/analyze` | No | AI-powered data analyst chat for a specific survey (aggregates stats and provides executive analysis) |
| `POST` | `/agent-chat/platform-agent` | No | Platform-wide AI agent with cross-platform intelligence (aggregates metrics from surveys, CJM, personas, tickets) |

---

## 12. Insights

Base path: `/api/insights`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/insights` | Yes | Fetch AI-generated insights for the tenant (supports submissionId and formId filters) |
| `POST` | `/insights` | Yes | Store a new AI-generated insight |

---

## 13. Analytics

Base path: `/api/analytics`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/analytics/daily-stats` | Yes | Daily submission overview with completion rates (last 30 days) |
| `GET` | `/analytics/question-stats` | Yes | Per-question analytics with completion rates and answer distributions |
| `GET` | `/analytics/csat-stats` | Yes | CSAT and NPS trend timelines with per-form performance breakdown |
| `GET` | `/analytics/sentiment-timeline` | Yes | Hourly sentiment timeline derived from CSAT scores |
| `GET` | `/analytics/detailed-responses` | Yes | Flattened question-answer response data with agent and group mapping |
| `POST` | `/analytics/key-drivers` | Yes | Pearson correlation key driver analysis against a target metric |
| `POST` | `/analytics/text-analytics` | Yes | Word cloud and sentiment analysis for open-ended text fields |
| `POST` | `/analytics/nps-significance` | Yes | NPS statistical significance Z-test (current vs. previous 30-day period) |
| `POST` | `/analytics/cross-tab` | Yes | Cross-tabulation pivot table (count or average operations) |
| `POST` | `/analytics/anomalies` | Yes | Statistical anomaly detection using 2-sigma control limits |

---

## 14. Reports

Base path: `/api/reports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/reports` | Yes | List all reports for the tenant |
| `GET` | `/reports/crm-stats` | Yes | CRM dashboard statistics (ticket status, priority, channel, SLA compliance) |
| `GET` | `/reports/agent-performance` | Yes | Agent performance metrics (tickets resolved, SLA breaches, avg resolution time) |
| `GET` | `/reports/sla-compliance` | Yes | SLA compliance report (overall, by week, by priority) |
| `GET` | `/reports/crm-trends` | Yes | CRM ticket volume trends (last 30 days) |
| `GET` | `/reports/powerbi` | No | Power BI OData feed endpoint (authenticated via secret query parameter) |
| `GET` | `/reports/export/spss/:formId` | Yes | Export form submissions as SPSS (.sav) file |
| `GET` | `/reports/public/:token` | No | Get a publicly shared report by token or slug |
| `POST` | `/reports` | Yes | Create a new report with layout, widgets, and theme |
| `POST` | `/reports/:id/publish` | Yes | Publish or unpublish a report (generates public share token) |
| `PUT` | `/reports/:id` | Yes | Update report layout, widgets, theme, and configuration |
| `DELETE` | `/reports/:id` | Yes | Delete a report |

---

## 15. Exports

Base path: `/api/exports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/exports/raw` | Yes | Generate raw data export (Excel/CSV). Requires `forms:view` permission. Returns async job ID |
| `POST` | `/exports/analytics` | Yes | Generate analytics export (PPTX, DOCX, XLSX, PDF). Requires `forms:view` permission |
| `POST` | `/exports/spss` | Yes | Generate SPSS (.sav) export. Requires `forms:view` permission |
| `POST` | `/exports/sql` | Yes | Generate SQL dump export. Requires `forms:view` permission |
| `POST` | `/exports/cleanup` | Yes | Manually trigger cleanup of old export files. Requires `admin:manage` permission |
| `GET` | `/exports/jobs/:id` | Yes | Get export job status and progress |
| `GET` | `/exports/download/:jobId` | Yes | Download a completed export file |
| `GET` | `/exports/history` | Yes | Get export job history for the current user (last 50 jobs) |
| `DELETE` | `/exports/jobs/:id` | Yes | Delete an export job and its associated file |

---

## 16. Folders

Base path: `/api/folders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/folders` | Yes | List folders for the current tenant/user (supports type filter: private/shared) |
| `POST` | `/folders` | Yes | Create a new folder (private or shared) |
| `PUT` | `/folders/:id` | Yes | Rename a folder |
| `DELETE` | `/folders/:id` | Yes | Delete a folder |

---

## 17. Shared Dashboards

Base path: `/api/shared`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/shared/create` | Yes | Create or retrieve a public share link for a form's dashboard |
| `GET` | `/shared/:token/view` | No | View a publicly shared dashboard (returns form definition and submissions) |

---

## 18. CRM (Ticketing System)

Base path: `/api/crm`

### Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/tickets` | Yes | List tickets with search, filters (status, priority, assignee, team, date range), sorting, and pagination |
| `GET` | `/crm/tickets/:id` | Yes | Get ticket detail with messages, contact, account, and assignee info |
| `GET` | `/crm/tickets/:id/transitions` | Yes | Get valid workflow status transitions for a ticket |
| `GET` | `/crm/tickets/:id/audit` | Yes | Get audit trail for a specific ticket |
| `POST` | `/crm/tickets` | Yes | Create a new ticket (auto-generates code, calculates SLA, auto-assigns via routing rules, triggers workflows and email notifications) |
| `POST` | `/crm/tickets/:id/messages` | Yes | Add a message (public or internal note) to a ticket |
| `PUT` | `/crm/tickets/bulk` | Yes | Bulk update multiple tickets (status, priority, assignment). Validates workflow transitions |
| `PUT` | `/crm/tickets/:id` | Yes | Update a ticket (validates workflow state transitions, triggers notifications for assignment/resolution/closure) |
| `POST` | `/crm/public/tickets` | No | Public ticket submission form (creates contact if needed, auto-assigns to General Support) |
| `POST` | `/crm/webhooks/email` | No | Inbound email webhook to auto-create tickets (authenticated via x-webhook-secret header) |

### Accounts & Contacts (CRM)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/accounts` | Yes | List all CRM accounts for the tenant |
| `POST` | `/crm/accounts` | Yes | Create a new CRM account |
| `GET` | `/crm/contacts` | Yes | List all CRM contacts for the tenant |
| `POST` | `/crm/contacts` | Yes | Create a new CRM contact |

### CRM Statistics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/crm/stats` | Yes | Ticket statistics by status, team, priority, and SLA breach count |

---

## 19. Contacts

Base path: `/api/contacts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/contacts` | Yes | List all contacts for the tenant |
| `POST` | `/contacts` | Yes | Create a contact with de-duplication (returns existing if email/mobile matches) |
| `PUT` | `/contacts/:id` | Yes | Update contact details |
| `DELETE` | `/contacts/:id` | Yes | Delete a contact |

---

## 20. Calls

Base path: `/api/calls`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/calls/initiate` | No | Initiate an AI-powered voice survey call to a contact |

---

## 21. CX Personas

Base path: `/api/cx-personas`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cx-personas` | Yes | List all CX personas for the tenant (summary: id, name, title, photo, updated_at) |
| `GET` | `/cx-personas/:id` | Yes | Get full persona details including layout configuration |
| `POST` | `/cx-personas` | Yes | Create a new CX persona with layout, tags, accent color, orientation, and mapping rules |
| `POST` | `/cx-personas/:id/clone` | Yes | Clone an existing persona as a draft copy |
| `PUT` | `/cx-personas/:id` | Yes | Update persona fields (auto-save compatible, partial updates supported) |
| `DELETE` | `/cx-personas/:id` | Yes | Delete a CX persona |

---

## 22. Customer 360

Base path: `/api/customer360`

### Profiles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/customer360` | Yes | List customer profiles for the tenant (latest 20) |
| `GET` | `/customer360/search` | Yes | Global customer search (supports exact and fuzzy match via match_type parameter) |
| `GET` | `/customer360/:id` | Yes | Get the Single Customer View (6-dimension mega-JSON: demographic, reachability, financial, behavioral, CX intelligence, AI predictions) |
| `POST` | `/customer360/profile` | Yes | Ingest or update a customer profile with identity resolution (links identities, contacts, and source systems) |
| `DELETE` | `/customer360/:id` | Yes | Delete a customer profile and all associated data (cascading cleanup) |

### Events & Interactions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/customer360/event` | Yes | Ingest a customer event (type, channel, timestamp, payload) |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/customer360/:id/products` | Yes | List products for a specific customer |
| `POST` | `/customer360/products` | Yes | Ingest a product record for a customer |

### Relationships

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/customer360/relationships` | Yes | Add a relationship between two customers |
| `DELETE` | `/customer360/relationships/:id` | Yes | Delete a customer relationship |

### Consent

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PUT` | `/customer360/:id/consent` | Yes | Update or create a consent record for a customer (grant/revoke) |

---

## 23. Customer Journeys (Orchestration)

Base path: `/api/journeys`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/journeys` | Yes | List all journeys for the tenant (includes active instance count) |
| `GET` | `/journeys/:id` | Yes | Get journey detail with the latest version definition (nodes and edges) |
| `POST` | `/journeys` | Yes | Create a new journey with an initial empty draft version |
| `PUT` | `/journeys/:id/definition` | Yes | Save the journey diagram definition (auto-versions) |
| `POST` | `/journeys/:id/publish` | Yes | Activate/publish a journey (marks latest version as active) |
| `DELETE` | `/journeys/:id` | Yes | Delete a journey and all its versions and instances |

---

## 24. Customer Journey Mapping (CJM)

Base path: `/api/cjm`

### Maps

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cjm` | Yes | List all journey maps (supports search, status filter, sort, createdBy filter) |
| `GET` | `/cjm/:id` | Yes | Get a specific journey map with full data |
| `POST` | `/cjm` | Yes | Create a new journey map |
| `PUT` | `/cjm/:id` | Yes | Update a journey map (auto-creates version snapshot before save) |
| `DELETE` | `/cjm/:id` | Yes | Delete a journey map with all versions, comments, and shares |
| `POST` | `/cjm/:id/duplicate` | Yes | Duplicate a journey map as a new draft |
| `POST` | `/cjm/:id/thumbnail` | Yes | Save a thumbnail preview image for a map |

### Versions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cjm/:id/versions` | Yes | List all versions of a journey map |
| `GET` | `/cjm/:id/versions/:vid` | Yes | Get a specific version's data |
| `POST` | `/cjm/:id/versions/:vid/restore` | Yes | Restore a previous version to the current map |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cjm/:id/comments` | Yes | List all comments on a journey map |
| `POST` | `/cjm/:id/comments` | Yes | Add a comment to a map (optionally scoped to a section/stage) |
| `PUT` | `/cjm/:id/comments/:cid` | Yes | Update a comment (resolve/unresolve or edit content) |
| `DELETE` | `/cjm/:id/comments/:cid` | Yes | Delete a comment |

### Sharing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/cjm/:id/share` | Yes | Share a map with a user or generate a public share link |
| `GET` | `/cjm/:id/shares` | Yes | List all shares for a map |
| `DELETE` | `/cjm/:id/shares/:sid` | Yes | Revoke a share |
| `GET` | `/cjm/shared/:token` | No | Access a shared map via public token (read-only or with permission) |

### Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cjm/templates/list` | Yes | List available templates (system and tenant-specific) |
| `POST` | `/cjm/templates` | Yes | Save the current map as a reusable template |
| `POST` | `/cjm/from-template/:tid` | Yes | Create a new map from a template |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cjm/:id/analytics` | Yes | Get computed analytics for a map (stage count, sentiment by stage, touchpoints, cell completeness) |

---

## 25. CJM Export

Base path: `/api/cjm-export`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/cjm-export/pdf` | Yes | Export a customer journey map as PDF |
| `POST` | `/cjm-export/pptx` | Yes | Export a customer journey map as PowerPoint (PPTX) |
| `POST` | `/cjm-export/excel-data` | Yes | Export a customer journey map as tabular data for Excel |

---

## 26. Plans & Pricing

Base path: `/api/plans`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/plans` | No | List all available plans with active discount calculations (public pricing page) |

---

## 27. Subscriptions & Billing

Base path: `/api/subscriptions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/subscriptions/me` | Yes | Get the current tenant's active subscription with plan details |
| `GET` | `/subscriptions/history` | Yes | Get subscription history for the tenant |
| `GET` | `/subscriptions/invoices` | Yes | Get billing/invoice history for the tenant |
| `POST` | `/subscriptions` | Yes | Create a new subscription (validates discount codes, generates invoice, updates tenant plan) |
| `POST` | `/subscriptions/:id/cancel` | Yes | Cancel an active subscription (downgrades tenant to free) |
| `POST` | `/subscriptions/:id/pause` | Yes | Pause an active subscription for up to 30 days |
| `POST` | `/subscriptions/:id/resume` | Yes | Resume a paused subscription |
| `PUT` | `/subscriptions/:id/upgrade` | Yes | Change subscription plan (upgrade or downgrade, generates upgrade invoice) |

---

## 28. Settings

Base path: `/api/settings`

### General Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/settings` | Yes | Get all platform settings (includes database config with masked password) |
| `POST` | `/settings` | Yes | Batch update settings (upserts key-value pairs, optionally updates .env for DB config) |
| `POST` | `/settings/test-email` | Yes | Send a test email to verify SMTP configuration |

### Subscription & Licensing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/settings/subscription` | Yes | Get current subscription info with plan features, usage, and limits |
| `POST` | `/settings/subscription/upgrade` | Yes | Upgrade the tenant plan. Requires `billing:update` permission |
| `POST` | `/settings/subscription/license` | Yes | Activate a license key to unlock a plan |

### Theme

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/settings/theme` | Yes | Get the tenant's current theme configuration |
| `POST` | `/settings/theme` | Yes | Update the tenant's theme configuration |
| `GET` | `/settings/theme/saved` | Yes | List saved theme presets |
| `POST` | `/settings/theme/saved` | Yes | Save a new theme preset |
| `DELETE` | `/settings/theme/saved/:id` | Yes | Delete a saved theme preset |

### Email Channels

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/settings/channels` | Yes | List configured email channels (IMAP/SMTP) for the tenant |
| `POST` | `/settings/channels` | Yes | Add a new email channel (password encrypted at rest) |
| `DELETE` | `/settings/channels/:id` | Yes | Delete an email channel |

### SLA Policies

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/settings/sla` | Yes | List SLA policies for the tenant |
| `POST` | `/settings/sla` | Yes | Create or update SLA policies (batch upsert by priority) |

### Email Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/settings/email-templates` | Yes | List all email templates |
| `PUT` | `/settings/email-templates/:id` | Yes | Update an email template (subject, HTML body, text body) |

### Assignment Rules

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/settings/assignment-rules` | Yes | List keyword-based ticket assignment rules |
| `POST` | `/settings/assignment-rules` | Yes | Create a keyword assignment rule |
| `DELETE` | `/settings/assignment-rules/:id` | Yes | Delete an assignment rule |

---

## 29. Admin (Global Administration)

Base path: `/api/admin`

> All admin endpoints require authentication and global admin or admin role.

### Statistics & Tenants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/stats` | Yes | Global platform usage statistics (total tenants, users, forms, submissions) |
| `GET` | `/admin/tenants` | Yes | List all organizations with user counts (supports search) |
| `POST` | `/admin/tenants` | Yes | Create a new tenant organization |
| `PUT` | `/admin/tenants/:id` | Yes | Update tenant details (name, subscription status, features) |
| `DELETE` | `/admin/tenants/:id` | Yes | Delete a tenant organization |
| `PUT` | `/admin/tenants/:id/plan` | Yes | Update tenant plan with duration (1_month, 1_year, forever) |
| `POST` | `/admin/tenants/:id/license` | Yes | Generate a signed license key for a tenant |

### Pricing Plans Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/plans` | Yes | List all pricing plans |
| `POST` | `/admin/plans` | Yes | Create a new pricing plan |
| `PUT` | `/admin/plans/:id` | Yes | Update a pricing plan |

---

## 30. Files

Base path: `/api/files`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/files/upload` | No | Upload a file (images, PDF, CSV, XLSX). Files are encrypted at rest. Max 10MB |
| `GET` | `/files/:filename` | No | Download/view an uploaded file (decrypted on the fly). Path traversal protection enforced |

---

## 31. Integrations

Base path: `/api/integrations`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/integrations` | Yes | List all integrations (e.g., Slack, Webhook, Power BI) |
| `POST` | `/integrations` | Yes | Create a new integration (prevents duplicates by provider) |
| `PUT` | `/integrations/:id` | Yes | Update integration settings (API key, webhook URL, active status, config) |

---

## 32. Notifications

Base path: `/api/notifications`

> All notification endpoints require authentication (applied via router-level middleware).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/notifications` | Yes | Get notifications for the current user (unread first, last 20) |
| `PUT` | `/notifications/:id/read` | Yes | Mark a single notification as read |
| `PUT` | `/notifications/read-all` | Yes | Mark all notifications as read |

---

## 33. Email

Base path: `/api/email`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/email/send` | Yes | Send batch emails to a list of recipients (uses SMTP or logs in mock mode) |

---

## 34. Distributions

Base path: `/api/distributions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/distributions/types` | No | Get available distribution channel types (email, SMS, WhatsApp, QR) |
| `GET` | `/distributions` | No | List all distribution campaigns |
| `POST` | `/distributions` | No | Create and execute a distribution campaign (sends email or SMS batch) |

---

## 35. Reputation Management

Base path: `/api/reputation`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/reputation/sources` | No | List connected review sources (Google Maps, Trustpilot, etc.) |
| `GET` | `/reputation/reviews` | No | Get reviews with AI sentiment analysis and tagging |
| `POST` | `/reputation/generate-reply` | No | Generate an AI-powered reply suggestion for a review |
| `GET` | `/reputation/benchmarks` | No | Get competitive benchmarking data |
| `POST` | `/reputation/sync` | No | Trigger a review sync/scrape from a source (auto-creates tickets for negative reviews) |

---

## 36. Directory (Contact 360)

Base path: `/api/directory`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/directory` | No | List CRM contacts with ticket counts (supports search) |
| `GET` | `/directory/:id/timeline` | No | Get a contact's 360-degree timeline (tickets, survey responses, combined chronologically) |

---

## 37. TextIQ (Text Analytics)

Base path: `/api/textiq`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/textiq/topics` | No | Get AI-analyzed topic bubbles from recent submission text data |
| `GET` | `/textiq/verbatims` | No | Get verbatim text responses filtered by topic (drill-down from topics analysis) |

---

## 38. Actions (Action Plans)

Base path: `/api/actions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/actions/plans` | Yes | List all action plans/goals for the tenant |
| `POST` | `/actions/plans` | Yes | Create a new action plan with target metric and owner |
| `GET` | `/actions/plans/:id/initiatives` | Yes | Get initiatives (tasks) linked to a specific action plan |

---

## Error Response Format

All endpoints return errors in a consistent JSON format:

```json
{
  "error": "Description of the error"
}
```

Common HTTP status codes used:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `202` | Accepted (async job started) |
| `204` | No Content (successful delete) |
| `400` | Bad Request (invalid input) |
| `401` | Unauthorized (missing or invalid token) |
| `402` | Payment Required |
| `403` | Forbidden (insufficient permissions or quota exceeded) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `500` | Internal Server Error |

---

## Authentication Flow

1. **Standard Login:** `POST /api/auth/login` with `{ username, password }` returns `{ user, token }`.
2. **OAuth Login:** Redirect to `/api/auth/google` or `/api/auth/microsoft`. After callback, token is set as httpOnly cookie. Call `GET /api/auth/me` to exchange the cookie for a JSON token.
3. **Using the Token:** Include `Authorization: Bearer <token>` header on all authenticated requests.
4. **Token Expiry:** Tokens are valid for 24 hours.

---

## Multi-Tenancy

All data is scoped to the authenticated user's `tenant_id`. Users can only access data belonging to their organization. Global admin endpoints under `/api/admin` provide cross-tenant visibility.

---

*Generated on 2026-02-11. This document covers all route files in `server/src/api/routes/`.*
