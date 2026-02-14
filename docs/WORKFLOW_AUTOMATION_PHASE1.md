# Workflow Automation - Phase 1: Execution Tracking & Enhanced Engine

## Overview

This document describes Phase 1 of the Advanced Workflow Automation enhancement for VTrustX. This phase adds comprehensive execution tracking, retry logic, enhanced condition evaluation, and more action types to the existing workflow infrastructure.

**Implementation Date**: February 14, 2026
**Status**: ✅ COMPLETE
**Impact**: HIGH
**Effort**: Medium (Week 1 of 3-week project)

---

## What's New in Phase 1

### 1. Execution History & Monitoring
- **`workflow_executions` table**: Tracks every workflow run with status, duration, results, and errors
- **`workflow_execution_logs` table**: Step-by-step logs for debugging (conditions, actions, delays)
- **Execution statistics**: Success/failure counts, average duration, last executed timestamp
- **Retry tracking**: Retry count, next retry time, error stack traces

### 2. Enhanced Workflow Engine
- **Consolidated service**: `WorkflowEngineService.js` consolidates the two previous engines (core & services)
- **OR/AND logic**: Support for complex condition logic (not just AND)
- **12 condition operators**: equals, not_equals, contains, not_contains, starts_with, ends_with, greater_than, less_than, >=, <=, is_empty, is_not_empty, matches_regex, in, not_in
- **9 action types**: send_email, create_ticket, update_field, send_notification, webhook, update_contact, add_tag, delay, sync_integration
- **Template variables**: {{variable}} syntax for dynamic content in actions
- **Nested field support**: Access nested data with dot notation (e.g., `user.profile.age`)

### 3. Retry Logic
- **Automatic retries**: Failed workflows automatically retry up to 3 times
- **Exponential backoff**: 1min → 5min → 15min retry delays
- **Retry scheduling**: `next_retry_at` field tracks when to retry
- **Manual retry**: API endpoint to manually trigger retry for failed executions

### 4. API Endpoints
- **GET /api/workflow-executions**: List executions with filtering (workflow, status, date range)
- **GET /api/workflow-executions/:id**: Get single execution with detailed logs
- **GET /api/workflow-executions/:id/logs**: Get step-by-step execution logs
- **POST /api/workflow-executions/:id/retry**: Manually retry a failed execution
- **GET /api/workflow-executions/stats/overview**: Execution statistics and trends
- **DELETE /api/workflow-executions/:id**: Delete execution record (admin)

### 5. Workflow Templates (Foundation)
- **`workflow_templates` table**: Pre-built workflows for common use cases
- **Template categories**: customer_service, sales, marketing, operations
- **Public/private templates**: System-wide or tenant-specific
- **Usage tracking**: Counts how many times template has been used

---

## Database Schema

### `workflow_executions` Table

Tracks each workflow run with complete execution context.

```sql
CREATE TABLE workflow_executions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_event VARCHAR(100) NOT NULL,  -- Event that triggered execution
    trigger_data JSONB,                    -- Context data (submission, ticket, etc.)
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, retrying
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,                   -- Execution time in milliseconds
    result JSONB,                          -- Execution results
    error TEXT,                            -- Error message if failed
    error_stack TEXT,                      -- Full stack trace for debugging
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP,               -- When to retry (if failed)
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workflow_executions_tenant ON workflow_executions(tenant_id);
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at);
CREATE INDEX idx_workflow_executions_next_retry ON workflow_executions(next_retry_at) WHERE next_retry_at IS NOT NULL;
```

### `workflow_execution_logs` Table

Step-by-step logs for each workflow execution (for debugging).

```sql
CREATE TABLE workflow_execution_logs (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,          -- Sequential step (1, 2, 3...)
    step_type VARCHAR(50) NOT NULL,        -- condition, action, delay, loop, branch
    step_name VARCHAR(255),                -- Human-readable name
    status VARCHAR(20) NOT NULL,           -- pending, running, completed, failed, skipped
    input_data JSONB,                      -- Step input
    output_data JSONB,                     -- Step output
    error TEXT,                            -- Error if step failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_execution_logs_execution ON workflow_execution_logs(execution_id);
CREATE INDEX idx_workflow_execution_logs_execution_step ON workflow_execution_logs(execution_id, step_number);
```

