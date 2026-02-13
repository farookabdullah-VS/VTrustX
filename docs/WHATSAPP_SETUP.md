# WhatsApp Distribution Setup Guide

This guide walks you through setting up WhatsApp survey distribution using Twilio's WhatsApp API.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Twilio Account Setup](#twilio-account-setup)
- [Database Migration](#database-migration)
- [Integration Configuration](#integration-configuration)
- [Webhook Configuration](#webhook-configuration)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

1. **Twilio Account** - Sign up at [twilio.com](https://www.twilio.com/try-twilio) (free trial available)
2. **Database Access** - PostgreSQL database with migrations applied
3. **HTTPS Domain** - Required for production webhooks (Twilio requirement)
4. **DB_ENCRYPTION_KEY** - Set in your environment variables (required for credential encryption)

---

## Twilio Account Setup

### 1. Create Twilio Account

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Develop** → **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Complete the WhatsApp sandbox setup:
   - Send a join code from your phone to Twilio's sandbox number
   - Example: Send `join <code>` to `+1 415 523 8886`

### 2. Get Credentials

From the Twilio Console Dashboard, copy:

- **Account SID** - Starts with `AC...` (e.g., `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- **Auth Token** - Click "show" to reveal (under Account SID)
- **WhatsApp Sandbox Number** - The number you joined (e.g., `+1 415 523 8886`)

### 3. Apply for WhatsApp Business Profile (Production)

For production use beyond sandbox:

1. Go to **Messaging** → **WhatsApp Senders**
2. Click **Request Access** to WhatsApp Business API
3. Submit business verification documents
4. Once approved, purchase a phone number with WhatsApp capability

**Note**: Sandbox mode is sufficient for testing and development.

---

## Database Migration

### Run Migration

```bash
# From server directory
npm run migrate

# Verify tables were created
psql -d rayix_db -c "\d whatsapp_messages"
psql -d rayix_db -c "\d whatsapp_sessions"
```

### Expected Output

Two new tables will be created:

- `whatsapp_messages` - Tracks individual message sends and delivery status
- `whatsapp_sessions` - Tracks 24-hour messaging windows for freeform messages

---

## Integration Configuration

### Option 1: Via UI (Recommended)

1. Log in to RayiX as admin
2. Navigate to **Settings** → **Integrations**
3. Click **Add Integration**
4. Fill in the form:
   - **Provider**: `Twilio WhatsApp`
   - **Name**: `Twilio WhatsApp Messaging`
   - **API Key**: Your Twilio Account SID (will be encrypted automatically)
   - **Config (JSON)**:
     ```json
     {
       "auth_token": "your_twilio_auth_token",
       "from": "whatsapp:+14155238886"
     }
     ```
   - **Active**: ✅ Enabled

5. Click **Save**

### Option 2: Via SQL (Direct Database)

```sql
-- Note: Credentials must be pre-encrypted using AES-256-GCM
-- Use the encryption utility or encrypt during insert

INSERT INTO integrations (
    tenant_id,
    provider,
    name,
    api_key,
    config,
    is_active,
    created_at
) VALUES (
    1, -- Your tenant ID
    'Twilio WhatsApp',
    'Twilio WhatsApp Messaging',
    'gcm:...[encrypted_account_sid]', -- Use encryption.encrypt()
    '{
        "auth_token": "gcm:...[encrypted_auth_token]",
        "from": "whatsapp:+14155238886"
    }',
    true,
    NOW()
);
```

### Option 3: Via Encryption Script

If you have plaintext credentials in the database:

```bash
# Run the encryption migration script
npm run migrate:encrypt-keys --prefix server
```

---

## Webhook Configuration

Twilio uses webhooks to notify you about message delivery status.

### 1. Configure Webhook URLs in Twilio Console

1. Go to **Messaging** → **WhatsApp Senders**
2. Click on your WhatsApp number (sandbox or production)
3. Scroll to **Webhooks** section
4. Set the following URLs:

**Status Callback URL** (Message delivery updates):
```
https://your-domain.com/api/webhooks/whatsapp/status
```
- HTTP Method: `POST`

**Inbound Message URL** (Incoming messages):
```
https://your-domain.com/api/webhooks/whatsapp/inbound
```
- HTTP Method: `POST`

### 2. Test Webhook Connectivity

```bash
# Test locally with ngrok (for development)
ngrok http 3000

# Update Twilio webhook URLs to ngrok URL
# Example: https://abc123.ngrok.io/api/webhooks/whatsapp/status

# Send a test message and check logs
curl -X POST http://localhost:3000/api/webhooks/whatsapp/health
```

### 3. Webhook Security (Production)

The webhook endpoint validates Twilio signatures in production:

```javascript
// Automatically enabled when NODE_ENV=production
// Requires TWILIO_AUTH_TOKEN environment variable
```

To test signature validation locally:

```bash
# Set environment variable
export NODE_ENV=production
export TWILIO_AUTH_TOKEN=your_auth_token

# Restart server
npm start
```

---

## Testing

### 1. Create Test Campaign

Via UI:
1. Go to **Distributions** → **Create Campaign**
2. Fill in details:
   - **Name**: "Test WhatsApp Campaign"
   - **Survey**: Select any survey
   - **Channel**: **WhatsApp**
3. Add test contacts:
   ```
   +966501234567, John Doe
   +966509876543, Sarah Smith
   ```
   **Important**: Use international format with `+` prefix
4. Compose message with placeholders:
   ```
   Hi {{name}},

   Please take our survey: {{link}}

   Thanks!
   ```
5. Click **Launch Campaign**

### 2. Verify Message Delivery

Check database:

```sql
-- View sent messages
SELECT
    id,
    recipient_phone,
    recipient_name,
    status,
    message_sid,
    sent_at,
    error_message
FROM whatsapp_messages
ORDER BY created_at DESC
LIMIT 10;
```

Expected status flow:
- `pending` → `sent` → `delivered` → `read` (if recipient opens)

### 3. Check Logs

```bash
# Server logs
tail -f server/logs/app.log | grep WhatsApp

# Look for:
# - [WhatsAppService] Integration loaded successfully
# - [WhatsAppService] Message sent successfully
# - [WhatsApp Webhook] Status callback received
```

### 4. Manual Webhook Test

Simulate a Twilio status callback:

```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp/status \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM1234567890abcdef" \
  -d "MessageStatus=delivered" \
  -d "From=whatsapp:+14155238886" \
  -d "To=whatsapp:+966501234567"
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] **Twilio WhatsApp Business Profile** approved
- [ ] **Production phone number** purchased with WhatsApp capability
- [ ] **Template messages** submitted and approved by WhatsApp
- [ ] **HTTPS domain** configured (Twilio requires HTTPS for webhooks)
- [ ] **Webhook signature validation** enabled (`NODE_ENV=production`)
- [ ] **DB_ENCRYPTION_KEY** set in production environment
- [ ] **TWILIO_AUTH_TOKEN** set for signature validation
- [ ] **Sentry alerts** configured for high error rates
- [ ] **Cost tracking** implemented per tenant
- [ ] **Quota enforcement** tied to subscription plans

### Template Messages vs Freeform Messages

WhatsApp has strict messaging rules:

**Template Messages** (Always allowed):
- Pre-approved message formats
- Required for initial outreach
- Submit for approval in Twilio Console: **Messaging** → **Content Templates**

**Freeform Messages** (24-hour window only):
- Allowed within 24 hours of user-initiated contact
- Tracked in `whatsapp_sessions` table
- Window starts when user sends inbound message

For survey distribution, use **template messages** for initial invitations.

### Environment Variables

```bash
# Production .env
NODE_ENV=production
TWILIO_AUTH_TOKEN=your_production_auth_token

# Note: Account SID and from number are stored encrypted in database
```

### Cost Management

Twilio charges per message. Monitor costs:

```sql
-- Count messages by tenant and status
SELECT
    tenant_id,
    status,
    COUNT(*) as message_count,
    DATE(created_at) as date
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY tenant_id, status, DATE(created_at)
ORDER BY date DESC, tenant_id;
```

Implement rate limiting per tenant based on subscription plan:

```javascript
// In distributions route
const tenantQuota = await getTenantWhatsAppQuota(tenantId);
const usedThisMonth = await getWhatsAppUsageThisMonth(tenantId);

if (usedThisMonth >= tenantQuota) {
    return res.status(429).json({ error: 'WhatsApp quota exceeded' });
}
```

---

## Troubleshooting

### Common Issues

#### 1. "WhatsApp integration not configured"

**Problem**: Integration not found in database or inactive.

**Solution**:
```sql
-- Check integration exists
SELECT * FROM integrations WHERE provider LIKE '%Twilio%WhatsApp%';

-- Verify is_active is true
UPDATE integrations SET is_active = true WHERE provider LIKE '%Twilio%WhatsApp%';
```

#### 2. "Invalid phone number format"

**Problem**: Phone number not in E.164 format.

**Solution**: Ensure numbers start with `+` and country code:
- ✅ Correct: `+966501234567`
- ❌ Wrong: `0501234567`, `00966501234567`, `966501234567`

#### 3. Twilio Error 63007 - "Invalid phone number"

**Problem**: Phone number doesn't exist or invalid format.

**Solution**:
- Verify number exists and is active
- Check country code is correct
- Remove spaces, dashes, parentheses

#### 4. Twilio Error 63016 - "Phone not on WhatsApp"

**Problem**: Recipient doesn't have WhatsApp installed.

**Solution**:
- Verify recipient has WhatsApp on their phone
- Check number is correctly formatted
- Consider fallback to SMS

#### 5. Twilio Error 63027 - "24-hour window expired"

**Problem**: Trying to send freeform message outside session window.

**Solution**:
- Use template messages instead for initial outreach
- Wait for user to initiate contact
- Check `whatsapp_sessions` table for session status

#### 6. "Webhook not receiving callbacks"

**Problem**: Twilio can't reach your webhook URL.

**Solution**:
- Verify URL is publicly accessible (not localhost)
- Check HTTPS is enabled (required by Twilio)
- Test URL manually: `curl https://your-domain.com/api/webhooks/whatsapp/health`
- Check firewall allows Twilio IPs

#### 7. "Invalid Twilio signature" in production

**Problem**: Signature validation failing.

**Solution**:
- Verify `TWILIO_AUTH_TOKEN` is set correctly
- Check webhook URL matches exactly (trailing slashes matter)
- Ensure `NODE_ENV=production` is set

### Debug Mode

Enable verbose logging:

```javascript
// In whatsappService.js, add:
logger.level = 'debug';

// Logs will show:
// - Integration loading
// - Phone number formatting
// - API requests/responses
// - Webhook payloads
```

### Manual Testing with Twilio Console

1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Send test message manually
3. Check logs for API response
4. Verify message appears in `whatsapp_messages` table

### Contact Support

If issues persist:

1. **Twilio Support**: [support.twilio.com](https://support.twilio.com)
2. **RayiX Issues**: [github.com/yourusername/rayix/issues](https://github.com/yourusername/rayix/issues)
3. **Check Status**: [status.twilio.com](https://status.twilio.com)

---

## Additional Resources

- [Twilio WhatsApp API Docs](https://www.twilio.com/docs/whatsapp)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [Twilio Webhooks Guide](https://www.twilio.com/docs/usage/webhooks)
- [E.164 Phone Number Format](https://www.twilio.com/docs/glossary/what-e164)

---

## Next Steps

After successful setup:

1. **Create distribution campaigns** via UI
2. **Monitor delivery rates** in analytics
3. **Submit template messages** for production approval
4. **Implement two-way messaging** (future enhancement)
5. **Add rich media support** (images, buttons) (future enhancement)

---

**Last Updated**: 2026-02-13
**Version**: 1.0.0
