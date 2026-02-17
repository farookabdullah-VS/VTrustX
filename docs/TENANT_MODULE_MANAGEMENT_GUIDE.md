# Tenant & Module Management Guide

**Complete guide to managing tenants and their subscription modules**

**Date**: February 17, 2026
**Status**: ✅ Ready to Use

---

## Overview

The Tenant Management System allows global administrators to:
- Manage multiple tenants (organizations)
- Configure subscription modules per tenant
- Set resource limits and quotas
- Track billing information
- Monitor tenant usage

---

## Current System Status

### Tenants: 2
1. **Default Organization** (ID: 1)
   - Modules: 3 core modules enabled
2. **Farook Abdullah Ghani's Organization** (ID: 2)
   - Modules: 3 core modules enabled

### Modules Available: 19

#### Core Modules (Always Enabled):
- ✓ Surveys & Forms
- ✓ Dashboard
- ✓ Basic Reports

#### Premium Modules (Enable per tenant):
**Analytics** (3 modules):
- Analytics Studio
- Survey Analytics
- Sentiment Analysis

**Engagement** (1 module):
- Ticketing System

**Distribution** (2 modules):
- SmartReach
- A/B Testing

**Marketing** (2 modules):
- Social Media Marketing
- Social Listening

**CX** (2 modules):
- Customer Journey Maps
- CX Personas

**AI** (2 modules):
- AI Voice Agent
- Workflow Automation

**Enterprise** (4 modules):
- Single Sign-On
- Audit Logs
- API Access
- White Label

---

## Accessing Tenant Management

### Step 1: Login as Global Admin

**Requirements**:
- Role: `global_admin`
- OR Username: `admin`

### Step 2: Navigate to Tenant Management

**In Sidebar**:
```
Administration
└── Tenant Management ← Click here
```

**Or navigate to**:
```
/tenant-management
```

---

## Managing Tenants

### View All Tenants

**What you'll see**:
```
┌─────────────────────────────────────────────────┐
│ Tenant Management                   [+ Create] │
├─────────────────────────────────────────────────┤
│                                                 │
│ Default Organization             [Active]      │
│ • Users: 1                                      │
│ • Modules: 3                                    │
│ • Max Surveys: 100                              │
│ [Edit] [Modules] [Delete]                      │
│                                                 │
│ Farook Abdullah Ghani's Org      [Active]      │
│ • Users: 1                                      │
│ • Modules: 3                                    │
│ • Max Surveys: 100                              │
│ [Edit] [Modules] [Delete]                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### Create New Tenant

**Click "Create Tenant" button**

**Fill in form**:
```
Basic Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Organization Name *: [____________]
Domain: [____________]
Subdomain: [____________]
Contact Email: [____________]
Contact Phone: [____________]

Status & Limits:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: [Active ▼]
  • Active
  • Trial
  • Suspended
  • Inactive

Max Users: [10]
Max Surveys: [100]
Max Responses: [1000]
Storage Limit (MB): [1000]

Billing Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Billing Email: [____________]
Billing Address: [____________]
Tax ID: [____________]
Notes: [____________]

[Cancel] [Create Tenant]
```

**What happens**:
1. Tenant created in database
2. Core modules automatically assigned
3. Default limits applied
4. Ready for users to be added

---

### Edit Tenant

**Click "Edit" button on tenant card**

**Update any fields**:
- Organization name
- Contact information
- Status (Active/Trial/Suspended/Inactive)
- Resource limits (users, surveys, responses, storage)
- Billing information

**Click "Save Changes"**

---

### Delete Tenant

**Click "Delete" button**

**Confirmation**:
```
⚠️ Warning!

Are you sure you want to delete this tenant?

This action will:
• Delete all users in this tenant
• Delete all surveys and forms
• Delete all responses and data
• Delete all module assignments

This action cannot be undone!

