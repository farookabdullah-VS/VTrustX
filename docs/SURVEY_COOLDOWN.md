# Survey Cool Down Feature

**Status**: ✅ Complete (February 2026)
**Version**: 1.0.0

## Overview

The Survey Cool Down feature prevents duplicate or rapid-fire survey submissions by implementing configurable rate limiting at the form level. It supports three modes:

- **IP-based**: Rate limit by client IP address
- **User-based**: Rate limit by authenticated user ID
- **Hybrid (both)**: Check both IP and user restrictions

## Use Cases

1. **Prevent Survey Spam**: Block rapid resubmissions from the same IP
2. **One Response Per Day**: Allow users to submit once every 24 hours
3. **Contest/Voting Protection**: Prevent multiple votes from same user
4. **Survey Fatigue Prevention**: Space out repeat survey responses
5. **Bot Protection**: Slow down automated submission attempts

## Architecture

### Database Schema

**Migration**: `1771320000000_survey-cooldown.js`

Added to `forms` table:
```sql
cooldown_enabled BOOLEAN DEFAULT false
cooldown_period INTEGER DEFAULT 3600  -- seconds
cooldown_type VARCHAR(10) DEFAULT 'both'  -- 'ip', 'user', or 'both'
```

### Components

1. **SurveyCooldownService** (`server/src/services/SurveyCooldownService.js`)
   - Core service handling cool down logic
   - Uses Redis/in-memory cache for tracking
   - Fail-open design (allows submission if check fails)

2. **Forms Route** (`server/src/api/routes/forms.js`)
   - Updated to handle cool down settings
   - Includes cool down fields in form CRUD
   - New endpoints: `/cooldown/check`, `/cooldown/clear`

3. **Submissions Route** (`server/src/api/routes/submissions.js`)
   - Pre-submission cool down check
   - Post-submission recording
   - Returns 429 status when on cool down

## API Usage

### 1. Enable Cool Down on a Form

**Update Form Settings**:
```http
PUT /api/forms/{formId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "cooldownEnabled": true,
  "cooldownPeriod": 3600,
  "cooldownType": "both"
}
```

**Cool Down Types**:
- `"ip"`: IP address only
- `"user"`: User ID only (requires authentication)
- `"both"`: Both IP and user (hybrid)

**Cool Down Periods** (examples):
- `60`: 1 minute
- `3600`: 1 hour (default)
- `86400`: 1 day
- `604800`: 1 week

### 2. Submit Survey (with Cool Down Check)

**Submission Flow**:
```http
POST /api/submissions
Content-Type: application/json

{
  "formId": "12345",
  "userId": "user-abc",  // optional
  "data": { ... }
}
```

**Success Response** (201):
```json
{
  "id": 789,
  "formId": 12345,
  "data": { ... },
  "metadata": { "status": "completed" }
}
```

**Cool Down Active** (429):
```json
{
  "error": "Please wait 45 minutes before submitting again.",
  "code": "COOLDOWN_ACTIVE",
  "remainingTime": 2700,
  "cooldownType": "ip"
}
```

### 3. Check Cool Down Status (Before Submission)

**Public Endpoint** (no auth required):
```http
POST /api/forms/{formId}/cooldown/check
Content-Type: application/json

{
  "userId": "user-abc"  // optional
}
```

**Response**:
```json
{
  "onCooldown": true,
  "remainingTime": 1200,
  "reason": "Please wait 20 minutes before submitting again.",
  "cooldownType": "ip"
}
```

### 4. Clear Cool Down (Admin Override)

**Admin Endpoint** (requires authentication + permissions):
```http
DELETE /api/forms/{formId}/cooldown/clear
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "ipAddress": "192.168.1.100",  // optional
  "userId": "user-abc"            // optional
}
```

## Frontend Integration

### Form Settings UI

Add cool down configuration in form settings:

```jsx
<div className="cooldown-settings">
  <label>
    <input
      type="checkbox"
      checked={form.cooldownEnabled}
      onChange={(e) => setForm({...form, cooldownEnabled: e.target.checked})}
    />
    Enable Submission Cool Down
  </label>

  {form.cooldownEnabled && (
    <>
      <div>
        <label>Cool Down Period</label>
        <select
          value={form.cooldownPeriod}
          onChange={(e) => setForm({...form, cooldownPeriod: parseInt(e.target.value)})}
        >
          <option value={60}>1 minute</option>
          <option value={300}>5 minutes</option>
          <option value={3600}>1 hour</option>
          <option value={86400}>1 day</option>
          <option value={604800}>1 week</option>
        </select>
      </div>

      <div>
        <label>Rate Limit Type</label>
        <select
          value={form.cooldownType}
          onChange={(e) => setForm({...form, cooldownType: e.target.value})}
        >
          <option value="ip">IP Address Only</option>
          <option value="user">User Only (authenticated)</option>
          <option value="both">Both (Hybrid)</option>
        </select>
      </div>
    </>
  )}
</div>
```

### Survey Submission with Cool Down Check

```jsx
const submitSurvey = async (formId, data, userId) => {
  try {
    // Optional: Check cool down before attempting submission
    const cooldownCheck = await axios.post(`/api/forms/${formId}/cooldown/check`, { userId });

    if (cooldownCheck.data.onCooldown) {
      alert(cooldownCheck.data.reason);
      return;
    }

    // Proceed with submission
    const response = await axios.post('/api/submissions', {
      formId,
      userId,
      data
    });

    alert('Survey submitted successfully!');
  } catch (error) {
    if (error.response?.status === 429) {
      // Cool down active
      const { error: message, remainingTime } = error.response.data;
      alert(message);
    } else {
      alert('Submission failed');
    }
  }
};
```

### Display Remaining Time

```jsx
const CooldownTimer = ({ formId, userId }) => {
  const [cooldown, setCooldown] = useState(null);

  useEffect(() => {
    const checkCooldown = async () => {
      const response = await axios.post(`/api/forms/${formId}/cooldown/check`, { userId });
      setCooldown(response.data);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [formId, userId]);

  if (!cooldown?.onCooldown) return null;

  return (
    <div className="cooldown-notice">
      ⏱️ {cooldown.reason}
    </div>
  );
};
```

## Implementation Details

### Cache Keys

Cool down uses Redis (or in-memory cache) with these key formats:

- IP-based: `cooldown:ip:{formId}:{ipAddress}`
- User-based: `cooldown:user:{formId}:{userId}`

Keys are set with TTL equal to `cooldown_period` and automatically expire.

### Fail-Open Design

The cool down service is designed to **fail open** - if the cache check fails for any reason, the submission is allowed. This prevents cool down issues from blocking legitimate survey responses.

```javascript
// If cool down check fails, allow submission (fail open)
if (cooldownCheckError) {
  logger.error('Cool down check failed', { error });
  return { allowed: true };
}
```

### Transaction Handling

Cool down check occurs **before** the database transaction to:
1. Reduce DB load for blocked submissions
2. Provide faster response to users on cool down
3. Avoid unnecessary transaction overhead

```javascript
// 0. Check cool down (before transaction)
const cooldownCheck = await SurveyCooldownService.checkCooldown(form, ip, userId);
if (!cooldownCheck.allowed) {
  return res.status(429).json({ error: ... });
}

// 1. Start transaction for submission
const result = await transaction(async (client) => {
  // ... submission logic
});

// 2. Record cool down (after success)
await SurveyCooldownService.recordSubmission(form, ip, userId);
```

### Recording Strategy

Cool down is recorded **only for completed submissions**:
- ✅ Recorded: `metadata.status === 'completed'`
- ❌ Not recorded: Quota rejected, validation failed, in-progress

## Configuration Examples

### 1. Daily Survey (24-hour Cool Down)

```json
{
  "cooldownEnabled": true,
  "cooldownPeriod": 86400,
  "cooldownType": "both"
}
```

Use case: Employee daily check-in, mood tracking

### 2. Contest/Voting (One Vote Per User)

```json
{
  "cooldownEnabled": true,
  "cooldownPeriod": 31536000,
  "cooldownType": "user"
}
```