### `workflow_templates` Table

Pre-built workflows for common use cases.

```sql
CREATE TABLE workflow_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),                 -- customer_service, sales, marketing, operations
    use_case VARCHAR(255),                 -- Short use case description
    workflow_definition JSONB NOT NULL,    -- Complete workflow config
    icon VARCHAR(50),                      -- Icon name for UI
    tags TEXT[],                           -- Searchable tags
    is_public BOOLEAN NOT NULL DEFAULT true,
    tenant_id INTEGER,                     -- If set, template is private to tenant
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_public ON workflow_templates(is_public);
CREATE INDEX idx_workflow_templates_tenant ON workflow_templates(tenant_id);
CREATE INDEX idx_workflow_templates_tags ON workflow_templates USING gin(tags);
```

### Updates to `workflows` Table

Added execution statistics columns:

```sql
ALTER TABLE workflows ADD COLUMN execution_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workflows ADD COLUMN success_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workflows ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workflows ADD COLUMN last_executed_at TIMESTAMP;
ALTER TABLE workflows ADD COLUMN average_duration_ms INTEGER;
```

---

## API Reference

### List Workflow Executions

**GET /api/workflow-executions**

Query parameters:
- `workflowId` (integer, optional) - Filter by workflow ID
- `status` (string, optional) - Filter by status (pending, running, completed, failed, retrying)
- `limit` (integer, default: 50) - Results per page
- `offset` (integer, default: 0) - Pagination offset
- `startDate` (ISO 8601, optional) - Filter from date
- `endDate` (ISO 8601, optional) - Filter to date

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "tenant_id": 1,
      "workflow_id": 45,
      "workflow_name": "NPS Detractor Follow-up",
      "trigger_event": "submission_completed",
      "trigger_data": { "formId": 10, "submission": {...} },
      "status": "completed",
      "started_at": "2026-02-14T10:30:00Z",
      "completed_at": "2026-02-14T10:30:02Z",
      "duration_ms": 2340,
      "result": {
        "conditionsPassed": true,
        "actionsExecuted": 2,
        "actionResults": [...]
      },
      "retry_count": 0,
      "created_at": "2026-02-14T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Single Execution

**GET /api/workflow-executions/:id**

Returns execution details with step-by-step logs.

