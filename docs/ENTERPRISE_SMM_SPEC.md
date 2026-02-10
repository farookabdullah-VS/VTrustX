# Enterprise Social Media Marketing Module - Technical Specification
**Version**: 2.0 (Enterprise Merge)
**Date**: 2026-01-15

## 1. Overview
This module upgrades the VTrustX Social Media capabilities to an Enterprise-grade platform. It implementation is based on the `smm` database schema and a modular frontend architecture.

## 2. Architecture

### 2.1 Database Schema (`smm` namespace)
The module uses a strictly normalized schema separated from the public schema:
- **Tenancy**: `smm.org`, `smm.brand`, `smm.client`
- **RBAC**: `smm.user`, `smm.role`, `smm.permission`
- **Core**: `smm.campaign`, `smm.post`, `smm.post_version`
- **Workflow**: `smm.md_workflow`, `smm.workflow_instance`

### 2.2 Frontend Structure
**Entry Component**: `SocialMediaMarketing.jsx` (Acts as the Shell/Layout)

**Modules**:
1.  **Home**: Dashboard & Task Inbox
2.  **Content**: Campaigns, Posts, Calendar, Library
3.  **Publishing**: Queue management & Approval proofs
4.  **Engagement**: Unified Inbox & SLA monitor
5.  **Analytics**: Reporting & Insights
6.  **Compliance**: Rules engine & Banned terms
7.  **AI Studio**: Model configuration & Prompt templates
8.  **Admin**: Configuration & Integrations

### 2.3 API Layer
**Base URL**: `/api/v1/smm`
- `GET /campaigns`: List campaigns (Context aware)
- `POST /campaigns`: Create campaign
- `GET /posts`: List posts
- `GET /lookups/:code`: Fetch dynamic options

## 3. Implementation Status
- [x] **Schema Migration**: Applied SQL files 001-007.
- [x] **Backend Routing**: Registered `smm.js` routes.
- [x] **Frontend Layout**: Refactored to Sidebar Navigation.
- [x] **Campaign Integration**: Connected to `smm.campaign` table.

## 4. Next Steps
- Implement `WorkflowEngine` in backend to handle state transitions.
- Build `PostComposer` with channel-specific validation.
- Integrate `AiService` for content generation.
