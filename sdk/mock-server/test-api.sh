#!/bin/bash

# VTrustX Mock API Test Script
# Tests all major endpoints

BASE_URL="http://localhost:4000/api"
TOKEN=""

echo "🧪 VTrustX Mock API Test Suite"
echo "================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
curl -s $BASE_URL/../health | jq '.'
echo ""

# Test 2: API Info
echo "2️⃣  Testing API Info..."
curl -s $BASE_URL | jq '.name, .version'
echo ""

# Test 3: Login
echo "3️⃣  Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vtrustx.com",
    "password": "test123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "✅ Logged in. Token: ${TOKEN:0:20}..."
echo ""

# Test 4: Get Forms
echo "4️⃣  Testing Get Forms..."
curl -s $BASE_URL/forms | jq 'length'
echo " forms found"
echo ""

# Test 5: Get Specific Form
echo "5️⃣  Testing Get Form by ID..."
curl -s $BASE_URL/forms/form-1 | jq '.title'
echo ""

# Test 6: Get Form by Slug
echo "6️⃣  Testing Get Form by Slug..."
curl -s $BASE_URL/forms/slug/csat-2026 | jq '.slug'
echo ""

# Test 7: Create Form
echo "7️⃣  Testing Create Form..."
NEW_FORM=$(curl -s -X POST $BASE_URL/forms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Survey",
    "slug": "test-survey",
    "definition": {
      "pages": [{
        "elements": [{
          "type": "text",
          "name": "question1",
          "title": "Test question"
        }]
      }]
    }
  }')

NEW_FORM_ID=$(echo $NEW_FORM | jq -r '.id')
echo "✅ Created form: $NEW_FORM_ID"
echo ""

# Test 8: Submit Response
echo "8️⃣  Testing Submit Response..."
SUBMISSION=$(curl -s -X POST $BASE_URL/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "form-1",
    "data": {
      "satisfaction": 5,
      "feedback": "Great service!"
    }
  }')

SUBMISSION_ID=$(echo $SUBMISSION | jq -r '.id')
echo "✅ Submitted response: $SUBMISSION_ID"
echo ""

# Test 9: Get Submissions
echo "9️⃣  Testing Get Submissions..."
curl -s "$BASE_URL/submissions?formId=form-1" | jq 'length'
echo " submissions found"
echo ""

# Test 10: Get Users
echo "🔟 Testing Get Users..."
curl -s $BASE_URL/users \
  -H "Authorization: Bearer $TOKEN" | jq 'length'
echo " users found"
echo ""

# Test 11: Create User
echo "1️⃣1️⃣  Testing Create User..."
NEW_USER=$(curl -s -X POST $BASE_URL/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "role": "viewer"
  }')

echo "✅ Created user: $(echo $NEW_USER | jq -r '.email')"
echo ""

# Test 12: Get Roles
echo "1️⃣2️⃣  Testing Get Roles..."
curl -s $BASE_URL/roles \
  -H "Authorization: Bearer $TOKEN" | jq 'length'
echo " roles found"
echo ""

# Test 13: Publish Form
echo "1️⃣3️⃣  Testing Publish Form..."
curl -s -X POST $BASE_URL/forms/$NEW_FORM_ID/publish \
  -H "Authorization: Bearer $TOKEN" | jq '.isPublished'
echo ""

# Test 14: Delete Form
echo "1️⃣4️⃣  Testing Delete Form..."
curl -s -X DELETE $BASE_URL/forms/$NEW_FORM_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.message'
echo ""

# Test 15: Logout
echo "1️⃣5️⃣  Testing Logout..."
curl -s -X POST $BASE_URL/auth/logout \
  -H "Authorization: Bearer $TOKEN" | jq '.message'
echo ""

echo "================================"
echo "✅ All tests completed!"
echo ""
