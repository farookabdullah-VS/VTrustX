# Automated Ticketing Email System: Implementation Plan

## 1. Executive Summary
This document outlines the architecture and implementation strategy for an automated email ticketing system within the RayiX platform. The system will handle the end-to-end lifecycle of support tickets generated via email, ensuring consistent and professional communication with customers at every stage (Creation, Assignment, Resolution, Closure) using customizable templates.

## 2. System Architecture

The system consists of three main modules:
1.  **Email Ingestion Service**: Listeners or webhooks to receive incoming emails.
2.  **Ticket Orchestrator**: Logic to parse emails, create tickets, and trigger workflow events.
3.  **Notification Engine**: Service to fetch templates, interpolate data, and dispatch emails.

### High-Level Data Flow
1.  **Customer** sends email to `support@rayix.com`.
2.  **Ingestion Service** parses the sender, subject, and body.
3.  **Ticket Orchestrator** creates a new Ticket record in the database.
4.  **Notification Engine** triggers the "Ticket Created" event:
    *   Fetches "Creation" template.
    *   Replaces placeholders (e.g., `{{ticket_id}}`).
    *   Sends acknowledgment email to Customer.
5.  **Agent** updates ticket status (e.g., Assigns to self, Resolves).
6.  **Notification Engine** detects status change and sends corresponding emails (Assigned, Resolved, Closed).

## 3. Database Schema Design

To support customizable templates, we will introduce a new table: `email_templates`.

```sql
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    stage_name VARCHAR(50) UNIQUE NOT NULL, -- 'creation', 'assignment', 'resolution', 'closure'
    subject_template VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Fields:**
*   `stage_name`: Identifies the lifecycle event.
*   `subject_template`: The email subject line supporting variables (e.g., `[Ticket #{{ticket_id}}] {{subject}}`).
*   `body_html`: The rich text HTML version of the email.
*   `body_text`: The plain text fallback version.

## 4. Feature Implementation Details

### 4.1. Email Ingestion (Ticket Creation)
*   **Methodology**: Use an email service provider's Inbound Parse Webhook (e.g., SendGrid, Mailgun) or an IMAP polling service.
*   **Logic**:
    *   **Sender**: Match `From` address to existing `customers`. If not found, auto-create a new Customer profile.
    *   **Ticket**: Create entry in `tickets` table with `source='EMAIL'`, `status='NEW'`, and `description=email_body`.

### 4.2. Lifecycle Notifications
The `TicketService` (backend logic) will emit events upon changes.

**A. Creation Stage**
*   **Trigger**: Successful INSERT into `tickets`.
*   **Action**: Send "Receipt" email.
*   **Template Context**: Ticket ID, Subject, Expected Response Time.

**B. Assignment Stage**
*   **Trigger**: Update `tickets.assigned_user_id`.
*   **Action**: Notify customer (optional) or just internal log. Usually, customers are notified "An agent is reviewing your case".
*   **Template Context**: Agent Name.

**C. Resolution Stage**
*   **Trigger**: Update `tickets.status` to 'RESOLVED'.
*   **Action**: Send "Solution Provided" email.
*   **Template Context**: Resolution Notes, Link to Reopen.

**D. Closure Stage**
*   **Trigger**: Update `tickets.status` to 'CLOSED'.
*   **Action**: Send "Ticket Closed" email + Survey Link (CSAT).

### 4.3. Template Management UI
A new settings page in the Admin Dashboard: **"Email Templates"**.

**User Interface Features:**
*   **List View**: Shows the 4 standard stages (Creation, Assignment, Resolution, Closure).
*   **Editor**: Clicking a stage opens the Editor.
*   **Tabs**:
    1.  **HTML Editor**: WYSIWYG editor (e.g., Quill, TinyMCE) for rich styling.
    2.  **Plain Text**: Simple textarea for fallback text.
    3.  **Preview**: Live render using sample dummy data.
*   **Variable Picker**: A sidebar listing available placeholders (`{{ticket_id}}`, `{{customer_name}}`, `{{status}}`, etc.) to drag-and-drop into the editor.

## 5. Configuration & Parameters

The system needs a centralized configuration mapping. This can be stored in the database or a config file.

**Example Configuration Object (JSON)**
```json
{
  "email_settings": {
    "sender_name": "RayiX Support",
    "sender_email": "support@rayix.com",
    "stages": {
      "creation": {
        "enabled": true,
        "default_subject": "Request Received: Ticket #{{ticket_id}}"
      },
      "assignment": {
        "enabled": true,
        "default_subject": "Update: Agent Assigned to Ticket #{{ticket_id}}"
      },
      "resolution": {
        "enabled": true,
        "default_subject": "Ticket Resolved: #{{ticket_id}}"
      },
      "closed": {
        "enabled": true,
        "default_subject": "Ticket Closed: #{{ticket_id}}"
      }
    }
  }
}
```

## 6. Implementation Roadmap

### Phase 1: Database & Backend Core
1.  Create `email_templates` table.
2.  Seed default templates for all 4 stages.
3.  Implement `EmailService` class with `sendTemplate(to, stage, context)` method.
4.  Add hooks in `TicketService` to call `EmailService` on status changes.

### Phase 2: Inbound Email Handler
1.  Set up API endpoint `POST /api/webhooks/inbound-email`.
2.  Implement logic to parse payload and create Ticket + Customer.

### Phase 3: Admin UI (Frontend)
1.  Create `EmailTemplatesSettings` component.
2.  Implement tabbed view (HTML/Text/Preview).
3.  Connect to `GET/PUT /api/settings/email-templates` API.

### Phase 4: Testing & UAT
1.  Unit test the template interpolation logic.
2.  End-to-End test: Send real email -> Verify Ticket -> Verify Auto-Response received.