[Cancel] [Yes, Delete Tenant]
```

---

## Managing Subscription Modules

### Step 1: Click "Modules" Button

**On tenant card, click "Modules"**

### Step 2: View Module Configuration

```
┌─────────────────────────────────────────────────┐
│ Subscription Modules                            │
│ Default Organization                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ CORE MODULES (Always Enabled)                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ ✓ Surveys & Forms         [Core - Required]    │
│ ✓ Dashboard               [Core - Required]    │
│ ✓ Basic Reports           [Core - Required]    │
│                                                 │
│ ANALYTICS                                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ ☐ Analytics Studio        [Enable]             │
│ ☐ Survey Analytics        [Enable]             │
│ ☐ Sentiment Analysis      [Enable]             │
│                                                 │
│ ENGAGEMENT                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ ☐ Ticketing System        [Enable]             │
│                                                 │
│ MARKETING                                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ ☐ Social Media Marketing  [Enable]             │
│ ☐ Social Listening        [Enable]             │
│                                                 │
│ [Cancel] [Save Module Configuration]           │
└─────────────────────────────────────────────────┘
```

### Step 3: Enable/Disable Modules

**Check boxes** to enable modules
**Uncheck boxes** to disable modules

**Core modules** cannot be disabled (always checked)

### Step 4: Save Configuration

**Click "Save Module Configuration"**

**What happens**:
1. Module assignments updated in database
2. Tenant gains/loses access to features
3. Sidebar menu updates for tenant users
4. Feature availability changes immediately

---

## Module Descriptions

### Core Modules (Required)

#### Surveys & Forms
- Create and manage surveys
- Form builder with drag-and-drop
- Question types and logic
- **Always enabled for all tenants**

#### Dashboard
- Main dashboard with metrics
- Quick insights and KPIs
- Recent activity
- **Always enabled for all tenants**

#### Basic Reports
- Standard reporting
- Export data
- Basic analytics
- **Always enabled for all tenants**

---

### Analytics Modules

#### Analytics Studio
**Advanced analytics workspace**
- Custom report builder
- Advanced visualizations
- Cross-survey analytics
- Data exploration tools

#### Survey Analytics
**Detailed survey performance**
- Response rates
- Completion rates
- Drop-off analysis
- Question-level insights

#### Sentiment Analysis
**AI-powered text analytics**
- Sentiment scoring
- Emotion detection
- Text classification
- Theme extraction

---

### Engagement Modules

#### Ticketing System
**Customer support tickets**
- Create and manage tickets
- Assignment and routing
- SLA tracking
- Response templates

---

### Distribution Modules

#### SmartReach
**Multi-channel distribution**
- Email campaigns
- SMS distribution
- WhatsApp integration
- QR codes
- Social media sharing

#### A/B Testing
**Survey optimization**
- Create A/B test variants
- Traffic splitting
- Performance comparison
- Winner selection

---

### Marketing Modules

#### Social Media Marketing
**Social campaigns**
- Campaign management
- Social media scheduling
- Performance tracking
- Engagement metrics

#### Social Listening
**Monitor conversations**
- Brand monitoring
- Sentiment tracking
- Trend analysis
- Alert system

---

### CX Modules

#### Customer Journey Maps
**Visual journey mapping**
- Journey builder
- Touchpoint management
- Pain point tracking
- Opportunity identification

#### CX Personas
**Customer personas**
- Persona builder
- Segment analysis
- Behavior tracking
- Journey linkage

---

### AI Modules

#### AI Voice Agent
**Voice survey agent**
- Voice-based surveys
- Natural conversation
- Speech recognition
- Call analytics

#### Workflow Automation
**Automated workflows**
- Trigger-based actions
- Email automation
- Conditional logic
- Integration webhooks

---

### Enterprise Modules

#### Single Sign-On
**SSO integration**
- SAML 2.0 support
- OAuth integration
- Azure AD
- Google Workspace

#### Audit Logs
**Comprehensive logging**
- User activity tracking
- System event logs
- Compliance reporting
- Export capabilities

#### API Access
**REST API & Webhooks**
- Full API access
- Webhook configuration
- API key management
- Rate limiting

#### White Label
**Custom branding**
- Custom domain
- Logo customization
- Color schemes
- Email templates

---

## API Endpoints

### Get All Tenants
```http
GET /api/tenants
Authorization: Bearer {token}
Requires: global_admin role
```

**Response**:
```json
[
  {
    "id": 1,
    "name": "Default Organization",
    "status": "active",
    "user_count": 1,
    "active_modules_count": 3,
    "max_users": 10,
    "max_surveys": 100,
    "max_responses": 1000
  }
]
```

### Get Available Modules
```http
GET /api/tenants/modules/available
Authorization: Bearer {token}
Requires: global_admin role
```

**Response**:
```json
[
  {
    "id": 1,
    "module_key": "surveys",
    "module_name": "Surveys & Forms",
    "description": "Create and manage surveys",
    "category": "core",
    "icon": "ClipboardList",
    "is_core": true,
    "is_active": true
  }
]
```

### Get Tenant Modules
```http
GET /api/tenants/:id/modules
Authorization: Bearer {token}
Requires: global_admin role
```

**Response**:
```json
[
  {
    "id": 1,
    "module_key": "surveys",
    "module_name": "Surveys & Forms",
    "enabled": true,
    "enabled_at": "2026-02-17T10:00:00Z",
    "expires_at": null
  }
]
```

### Update Tenant Modules
```http
POST /api/tenants/:id/modules
Authorization: Bearer {token}
Requires: global_admin role
Content-Type: application/json

