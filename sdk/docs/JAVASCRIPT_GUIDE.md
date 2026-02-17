# JavaScript/TypeScript SDK Guide

**Complete guide for using VTrustX SDK in JavaScript and TypeScript projects**

---

## 📦 Installation

### NPM

```bash
npm install @vtrustx/sdk
```

### Yarn

```bash
yarn add @vtrustx/sdk
```

### Requirements

- Node.js 14+ or modern browser
- TypeScript 4.5+ (for TypeScript projects)

---

## 🚀 Quick Start

### Basic Setup

```typescript
import { VTrustXClient } from '@vtrustx/sdk';

// Initialize client
const client = new VTrustXClient('https://your-server.com/api');

// Login
await client.auth.login('admin@company.com', 'password123');

// Check if authenticated
if (client.auth.isAuthenticated()) {
  console.log('Logged in successfully!');
}
```

---

## 🔐 Authentication

### Login

```typescript
try {
  await client.auth.login('user@example.com', 'password');
  console.log('Login successful');
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### Logout

```typescript
await client.auth.logout();
```

### Check Authentication Status

```typescript
if (client.auth.isAuthenticated()) {
  const user = client.auth.getCurrentUser();
  console.log('Logged in as:', user.email);
}
```

---

## 📋 Working with Surveys

### List All Surveys

```typescript
const surveys = await client.forms.list();

surveys.forEach(survey => {
  console.log(`${survey.title} (ID: ${survey.id})`);
});
```

### Get Survey by ID

```typescript
const survey = await client.forms.getById('form-id-123');
console.log('Survey:', survey.title);
console.log('Questions:', survey.definition.pages);
```

### Get Survey by Slug

```typescript
const survey = await client.forms.getBySlug('nps-2026');
console.log('Survey URL:', `/s/${survey.slug}`);
```

### Create New Survey

```typescript
const newSurvey = await client.forms.create({
  title: 'Customer Satisfaction Survey',
  slug: 'csat-2026',
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

### Submit Survey Response

```typescript
await client.forms.submit('form-id-123', {
  satisfaction: 5,
  feedback: 'Great service!'
});
```

---

## 👥 User Management

### List Users

```typescript
const users = await client.users.list();
```

### Create User

```typescript
const newUser = await client.users.create({
  username: 'jdoe',
  email: 'jdoe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'editor'
});
```

### Update User

```typescript
await client.users.update('user-id', {
  role: 'admin'
});
```

### Delete User

```typescript
await client.users.delete('user-id');
```

---

## 🎫 CRM Tickets

### List Tickets

```typescript
const tickets = await client.crm.tickets.list();
```

### Create Ticket

```typescript
const ticket = await client.crm.tickets.create({
  subject: 'Login Issue',
  description: 'User cannot access dashboard',
  priority: 'high',
  status: 'open'
});
```

### Update Ticket

```typescript
await client.crm.tickets.update('ticket-id', {
  status: 'resolved',
  resolution: 'Password reset successful'
});
```

---

## 🧠 Survey Engine (Validation & Logic)

The Survey Engine provides client-side validation and logic processing.

### Initialize Engine

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
          validation: {
            minLength: 2,
            maxLength: 50
          }
        }
      ]
    }
  ]
};

const engine = new SurveyEngine(definition);
```

### Validate Answer

```typescript
const component = definition.screens[0].components[0];

// Validate user input
const isValid = engine.validateComponent(component, 'John Doe');
console.log('Valid:', isValid); // true

const invalidResult = engine.validateComponent(component, 'J');
console.log('Valid:', invalidResult); // false (too short)
```

### Get Next Screen (Skip Logic)

```typescript
const answers = {
  q1: 'John Doe',
  q2: 'yes'
};

const nextScreen = engine.getNextScreen('screen-1', answers);
console.log('Next screen:', nextScreen);
```

---

## 🎨 Rendering Surveys (Web)

### Using SurveyJS

VTrustX surveys are compatible with SurveyJS for web rendering.

```typescript
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';

// Get survey definition
const surveyData = await client.forms.getById('survey-id');

// Create SurveyJS model
const survey = new Model(surveyData.definition);

// Handle completion
survey.onComplete.add(async (sender) => {
  const results = sender.data;
  await client.forms.submit(surveyData.id, results);
  console.log('Survey submitted!');
});

// Render (React example)
<Survey model={survey} />
```

---

## 📊 Advanced Features

### Custom Headers

```typescript
const client = new VTrustXClient('https://api.example.com', {
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

### Timeout Configuration

```typescript
const client = new VTrustXClient('https://api.example.com', {
  timeout: 10000 // 10 seconds
});
```

### Error Handling

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

## 🧪 Testing

### Unit Tests

```typescript
import { VTrustXClient } from '@vtrustx/sdk';
import { describe, it, expect, beforeEach } from 'vitest';

describe('VTrustXClient', () => {
  let client: VTrustXClient;

  beforeEach(() => {
    client = new VTrustXClient('https://api.test.com');
  });

  it('should authenticate user', async () => {
    await client.auth.login('test@example.com', 'password');
    expect(client.auth.isAuthenticated()).toBe(true);
  });
});
```

### Mock Server

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        token: 'mock-token',
        user: { id: '1', email: 'test@example.com' }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 📦 TypeScript Types

### Survey Definition

```typescript
interface SurveyDefinition {
  title: string;
  description?: string;
  pages: Page[];
  theme?: Theme;
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

### Form Entity

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
```

---

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 📱 React Native

The SDK works in React Native with some considerations:

```typescript
// Install polyfills if needed
import 'react-native-url-polyfill/auto';

import { VTrustXClient } from '@vtrustx/sdk';

const client = new VTrustXClient('https://api.example.com');
```

---

## 🔄 Offline Support (Coming Soon)

```typescript
// Enable offline mode
const client = new VTrustXClient('https://api.example.com', {
  offline: {
    enabled: true,
    storage: 'indexeddb'
  }
});

// Queue submission for later
await client.forms.submitOffline('form-id', data);

// Sync when online
await client.sync();
```

---

## 📚 Complete API Reference

### VTrustXClient

```typescript
class VTrustXClient {
  auth: AuthModule;
  users: UsersModule;
  forms: FormsModule;
  crm: CRMModule;

  constructor(baseURL: string, options?: ClientOptions);
}
```

### Auth Module

```typescript
interface AuthModule {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getCurrentUser(): User | null;
}
```

### Forms Module

```typescript
interface FormsModule {
  list(): Promise<Form[]>;
  getById(id: string): Promise<Form>;
  getBySlug(slug: string): Promise<Form>;
  create(data: CreateFormData): Promise<Form>;
  update(id: string, data: UpdateFormData): Promise<Form>;
  delete(id: string): Promise<void>;
  submit(id: string, data: any): Promise<Submission>;
  getNativeDefinition(id: string): Promise<NativeSurveyDefinition>;
}
```

---

## 🐛 Debugging

### Enable Debug Logging

```typescript
const client = new VTrustXClient('https://api.example.com', {
  debug: true
});
```

### Inspect Requests

```typescript
client.on('request', (config) => {
  console.log('Request:', config.method, config.url);
});

client.on('response', (response) => {
  console.log('Response:', response.status, response.data);
});
```

---

## 📞 Support

- GitHub Issues: https://github.com/your-org/vtrustx/issues
- Documentation: https://docs.vtrustx.com
- Email: sdk@vtrustx.com

---

**Last Updated**: February 17, 2026
