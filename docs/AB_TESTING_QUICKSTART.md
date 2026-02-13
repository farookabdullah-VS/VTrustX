# A/B Testing Quick Start Guide

## ✅ Implementation Status: COMPLETE

All Phase 4-5 components are fully implemented and ready for testing.

## Prerequisites

1. **Database migrations applied** (✅ Completed - all 12 migrations passed)
2. **Backend server running** on port 3000
3. **Frontend dev server running** on port 5173
4. **At least one survey created** in the system

## Testing Steps

### 1. Start the Servers

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

### 2. Access A/B Testing Dashboard

1. Login to the application: http://localhost:5173
2. In the left sidebar, navigate to **Surveys** → **A/B Testing**
3. You should see the A/B Testing Dashboard (empty initially)

### 3. Create Your First Experiment

**Click "New Experiment" button** → You'll see a 4-step wizard:

**Step 1: Experiment Details**
- Name: `Email Subject Line Test`
- Description: `Testing two different subject lines`
- Channel: Select `email`
- Form: Select a survey from dropdown
- Success Metric: `response_rate`
- Statistical Method: `frequentist` (default)

**Step 2: Create Variants**
- **Variant A:**
  - Subject: `Your feedback matters - take our survey`
  - Body: `Hi {name}, please share your thoughts: {link}`
- **Variant B:**
  - Subject: `Quick 2-minute survey inside`
  - Body: `Hi {name}, we value your opinion: {link}`

**Step 3: Traffic Allocation**
- Variant A: 50%
- Variant B: 50%
- (Use sliders or enter percentages)

**Step 4: Review & Launch**
- Review all settings
- Click **"Launch Experiment"**

### 4. Send Distribution with A/B Test

**Navigate to:** Surveys → Select your survey → **Distribute**

1. Choose **Email** as distribution type
2. Add contacts (at least 10 for meaningful results)
3. **Enable A/B Testing:**
   - Toggle **"Use A/B Test Experiment"**
   - Select your experiment from dropdown
4. Click **"Send Campaign"**

**What happens behind the scenes:**
- Each recipient is randomly assigned to Variant A or B based on traffic allocation
- They receive the subject line and body from their assigned variant
- Assignment is stored in `ab_assignments` table
- Message tracking captures delivery, open, and response metrics

### 5. Monitor Experiment Results

**Navigate to:** A/B Testing Dashboard → Click your experiment

**You'll see:**
- **Live Updates:** Green "Live" indicator shows SSE connection
- **Variant Performance Cards:**
  - Assignments count
  - Delivery rate
  - Open rate (email only)
  - Response rate
  - Lift % compared to control
- **Statistical Analysis:**
  - P-value
  - Chi-square statistic
  - Confidence intervals
  - Winner badge (if statistically significant)
- **Bar Chart:** Side-by-side comparison of all metrics

**Check for Winner:**
- Click **"Check for Winner"** button
- If sample size ≥ minimum (default 100) AND p-value < 0.05:
  - Winner is declared automatically
  - 🏆 Winner modal appears
  - Experiment status changes to "completed"

### 6. Real-Time Updates (SSE)

**Watch the dashboard update in real-time:**
1. Open A/B Testing Dashboard in one browser tab
2. Send a distribution with the experiment in another tab
3. See the assignment count increase automatically
4. No page refresh needed!

**SSE Events Emitted:**
- `ab_experiment_created` - New experiment added
- `ab_experiment_started` - Experiment activated
- `ab_variant_assigned` - Recipient assigned to variant
- `ab_winner_declared` - Statistically significant winner found
- `ab_experiment_paused` - Experiment paused
- `ab_experiment_completed` - Experiment ended

---

## API Testing (Optional - Advanced Users)

### Create Experiment via API

```bash
curl -X POST http://localhost:3000/api/ab-tests \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Subject Line Test",
    "channel": "email",
    "formId": 1,
    "trafficAllocation": {"A": 50, "B": 50},
    "successMetric": "response_rate",
    "minimumSampleSize": 100,
    "confidenceLevel": 95.00,
    "variants": [
      {
        "name": "A",
        "subject": "Your feedback matters",
        "body": "Hi {name}, take our survey: {link}"
      },
      {
        "name": "B",
        "subject": "Quick 2-minute survey",
        "body": "Hi {name}, share your thoughts: {link}"
      }
    ]
  }'
```

