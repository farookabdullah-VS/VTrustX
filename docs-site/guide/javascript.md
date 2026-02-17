# JavaScript / TypeScript Guide

Complete guide for using the VTrustX SDK in JavaScript and TypeScript projects.

## Installation

```bash
npm install @vtrustx/sdk
# or
yarn add @vtrustx/sdk
```

**Requirements:** Node.js 16+ or a modern browser. TypeScript 4.5+ for typed projects.

---

## Quick Start

```typescript
import { VTrustXClient } from '@vtrustx/sdk';

const client = new VTrustXClient('https://your-server.com/api');

await client.auth.login('admin@company.com', 'password123');

if (client.auth.isAuthenticated()) {
  console.log('Logged in successfully!');
}
```

---

## Authentication

### Login

```typescript
try {
  await client.auth.login('user@example.com', 'password');
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### Logout

```typescript
await client.auth.logout();
```

### Check Status

```typescript
if (client.auth.isAuthenticated()) {
  const user = client.auth.getCurrentUser();
  console.log('Logged in as:', user.username);
}
```

---

## Surveys (Forms)

### List All Surveys

```typescript
const surveys = await client.forms.list();
surveys.forEach(s => console.log(`${s.title} — ID: ${s.id}`));
```

### Get Survey by ID

```typescript
const survey = await client.forms.getById('form-id-123');
console.log('Questions:', survey.definition.pages);
```

### Get Survey by Slug

```typescript
const survey = await client.forms.getBySlug('nps-2026');
console.log('URL:', `/s/${survey.slug}`);
```

### Create a Survey

```typescript
const newSurvey = await client.forms.create({
  title: 'Customer Satisfaction Survey',
  definition: {
    title: 'Customer Satisfaction Survey',
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you?',
            rateMin: 1,
            rateMax: 5
          }
        ]
      }
    ]
  },
  isPublished: false
});
```

### Submit a Response

```typescript
await client.forms.submit('form-id-123', {
  satisfaction: 5,
  feedback: 'Great service!'
});
```

---

## User Management

```typescript
// List users
const users = await client.users.list();

// Create a user
const newUser = await client.users.create({
  username: 'jdoe',
  email: 'jdoe@example.com',
  role: 'editor'
});

// Update a user
await client.users.update('user-id', { role: 'admin' });

// Delete a user
await client.users.delete('user-id');
```

---

## CRM Tickets

```typescript
// List tickets
const tickets = await client.crm.tickets.list();

// Create a ticket
const ticket = await client.crm.tickets.create({
  subject: 'Login Issue',
  description: 'User cannot access dashboard',
  priority: 'high',
  status: 'open'
});

// Update a ticket
await client.crm.tickets.update('ticket-id', {
  status: 'resolved',
  resolution: 'Password reset successful'
});
```

---

## Survey Engine (Validation & Logic)

```typescript
import { SurveyEngine, NativeSurveyDefinition } from '@vtrustx/sdk';

const definition: NativeSurveyDefinition = {
  screens: [
    {
      id: 'screen-1',
      components: [
        {
          id: 'q1',
          type: 'text',
          question: 'What is your name?',
          required: true,
          validation: { minLength: 2, maxLength: 50 }
        }
      ]
    }
  ]
};

const engine = new SurveyEngine(definition);

// Validate an answer
const isValid = engine.validateComponent(definition.screens[0].components[0], 'John Doe');

// Get the next screen (skip logic)
const nextScreen = engine.getNextScreen('screen-1', { q1: 'John Doe' });
```

---

## Advanced Configuration

```typescript
// Custom headers
const client = new VTrustXClient('https://api.example.com', {
  headers: { 'X-Custom-Header': 'value' }
});

// Custom timeout
const client2 = new VTrustXClient('https://api.example.com', {
  timeout: 10000
});

// Debug mode
const client3 = new VTrustXClient('https://api.example.com', {
  debug: true
});
```

---

## Error Handling

```typescript
try {
  await client.forms.getById('invalid-id');
} catch (error) {
  if (error.response?.status === 404) {
    console.error('Survey not found');
  } else if (error.response?.status === 401) {
    console.error('Authentication required');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

## TypeScript Types

```typescript
interface Form {
  id: string;
  title: string;
  slug: string;
  definition: SurveyDefinition;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SurveyDefinition {
  title: string;
  description?: string;
  pages: Page[];
}

interface Page {
  name?: string;
  elements: Question[];
}

interface Question {
  type: 'text' | 'rating' | 'boolean' | 'dropdown' | 'radiogroup';
  name: string;
  title: string;
  isRequired?: boolean;
  choices?: string[];
}
```

---

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## Support

- GitHub Issues: https://github.com/vtrustx/vtrustx/issues
- Email: sdk@vtrustx.com
