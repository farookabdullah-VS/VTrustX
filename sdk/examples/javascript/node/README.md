# Node.js Backend Example

Backend automation and integration examples using VTrustX SDK.

## Features

- ✅ Full API client implementation
- ✅ Authentication with token management
- ✅ Survey creation automation
- ✅ User management
- ✅ Data export scripts
- ✅ Bulk operations support

## Installation

```bash
npm install
```

## Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
API_URL=http://localhost:3000/api
EMAIL=admin@vtrustx.com
PASSWORD=admin123
```

## Usage

### Create Survey

```bash
npm run create-survey
```

Programmatically creates and publishes a customer satisfaction survey.

### List Users

```bash
npm run list-users
```

Displays all users with their roles and permissions.

### Export Data

```bash
npm run export-data
```

Exports all survey responses to JSON files.

## Scripts Overview

### `client.js`
Full-featured VTrustX API client with:
- Authentication
- Forms/Surveys management
- Submissions handling
- User management
- Role management
- Tenant management
- Analytics
- Export functionality

### `create-survey.js`
Example of programmatic survey creation:
- Login
- Create survey with definition
- Publish survey
- Get public URL

### `list-users.js`
User management example:
- Fetch all users
- Display user details
- List available roles

### `export-data.js`
Data export automation:
- Fetch all surveys
- Get submissions for each
- Export to JSON files
- Timestamped exports

## Client API Reference

```javascript
import { VTrustXClient } from './client.js';

const client = new VTrustXClient('http://localhost:3000/api');

// Authentication
await client.login('email@example.com', 'password');
await client.logout();
client.isAuthenticated(); // boolean

// Forms
await client.getForms();
await client.getForm(id);
await client.getFormBySlug(slug);
await client.createForm(data);
await client.updateForm(id, data);
await client.deleteForm(id);
await client.publishForm(id);

// Submissions
await client.getSubmissions(formId);
await client.submitForm(formId, data, metadata);

// Users
await client.getUsers();
await client.getUser(id);
await client.createUser(data);
await client.updateUser(id, data);
await client.deleteUser(id);

// Export
await client.exportSubmissions(formId, format);
```

## Advanced Examples

### Bulk User Creation

```javascript
const users = [
  { email: 'user1@example.com', role: 'editor' },
  { email: 'user2@example.com', role: 'viewer' }
];

for (const userData of users) {
  await client.createUser({
    ...userData,
    username: userData.email.split('@')[0],
    password: 'temp123'
  });
  console.log(`Created: ${userData.email}`);
}
```

### Survey Analytics

```javascript
const analytics = await client.getAnalytics(surveyId);
console.log(`Total responses: ${analytics.totalResponses}`);
console.log(`Completion rate: ${analytics.completionRate}%`);
```

### Scheduled Export

```javascript
import cron from 'node-cron';

// Export data every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily export...');
  // Your export logic here
});
```

## Error Handling

```javascript
try {
  await client.createForm(data);
} catch (error) {
  if (error.message.includes('401')) {
    // Re-authenticate
    await client.login(email, password);
  } else if (error.message.includes('timeout')) {
    // Retry with longer timeout
    client.timeout = 60000;
  } else {
    console.error('Failed:', error.message);
  }
}
```

## Use Cases

### 1. Automated Survey Creation
Create surveys from templates or external data sources.

### 2. User Onboarding
Bulk create users from CSV or database.

### 3. Data Migration
Export data from old system and import to VTrustX.

### 4. Reporting
Generate reports from survey responses.

### 5. Integration
Connect VTrustX with other systems (CRM, analytics, etc.).

## Dependencies

- `node-fetch`: HTTP client for Node.js
- `dotenv`: Environment variable management

## Next Steps

- Add webhooks integration
- Implement retry logic
- Add rate limiting
- Create scheduled tasks
- Build CLI tool