{
  "modules": [
    {
      "module_id": 4,
      "enabled": true,
      "expires_at": null
    },
    {
      "module_id": 5,
      "enabled": true,
      "expires_at": "2026-12-31T23:59:59Z"
    }
  ]
}
```

---

## Use Cases

### Use Case 1: New Client Onboarding

**Scenario**: New enterprise client signs up

**Steps**:
1. Create new tenant (organization name, contact info)
2. Set resource limits based on plan
3. Enable required modules:
   - Core modules (automatic)
   - Analytics Studio
   - SmartReach
   - SSO
   - API Access
4. Create admin user for client
5. Client can now access features

---

### Use Case 2: Trial to Paid Conversion

**Scenario**: Trial client upgrades to paid plan

**Steps**:
1. Go to Tenant Management
2. Edit tenant
3. Change status from "Trial" to "Active"
4. Increase resource limits
5. Enable additional modules
6. Save changes
7. Client immediately gains access

---

### Use Case 3: Feature Gating

**Scenario**: Different pricing tiers with different features

**Starter Plan**:
- Core modules only
- Max 10 users, 100 surveys

**Professional Plan**:
- Core modules
- Analytics Studio
- Survey Analytics
- SmartReach
- Max 50 users, 500 surveys

**Enterprise Plan**:
- All modules
- Unlimited users and surveys

**Implementation**:
Enable/disable modules based on plan tier

---

### Use Case 4: Temporary Feature Access

**Scenario**: Give client 30-day trial of premium feature

**Steps**:
1. Go to Modules configuration
2. Enable "Analytics Studio"
3. Set expiration date: 30 days from now
4. Save
5. After 30 days, module automatically disabled

---

## Monitoring & Analytics

### Tenant Metrics

**Per Tenant**:
- User count
- Survey count
- Response count
- Storage used
- Active modules
- Last login date

### Module Metrics

**Per Module**:
- Total tenants using
- Usage frequency
- Popular modules
- Underutilized modules

---

## Best Practices

### 1. Resource Limits

**Set realistic limits**:
```
Starter: 10 users, 100 surveys, 1000 responses
Pro: 50 users, 500 surveys, 10000 responses
Enterprise: Unlimited
```

### 2. Module Bundling

**Create logical bundles**:
```
Analytics Bundle:
• Analytics Studio
• Survey Analytics
• Sentiment Analysis

Marketing Bundle:
• Social Media Marketing
• Social Listening
• SmartReach
```

### 3. Trial Configuration

**For trial tenants**:
- Status: "Trial"
- Set trial_ends_at date
- Enable all modules (full access)
- Lower resource limits
- Convert to paid after trial

### 4. Billing Tracking

**Keep billing info updated**:
- Billing email for invoices
- Billing address for tax purposes
- Tax ID for compliance
- Notes for special terms

---

## Troubleshooting

### Issue: Module not showing in tenant UI

**Check**:
1. Is module enabled in tenant configuration?
2. Is module marked as `is_active`?
3. Is user's role allowed to see module?
4. Refresh browser cache

### Issue: Cannot disable core module

**Expected behavior**: Core modules cannot be disabled

**Core modules**:
- Surveys & Forms
- Dashboard
- Basic Reports

These are always required and cannot be turned off.

### Issue: Tenant cannot access feature

**Check**:
1. Is tenant status "Active"?
2. Is module enabled for tenant?
3. Has module expired? (check expires_at)
4. Are resource limits reached?

---

## Summary

**Status**: ✅ Fully Operational

**Features**:
- Create, edit, delete tenants
- Configure subscription modules (19 available)
- Set resource limits and quotas
- Track billing information
- Module expiration support
- Global admin access only

**Modules Configured**:
- 3 core modules (always enabled)
- 16 premium modules (enable per tenant)

**Current Tenants**: 2
- Default Organization
- Farook Abdullah Ghani's Organization

**Ready to Use**: Yes
**Access**: `/tenant-management` (global admins only)

---

**Last Updated**: February 17, 2026
**Version**: 1.0.0

🎉 **Tenant management system is ready!**
