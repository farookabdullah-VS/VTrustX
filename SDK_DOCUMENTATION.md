# VTrustX SDK Documentation

## Overview

The **VTrustX SDK** provides a powerful, type-safe interface for integrating with the VTrustX Customer Experience (CX) platform. It allows developers to easily authenticate, manage surveys, access analytics, and interact with CRM features directly from their JavaScript or TypeScript applications.

## Installation

To install the SDK, run the following command in your project directory:

```bash
npm install @vtrustx/sdk
# or
yarn add @vtrustx/sdk
```

## Getting Started

### Initialization

Import the client and initialize it with your VTrustX API Base URL.

```typescript
import { VTrustXClient } from '@vtrustx/sdk';

// Initialize the client
const client = new VTrustXClient('https://api.vtrustx.com/api');
```

### Authentication

Before accessing protected resources, you must authenticate. The SDK handles token management automatically for subsequent requests.

```typescript
try {
  const authResponse = await client.auth.login('admin@yourcompany.com', 'your_password');
  console.log('Logged in as:', authResponse.user.username);
  
  // You can also access current user details later
  const user = await client.auth.me();
} catch (error) {
  console.error('Login failed:', error);
}
```

## Core Modules

### 1. Forms & Surveys

Retrieve survey definitions and submit responses.

*   **List Forms**: Get all available forms.
*   **Get Form**: Get details of a specific form by ID.
*   **Get by Slug**: Get details by friendly URL slug.
*   **Submit**: Post a new submission.

**Example:**

```typescript
// List all forms
const forms = await client.forms.list();

// Get a specific survey
const survey = await client.forms.getBySlug('nps-q1-2026');

// Submit a response
const response = await client.forms.submit(survey.id, {
  nps_score: 9,
  comment: "Great service!",
  custom_field: "VIP"
});
```

### 2. CRM (Customer Relationship Management)

Manage tickets and contacts programmatically.

**Tickets:**

```typescript
// List recent tickets
const tickets = await client.crm.tickets.list();

// Create a new support ticket
const newTicket = await client.crm.tickets.create({
  subject: "Login Issue",
  priority: "high",
  description: "User is unable to reset password",
  status: "open"
});
```

**Contacts:**

```typescript
// Retrieve all contacts
const contacts = await client.crm.contacts.list();
```

### 3. User Management

Administer users within your organization.

```typescript
// List all users
const users = await client.users.list();

// Create a new user
const newUser = await client.users.create({
  username: "new_manager",
  email: "manager@company.com",
  role: "editor"
});
```

### 4. Analytics

Retrieve aggregated platform stats.

```typescript
const stats = await client.analytics.dailyStats();
console.log('Daily Submissions:', stats.submission_count);
```

## Error Handling

The SDK provides a structured error response. All API calls throw an error object if the request fails.

```typescript
try {
  await client.forms.get('invalid-id');
} catch (error) {
  console.error('Error Code:', error.code); // e.g. 404
  console.error('Message:', error.error);   // e.g. "Form not found"
}
```

## Type Definitions

The SDK exports comprehensive TypeScript definitions for all entities:
*   `User`
*   `Form`
*   `Submission`
*   `Ticket`
*   `Contact`
*   `Report`
*   `AuthResponse`

```typescript
import { Form, User } from '@vtrustx/sdk';
```

## Native Mobile SDKs

For native iOS and Android integration, please refer to the specific platform guides:

*   **[Android SDK Guide](client/android-sdk/docs/ANDROID_GUIDE.md)**
*   **[iOS SDK Guide](client/ios-sdk/docs/IOS_GUIDE.md)**

---
*Generated for VTrustX Client Integration*