### Start Experiment

```bash
curl -X POST http://localhost:3000/api/ab-tests/1/start
```

### Get Results

```bash
curl http://localhost:3000/api/ab-tests/1/results
```

### Check for Winner

```bash
curl -X POST http://localhost:3000/api/ab-tests/1/check-winner
```

---

## Advanced Features (Phase 6)

### Bayesian A/B Testing

**In Step 1 of wizard:**
- Statistical Method: `bayesian`
- Bayesian Threshold: `0.95` (95% probability)
- Minimum Sample Size: `100`

**Results include:**
- Posterior probability distributions
- Probability of being best for each variant
- Credible intervals (95% by default)
- Expected loss calculations

### Sequential Analysis (Early Stopping)

**In Step 1 of wizard:**
- Statistical Method: `sequential`
- Number of Interim Checks: `5`
- Planned Sample Size: `1000`

**Stops early when:**
- Winner is detected with O'Brien-Fleming boundaries
- Experiment is futile (no winner possible)

### Multi-Armed Bandit (Dynamic Allocation)

**In Step 1 of wizard:**
- Statistical Method: `bandit`
- Algorithm: `thompson` | `ucb` | `epsilon_greedy`

**Features:**
- Traffic allocation adjusts dynamically
- Exploits winning variants automatically
- Minimizes regret over time

### Power Analysis Calculator

**Navigate to:** A/B Testing → Power Analysis

**Calculate required sample size:**
1. Enter baseline conversion rate (e.g., 10%)
2. Enter minimum detectable effect (e.g., 2%)
3. Set desired power (default 80%)
4. Set significance level (default 5%)

**Outputs:**
- Required sample size per variant
- Total sample size needed
- Power curve visualization
- Duration estimate (with daily volume input)
- Recommendations for experiment design

---

## Troubleshooting

### Issue: "Experiment not found"
**Solution:** Ensure experiment is created and you're using the correct ID.

### Issue: "Experiment must be in running status"
**Solution:** Click "Start" button in dashboard before sending distributions.

### Issue: SSE not connecting (no "Live" indicator)
**Solution:**
- Check backend server is running
- Verify `/api/analytics/sse/stream` endpoint is accessible
- Check browser console for connection errors

### Issue: Variants not being assigned
**Solution:**
- Verify experimentId is passed to distribution API
- Check experiment status is "running"
- Look at `ab_assignments` table for assignment records

### Issue: Winner not being declared
**Solution:**
- Need minimum sample size per variant (default 100)
- P-value must be < 0.05 (95% confidence)
- Ensure enough difference between variants

---

## Database Verification

**Check experiment records:**
```sql
-- List all experiments
SELECT id, name, status, channel, started_at FROM ab_experiments;

-- Check variants
SELECT * FROM ab_variants WHERE experiment_id = 1;

-- View assignments
SELECT variant_id, COUNT(*) as count
FROM ab_assignments
WHERE experiment_id = 1
GROUP BY variant_id;

-- Advanced statistics (Phase 6)
SELECT * FROM ab_bayesian_stats WHERE experiment_id = 1;
SELECT * FROM ab_sequential_analysis WHERE experiment_id = 1;
SELECT * FROM ab_bandit_state WHERE experiment_id = 1;
```

---

## What's Next?

Now that Phase 4-5 is complete, you can:

1. **Test end-to-end workflow** using steps above
2. **Create multiple experiments** to test different hypotheses
3. **Compare results** between Bayesian, Sequential, and Bandit methods
4. **Use Power Analysis** to plan experiments scientifically
5. **Monitor real-time updates** with SSE live indicators

## Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs (`server/logs/`)
3. Verify database migrations: `npm run migrate` in server directory
4. Ensure all services are running (PostgreSQL, Redis optional)

---

**🎉 You're all set! Happy A/B Testing!**