Response:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "workflow_id": 45,
    "workflow_name": "NPS Detractor Follow-up",
    "trigger_event": "submission_completed",
    "status": "completed",
    "duration_ms": 2340,
    "logs": [
      {
        "id": 1,
        "step_number": 1,
        "step_type": "condition",
        "step_name": "Evaluate Conditions",
        "status": "completed",
        "input_data": [...],
        "output_data": { "result": true },
        "duration_ms": 50
      },
      {
        "id": 2,
        "step_number": 2,
        "step_type": "action",
        "step_name": "send_email",
        "status": "completed",
        "input_data": {...},
        "output_data": { "sent": true },
        "duration_ms": 1200
      }
    ]
  }
}
```

### Get Execution Logs

**GET /api/workflow-executions/:id/logs**

Returns only the step-by-step logs (without full execution data).

### Retry Failed Execution

**POST /api/workflow-executions/:id/retry**

Manually trigger a retry for a failed execution.

Response:
```json
{
  "success": true,
  "message": "Workflow retry initiated",
  "data": {
    "originalExecutionId": 123,
    "newExecutionId": 124
  }
}
```

### Get Execution Statistics

**GET /api/workflow-executions/stats/overview**

Query parameters:
- `workflowId` (integer, optional) - Filter by workflow
- `startDate` (ISO 8601, optional) - Filter from date
- `endDate` (ISO 8601, optional) - Filter to date

Response:
```json
{
  "success": true,
  "data": {
    "statusBreakdown": [
      { "status": "completed", "count": 120, "avg_duration": 2300 },
      { "status": "failed", "count": 5, "avg_duration": 1200 }
    ],
    "dailyTrend": [
      { "date": "2026-02-01", "total": 15, "completed": 14, "failed": 1 },
      { "date": "2026-02-02", "total": 18, "completed": 18, "failed": 0 }
    ],
    "topWorkflows": [
      {
        "id": 45,
        "name": "NPS Detractor Follow-up",
        "execution_count": 85,
        "success_count": 83,
        "failure_count": 2,
        "avg_duration": 2300
      }
    ]
  }
}
```

---

## Enhanced Workflow Engine

### Condition Evaluation

#### Supported Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals`, `==` | Exact match | `{ field: "status", operator: "equals", value: "active" }` |
| `not_equals`, `!=` | Not equal | `{ field: "status", operator: "!=", value: "deleted" }` |
| `contains` | String contains (case-insensitive) | `{ field: "message", operator: "contains", value: "urgent" }` |
| `not_contains` | String does not contain | `{ field: "email", operator: "not_contains", value: "@spam.com" }` |
| `starts_with` | String starts with | `{ field: "name", operator: "starts_with", value: "John" }` |
| `ends_with` | String ends with | `{ field: "email", operator: "ends_with", value: "@company.com" }` |
| `greater_than`, `>` | Numeric greater than | `{ field: "nps_score", operator: ">", value: 8 }` |
| `less_than`, `<` | Numeric less than | `{ field: "nps_score", operator: "<", value: 7 }` |
| `greater_than_or_equal`, `>=` | Numeric >= | `{ field: "age", operator: ">=", value: 18 }` |
| `less_than_or_equal`, `<=` | Numeric <= | `{ field: "age", operator: "<=", value: 65 }` |
| `is_empty` | Field is empty/null/[] | `{ field: "notes", operator: "is_empty" }` |
| `is_not_empty` | Field has value | `{ field: "phone", operator: "is_not_empty" }` |
| `matches_regex` | Regex match | `{ field: "email", operator: "matches_regex", value: "^[a-z]+@" }` |
| `in` | Value in array | `{ field: "status", operator: "in", value: ["active", "pending"] }` |
| `not_in` | Value not in array | `{ field: "type", operator: "not_in", value: ["spam", "test"] }` |

#### OR/AND Logic

```json
{
  "conditions": [
    { "logic": "OR" },
    { "field": "nps_score", "operator": "<=", "value": 6 },
    { "field": "csat_score", "operator": "<", "value": 3 },
    { "field": "feedback", "operator": "contains", "value": "disappointed" }
  ]
}
```

With `logic: "OR"`, workflow runs if ANY condition matches.
With `logic: "AND"` (default), workflow runs if ALL conditions match.

#### Nested Fields

Access nested data with dot notation:

```json
{
  "field": "user.profile.age",
  "operator": ">=",
  "value": 18
}
```

This accesses: `data.user.profile.age`

### Action Types

#### 1. Send Email

Sends transactional email to recipient.

```json
{
  "type": "send_email",
  "config": {
    "to": "{{email}}",
    "subject": "Thank you for your feedback!",
    "body": "Hi {{firstName}}, thank you for rating us {{score}}/10.",
    "from": "support@company.com"
  }
}
```

#### 2. Create Ticket

Creates support/CRM ticket.

```json
{
  "type": "create_ticket",
  "config": {
    "title": "Negative feedback from {{customerName}}",
    "description": "Customer gave NPS score of {{nps_score}}. Response: {{feedback}}",
    "priority": "high",
    "assignee": 5
  }
}
```

#### 3. Update Field

Updates a field in any entity (ticket, contact, form, etc.).

```json
{
  "type": "update_field",
  "config": {
    "entity": "contact",
    "entityId": "{{contactId}}",
    "field": "status",
    "value": "vip"
  }
}
```

#### 4. Send Notification

Sends in-app notification to user.

```json
{
  "type": "send_notification",
  "config": {
    "userId": 10,
    "title": "New negative feedback alert",
    "message": "Customer {{customerName}} gave low rating",
    "type": "warning"
  }
}
```

#### 5. Call Webhook

Triggers external webhook with custom payload.

