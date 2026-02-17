# Quick Start Guide

**Get up and running with the mock server in 60 seconds**

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Start Server

```bash
npm start
```

You should see:

```
🚀 VTrustX Mock API Server
══════════════════════════════════════════════════
📡 Server running on: http://localhost:4000
📊 API Info: http://localhost:4000/api
💚 Health Check: http://localhost:4000/health
══════════════════════════════════════════════════

📝 Test Accounts:
   • admin@vtrustx.com (role: admin)
   • editor@vtrustx.com (role: editor)
   Password: any password works

📋 Current Data:
   • Users: 2
   • Forms: 2
   • Submissions: 0
```

---

## Step 3: Test with curl

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vtrustx.com","password":"test"}'

# Get forms
curl http://localhost:4000/api/forms
```

---

## Step 4: Use with SDK Examples

### Vanilla JavaScript

```bash
cd ../examples/javascript/vanilla
# Open index.html and set API URL to: http://localhost:4000/api
open index.html
```

### React

```bash
cd ../examples/javascript/react
npm install

# Edit vite.config.js - set proxy target to: http://localhost:4000
npm run dev
```

### Node.js

```bash
cd ../examples/javascript/node
npm install

# Create .env file
echo "API_URL=http://localhost:4000/api" > .env
echo "EMAIL=admin@vtrustx.com" >> .env
echo "PASSWORD=test123" >> .env

# Run examples
npm run create-survey
npm run list-users
npm run export-data
```

---

## Step 5: Test API (Optional)

Run the test script:

```bash
# Linux/Mac
chmod +x test-api.sh
./test-api.sh

# Windows (with Git Bash)
bash test-api.sh
```

---

## Docker Alternative

### Build and Run

```bash
docker build -t vtrustx-mock-server .
docker run -p 4000:4000 vtrustx-mock-server
```

### Or Use Docker Compose

```bash
docker-compose up
```

---

## Available Endpoints

Visit: http://localhost:4000/api

You'll see all available endpoints and test accounts.

---

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@vtrustx.com | any | admin |
| editor@vtrustx.com | any | editor |

**Password**: Any password works in the mock server!

---

## Pre-loaded Data

### 2 Forms
- Customer Satisfaction Survey (`form-1`, slug: `csat-2026`)
- NPS Survey (`form-2`, slug: `nps-2026`)

### 2 Users
- Admin user (admin@vtrustx.com)
- Editor user (editor@vtrustx.com)

### 3 Roles
- admin
- editor
- viewer

---

## Common Use Cases

### 1. Login and Get Token

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vtrustx.com","password":"test"}' \
  | jq -r '.token')

echo $TOKEN
```

### 2. Get All Forms

```bash
curl http://localhost:4000/api/forms
```

### 3. Submit Survey Response

```bash
curl -X POST http://localhost:4000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "form-1",
    "data": {
      "satisfaction": 5,
      "feedback": "Excellent!"
    }
  }'
```

### 4. Create New Survey

```bash
curl -X POST http://localhost:4000/api/forms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "My Survey",
    "slug": "my-survey",
    "definition": {
      "pages": [{
        "elements": [{
          "type": "rating",
          "name": "rating",
          "title": "Rate us",
          "rateMax": 5
        }]
      }]
    }
  }'
```

---

## Tips

1. **Data Resets**: All data is in-memory. Restart server = fresh data.

2. **CORS**: Enabled by default for all origins.

3. **Port in Use**: Change port with `PORT=5000 npm start`

4. **Token Expires**: Tokens expire after 24 hours. Login again to get new token.

5. **No Password Validation**: Any password works. This is intentional for easy testing.

---

## Next Steps

1. ✅ Start mock server
2. ✅ Test with curl
3. ✅ Try SDK examples
4. 🔨 Build your integration
5. 🚀 Switch to real API

---

## Troubleshooting

**Problem**: Port 4000 already in use
**Solution**: `PORT=5001 npm start`

**Problem**: CORS errors
**Solution**: Mock server has CORS enabled. Check your fetch/axios configuration.

**Problem**: 401 Unauthorized
**Solution**: Make sure to include `Authorization: Bearer <token>` header.

---

**Need Help?** See README.md for full documentation.

**Last Updated**: February 17, 2026