Use case: Annual awards voting (1 year = essentially permanent)

### 3. Public Feedback (Rate Limit by IP)

```json
{
  "cooldownEnabled": true,
  "cooldownPeriod": 3600,
  "cooldownType": "ip"
}
```

Use case: Anonymous feedback with 1-hour cool down per IP

### 4. Authenticated Surveys (Hybrid Protection)

```json
{
  "cooldownEnabled": true,
  "cooldownPeriod": 604800,
  "cooldownType": "both"
}
```

Use case: Weekly survey with both user and IP checks

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `COOLDOWN_ACTIVE` | 429 | Submission blocked, cool down active |
| `FORM_NOT_FOUND` | 404 | Form doesn't exist |

## Testing

### Manual Testing

1. **Enable Cool Down**:
   ```bash
   curl -X PUT http://localhost:3000/api/forms/{formId} \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"cooldownEnabled": true, "cooldownPeriod": 60, "cooldownType": "ip"}'
   ```

2. **Submit Survey** (first time - should succeed):
   ```bash
   curl -X POST http://localhost:3000/api/submissions \
     -H "Content-Type: application/json" \
     -d '{"formId": "{formId}", "data": {"q1": "answer"}}'
   ```

3. **Submit Again** (should fail with 429):
   ```bash
   curl -X POST http://localhost:3000/api/submissions \
     -H "Content-Type: application/json" \
     -d '{"formId": "{formId}", "data": {"q1": "answer2"}}'
   ```

4. **Check Cool Down Status**:
   ```bash
   curl -X POST http://localhost:3000/api/forms/{formId}/cooldown/check \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

5. **Clear Cool Down** (admin):
   ```bash
   curl -X DELETE http://localhost:3000/api/forms/{formId}/cooldown/clear \
     -H "Authorization: Bearer {admin-token}" \
     -H "Content-Type: application/json" \
     -d '{"ipAddress": "127.0.0.1"}'
   ```

## Monitoring

### Log Events

Cool down events are logged:

```javascript
logger.info('[SurveyCooldown] Submission recorded', {
  formId,
  cooldownType,
  cooldownPeriod
});

logger.error('[SurveyCooldown] Cool down check failed, allowing submission', {
  error,
  formId
});
```

### Metrics to Track

- Cool down rejection rate (429 responses)
- Average cool down remaining time
- Clear cool down frequency (admin overrides)
- Cache failure rate

## Security Considerations

1. **IP Spoofing**: Use `req.ip` which respects proxy headers
2. **Fail Open**: System degrades gracefully if cache fails
3. **Admin Override**: Only users with `forms:update` permission can clear
4. **No User Data in Keys**: Cache keys contain IDs only, not sensitive data

## Performance

- **Cache Lookup**: O(1) Redis GET operation
- **Overhead**: ~5-10ms per submission check
- **Memory**: ~100 bytes per tracked submission
- **Auto-Cleanup**: Keys expire automatically via TTL

## Limitations

1. **Cache Dependency**: Requires Redis or in-memory cache
2. **Distributed Systems**: Cache should be shared across instances
3. **IP Changes**: VPN/proxy changes can bypass IP-based limits
4. **Anonymous Surveys**: User-based limits don't work for anonymous

## Future Enhancements

- [ ] Progressive cool down (longer delays for repeated violations)
- [ ] Cool down bypass tokens (for admins/testers)
- [ ] Cool down analytics dashboard
- [ ] Configurable cool down messages
- [ ] Per-question cool down (not just per-form)
- [ ] Geographic-based cool down variations

## Related Features

- **Response Limits**: Hard cap on total submissions
- **Quotas**: Limit submissions matching specific criteria
- **IP Allowlist**: Restrict access to specific IPs
- **Rate Limiting**: Password attempt rate limiting

## Support

For questions or issues:
- Check logs: `[SurveyCooldown]` prefix
- Verify cache connectivity (Redis/in-memory)
- Test with `/cooldown/check` endpoint
- Use admin `/cooldown/clear` to reset during testing

---

**Last Updated**: February 17, 2026
**Author**: VTrustX Development Team