```json
{
  "type": "webhook",
  "config": {
    "url": "https://api.slack.com/webhooks/abc123",
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "body": {
      "text": "New NPS detractor: {{customerName}} - Score: {{nps_score}}"
    }
  }
}
```

#### 6. Update Contact

Updates contact record with new data.

```json
{
  "type": "update_contact",
  "config": {
    "contactId": "{{contactId}}",
    "updates": {
      "last_nps_score": "{{nps_score}}",
      "last_survey_date": "{{submittedAt}}",
      "segment": "detractor"
    }
  }
}
```

#### 7. Add Tag

Adds a tag to entity (contact, ticket, submission).

```json
{
  "type": "add_tag",
  "config": {
    "entity": "contact",
    "entityId": "{{contactId}}",
    "tag": "nps_detractor"
  }
}
```

#### 8. Delay

Pauses workflow execution for specified duration.

```json
{
  "type": "delay",
  "config": {
    "duration": 3600000  // 1 hour in milliseconds
  }
}
```

#### 9. Sync Integration

Syncs data with external integration (CRM, marketing automation, etc.).

```json
{
  "type": "sync_integration",
  "config": {
    "integration": "salesforce",
    "action": "update_lead",
    "payload": {
      "leadId": "{{salesforceLeadId}}",
      "nps_score": "{{nps_score}}",
      "last_survey_date": "{{submittedAt}}"
    }
  }
}
```

### Template Variables

Use `{{variable}}` syntax to inject dynamic data from trigger:

```json
{
  "type": "send_email",
  "config": {
    "to": "{{email}}",
    "subject": "Hi {{firstName}}!",
    "body": "Your NPS score was {{nps_score}}. Thank you!"
  }
}
```

Variables are replaced at runtime with actual values from `triggerData`.

---

## Usage Examples

### Example 1: NPS Detractor Follow-up

**Workflow Configuration:**
```json
{
  "name": "NPS Detractor Follow-up",
  "trigger_event": "submission_completed",
  "conditions": [
    { "logic": "AND" },
    { "field": "submission.data.q_nps", "operator": "<=", "value": 6 }
  ],
  "actions": [
    {
      "type": "create_ticket",
      "config": {
        "title": "NPS Detractor: {{submission.data.q_name}}",
        "description": "Customer gave NPS score of {{submission.data.q_nps}}. Feedback: {{submission.data.q_feedback}}",
        "priority": "high"
      },
      "critical": true
    },
    {
      "type": "send_email",
      "config": {
        "to": "manager@company.com",
        "subject": "NPS Alert: Detractor Response Received",
        "body": "Detractor alert for {{submission.data.q_name}} (score: {{submission.data.q_nps}})"
      }
    },
    {
      "type": "update_contact",
      "config": {
        "contactId": "{{submission.contactId}}",
        "updates": {
          "segment": "detractor",
          "last_nps_score": "{{submission.data.q_nps}}"
        }
      }
    }
  ],
  "is_active": true
}
```

**Execution Flow:**
1. Submission with NPS ≤ 6 triggers workflow
2. **Step 1** (Condition): Checks if NPS score is 6 or below → PASS
3. **Step 2** (Action): Creates high-priority ticket → SUCCESS
4. **Step 3** (Action): Sends email to manager → SUCCESS
5. **Step 4** (Action): Updates contact segment to "detractor" → SUCCESS
6. Workflow completes, statistics updated

### Example 2: Promoter Advocacy Campaign

**Workflow Configuration:**
```json
{
  "name": "NPS Promoter Advocacy",
  "trigger_event": "submission_completed",
  "conditions": [
    { "logic": "AND" },
    { "field": "submission.data.q_nps", "operator": ">=", "value": 9 }
  ],
  "actions": [
    {
      "type": "send_email",
      "config": {
        "to": "{{submission.data.q_email}}",
        "subject": "Thank you for being a valued customer!",
        "body": "Hi {{submission.data.q_name}}, we're thrilled you rated us {{submission.data.q_nps}}/10! Would you consider leaving a review?"
      }
    },
    {
      "type": "delay",
      "config": {
        "duration": 86400000  // Wait 24 hours
      }
    },
    {
      "type": "webhook",
      "config": {
        "url": "https://marketing-automation.com/api/trigger-campaign",
        "method": "POST",
        "body": {
          "email": "{{submission.data.q_email}}",
          "campaign": "referral_program"
        }
      }
    }
  ],
  "is_active": true
}
```

