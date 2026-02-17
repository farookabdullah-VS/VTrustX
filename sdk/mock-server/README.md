# VTrustX Mock API Server

**Lightweight mock server for SDK testing and development**

Use this mock server to develop and test VTrustX SDK integrations without needing a full backend setup.

---

## Features

- ✅ Complete REST API implementation
- ✅ In-memory data storage
- ✅ Authentication with tokens
- ✅ Pre-populated test data
- ✅ CORS enabled for local development
- ✅ No database required
- ✅ Instant startup
- ✅ Request logging

---

## Installation

```bash
npm install
```

---

## Usage

### Start Server

```bash
npm start
```

Server will run on: **http://localhost:4000**

### Development Mode (with auto-restart)

```bash
npm run dev
```

---

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@vtrustx.com` | any | admin |
| `editor@vtrustx.com` | any | editor |

**Note**: Any password will work for authentication.

---

## API Endpoints

### Authentication

```http
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

### Forms (Surveys)

```http
GET /api/forms
GET /api/forms/:id
GET /api/forms/slug/:slug
POST /api/forms
PUT /api/forms/:id
DELETE /api/forms/:id
POST /api/forms/:id/publish
```

### Submissions

```http
GET /api/submissions
GET /api/submissions?formId=xxx
POST /api/submissions
GET /api/submissions/:id
```

### Users

```http
GET /api/users
GET /api/users/:id
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id
```

### Roles

```http
GET /api/roles
POST /api/roles
```

### Health & Info

```http
GET /health
GET /api
```

---

## Quick Test

### 1. Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vtrustx.com",
    "password": "test123"
  }'
```

**Response:**
```json
{
  "token": "uuid-token-here",
  "user": {
    "id": "1",
    "email": "admin@vtrustx.com",
    "role": "admin"
  }
}
```

### 2. Get Forms

```bash
curl http://localhost:4000/api/forms
```

**Response:**
```json
[
  {
    "id": "form-1",
    "title": "Customer Satisfaction Survey",
    "slug": "csat-2026",
    "isPublished": true
  }
]
```

### 3. Submit Response

```bash
curl -X POST http://localhost:4000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "form-1",
    "data": {
      "satisfaction": 5,
      "feedback": "Great service!"
    }
  }'
```

---

## Pre-populated Data

### Users (2)
- Admin user
- Editor user

### Forms (2)
- Customer Satisfaction Survey
- NPS Survey

### Submissions (0)
- Start with empty submissions

### Roles (3)
- admin (all permissions)
- editor (forms read/write)
- viewer (forms read only)

---

## Using with SDK Examples

### Vanilla JavaScript

Edit `sdk/examples/javascript/vanilla/index.html`:

```javascript
const apiUrl = 'http://localhost:4000/api';
```

### React

Edit `sdk/examples/javascript/react/vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true
  }
}
```

### Node.js

Edit `.env`:

```env
API_URL=http://localhost:4000/api
```

---

## Authentication Flow

1. **Login**: POST `/api/auth/login` → Returns token
2. **Use Token**: Add `Authorization: Bearer <token>` header
3. **Token Expires**: After 24 hours
4. **Logout**: POST `/api/auth/logout`

---

## Data Persistence

**Warning**: All data is stored in memory and will be lost when the server restarts.

This is intentional for testing purposes. Each restart gives you a clean slate.

---

## CORS Configuration

CORS is enabled for all origins, making it easy to test from:
- Localhost web apps
- Codepen/JSFiddle
- Mobile apps
- Any development environment

---

## Request Logging

All requests are logged to console:

```
2026-02-17T18:30:00.000Z POST /api/auth/login
2026-02-17T18:30:05.000Z GET /api/forms
2026-02-17T18:30:10.000Z POST /api/submissions
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authorization required"
}
```

### 404 Not Found
```json
{
  "error": "Form not found"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Advanced Usage

### Create Survey

```javascript
const response = await fetch('http://localhost:4000/api/forms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'My Survey',
    slug: 'my-survey',
    definition: {
      pages: [
        {
          elements: [
            {
              type: 'text',
              name: 'name',
              title: 'What is your name?'
            }
          ]
        }
      ]
    },
    isPublished: true
  })
});
```

### Get Submissions for Form

```javascript
const submissions = await fetch(
  'http://localhost:4000/api/submissions?formId=form-1'
);
```

---

## Customization

### Add More Test Data

Edit `server.js` and modify the `db` object:

```javascript
const db = {
  users: [...],
  forms: [...],
  // Add your test data here
};
```

### Change Port

```bash
PORT=5000 npm start
```

Or edit `package.json`:

```json
{
  "scripts": {
    "start": "PORT=5000 node server.js"
  }
}
```

---

## Troubleshooting

### Port Already in Use

```bash
# Change port
PORT=5001 npm start
```

### CORS Issues

The mock server has CORS enabled by default. If you still have issues, check your request headers.

### Token Expired

Tokens expire after 24 hours. Simply login again to get a new token.

---

## Production Warning

⚠️ **This is a mock server for testing only!**

Do not use in production. Features missing:
- Persistent database
- Security measures
- Password hashing
- Rate limiting
- Input validation
- Error recovery

---

## Next Steps

1. Start the mock server: `npm start`
2. Test with curl or Postman
3. Run SDK examples
4. Develop your integration
5. Switch to real API when ready

---

## Support

For SDK documentation:
- JavaScript Guide: `../docs/JAVASCRIPT_GUIDE.md`
- SDK Overview: `../docs/SDK_OVERVIEW.md`
- Examples: `../examples/`

---

**Last Updated**: February 17, 2026
**Version**: 1.0.0