**Execution Flow:**
1. Submission with NPS ≥ 9 triggers workflow
2. **Step 1** (Condition): Checks if NPS score is 9 or above → PASS
3. **Step 2** (Action): Sends thank you email → SUCCESS
4. **Step 3** (Delay): Waits 24 hours → SUCCESS
5. **Step 4** (Webhook): Triggers referral campaign → SUCCESS

---

## Integration Points

### 1. Submission Processing

When a survey submission is completed, the workflow engine automatically checks for matching workflows.

**File**: `server/src/api/routes/submissions.js`

```javascript
const WorkflowEngineService = require('../../services/WorkflowEngineService');

// After submission is saved...
const tenantId = formData.tenant_id;

WorkflowEngineService.executeTriggeredWorkflows(
    'submission_completed',
    { formId: savedEntity.formId, submission: savedEntity },
    tenantId
).catch(err => logger.error('[Submissions] Workflow execution failed', { error: err.message }));
```

### 2. CRM Events (Future)

Workflow engine can also trigger on CRM events like ticket creation/update.

**Example:**
```javascript
WorkflowEngineService.executeTriggeredWorkflows(
    'ticket_created',
    { ticket: ticketData },
    tenantId
);
```

### 3. Scheduled Triggers (Future - Phase 2)

Time-based workflows (e.g., "7 days after submission, send follow-up").

---

## Error Handling & Retry Logic

### Retry Strategy

When a workflow execution fails:

1. **Immediate Failure**: Execution status set to `failed`, error logged
2. **Retry Schedule**: If retry_count < 3, schedule next retry:
   - Retry 1: After 1 minute
   - Retry 2: After 5 minutes
   - Retry 3: After 15 minutes
3. **Retry Execution**: Cron job checks for executions with `next_retry_at <= NOW()` and re-executes them
4. **Max Retries Reached**: After 3 failed attempts, execution marked as permanently failed

### Error Logging

All errors are logged with:
- Error message (`error` field)
- Full stack trace (`error_stack` field)
- Step-level errors in `workflow_execution_logs`

### Critical Actions

Mark actions as `critical: true` to stop execution on failure:

```json
{
  "type": "create_ticket",
  "config": {...},
  "critical": true  // If this fails, stop workflow
}
```

Non-critical actions will log errors but continue execution.

---

## Performance Considerations

### Database Indexes

Indexes ensure fast querying of executions:
- `tenant_id` - Multi-tenant filtering
- `workflow_id` - Filter by workflow
- `status` - Filter by status
- `created_at` - Date range queries
- `next_retry_at` - Retry scheduling

### Execution Cleanup

**Recommendation**: Implement a cleanup job to archive old executions:

```sql
-- Archive executions older than 90 days
DELETE FROM workflow_executions
WHERE created_at < NOW() - INTERVAL '90 days'
AND status IN ('completed', 'failed');
```

### Async Execution

All workflow executions are fire-and-forget (non-blocking):
- Submission response returns immediately
- Workflows execute asynchronously in background
- No impact on user experience

---

## Security & Multi-Tenancy

### Tenant Isolation

All workflow operations enforce tenant isolation:
- Executions filtered by `tenant_id`
- Workflows can only trigger for their tenant's data
- API endpoints verify tenant ownership

### Action Sandboxing

Actions are sandboxed within tenant context:
- Email actions use tenant's email configuration
- Webhook actions can only call explicitly configured URLs
- Database updates restricted to tenant's data

---

## Testing

### Unit Tests

Test the workflow engine service:

```javascript
const WorkflowEngineService = require('../services/WorkflowEngineService');

describe('WorkflowEngineService', () => {
    it('should execute workflow on matching trigger', async () => {
        const workflow = {
            id: 1,
            tenant_id: 1,
            trigger_event: 'submission_completed',
            conditions: [
                { field: 'submission.data.q_nps', operator: '<=', value: 6 }
            ],
            actions: [
                { type: 'send_email', config: { to: 'test@example.com', subject: 'Alert' } }
            ]
        };

        const triggerData = {
            submission: { data: { q_nps: 5 } }
        };

        const executionId = await WorkflowEngineService.executeWorkflow(workflow, triggerData);

        expect(executionId).toBeGreaterThan(0);
    });

    it('should skip workflow when conditions not met', async () => {
        // Test condition evaluation...
    });

    it('should retry failed executions', async () => {
        // Test retry logic...
    });
});
```

### Integration Tests

Test full workflow lifecycle from trigger to completion:

```javascript
describe('Workflow Integration', () => {
    it('should trigger workflow on submission and execute actions', async () => {
        // Create form
        // Create workflow
        // Submit form
        // Verify execution created
        // Verify actions executed
        // Check execution logs
    });
});
```

---

## Next Steps: Phase 2 & 3

### Phase 2: Visual Workflow Builder (Weeks 2-3)

- React Flow node-based editor
- Drag-and-drop action library
- Condition builder UI
- Workflow canvas with zoom/pan
- Template library integration
- Import/export workflows (JSON)

### Phase 3: Advanced Features (Week 4+)

- Branching (if/else logic)
- Loops (repeat until condition)
- Parallel actions
- Human-in-loop approvals
- Scheduled triggers (time-based)
- Webhook triggers (from external systems)
- Advanced integrations (Salesforce, HubSpot, etc.)

---

## Troubleshooting

### Workflow Not Triggering

1. **Check workflow is active**: `SELECT is_active FROM workflows WHERE id = ?`
2. **Verify trigger event matches**: Ensure `trigger_event` in workflow matches event being fired
3. **Check conditions**: Use execution logs to see if conditions passed
4. **Verify tenant_id**: Ensure workflow and trigger have matching tenant IDs

### Action Failing

1. **Check execution logs**: `GET /api/workflow-executions/:id/logs`
2. **Review error message**: Look at `error` field in failed step log
3. **Verify action config**: Ensure all required config fields are present
4. **Test template variables**: Verify {{variables}} are replaced correctly

### Retry Not Working

1. **Check retry count**: `SELECT retry_count, next_retry_at FROM workflow_executions WHERE id = ?`
2. **Verify retry cron job**: Ensure retry processor is running
3. **Check next_retry_at**: Should be a future timestamp
4. **Manual retry**: Use `POST /api/workflow-executions/:id/retry`

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Execution Rate**: Executions per hour/day
2. **Success Rate**: (success_count / execution_count) * 100
3. **Average Duration**: `average_duration_ms` for each workflow
4. **Failure Rate**: (failure_count / execution_count) * 100
5. **Retry Rate**: Executions with retry_count > 0

### Recommended Alerts

- **High Failure Rate**: Alert if failure rate > 10% over 1 hour
- **Long Duration**: Alert if average duration > 10 seconds
- **Stuck Executions**: Alert if execution stuck in "running" for > 5 minutes
- **Retry Exhaustion**: Alert when execution reaches max retries (3)

---

## Changelog

**February 14, 2026** - Phase 1 Released
- ✅ Created `workflow_executions` table
- ✅ Created `workflow_execution_logs` table
- ✅ Created `workflow_templates` table
- ✅ Built enhanced WorkflowEngineService
- ✅ Added OR/AND condition logic
- ✅ Added 15 condition operators
- ✅ Added 9 action types
- ✅ Implemented retry logic with exponential backoff
- ✅ Created API endpoints for execution history
- ✅ Integrated with submission processing
- ✅ Added template variable support

---

## References

- [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) - Overall roadmap
- [WorkflowEngineService.js](../server/src/services/WorkflowEngineService.js) - Core service
- [workflow-executions.js](../server/src/api/routes/workflow-executions.js) - API routes
- Migration: `1771086432273_add-workflow-executions-and-logs.js`

---

**Last Updated**: February 14, 2026
**Author**: Claude Sonnet 4.5
**Status**: ✅ Phase 1 Complete
