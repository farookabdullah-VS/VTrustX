# Phase 4 & 5 Testing Guide: A/B Testing Framework + Real-Time Analytics

## Overview

This document outlines the testing strategy for the A/B Testing Framework and Real-Time Analytics features implemented in Phases 4 & 5.

## Test Coverage Summary

### Backend Tests

#### 1. ABTestService SSE Emissions Tests
**File**: `server/src/services/__tests__/ABTestService.test.js`

**Test Cases to Add**:
```javascript
describe('SSE Event Emissions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should emit ab_experiment_created event when experiment is created', async () => {
        const { emitAnalyticsUpdate } = require('../api/routes/analytics/sse');
        jest.mock('../api/routes/analytics/sse');

        const result = await ABTestService.createExperiment(1, experimentData, variants);

        expect(emitAnalyticsUpdate).toHaveBeenCalledWith(
            1,
            'ab_experiment_created',
            expect.objectContaining({
                experimentId: expect.any(Number),
                experimentName: experimentData.name,
                channel: experimentData.channel,
                variantCount: variants.length
            })
        );
    });

    it('should emit ab_variant_assigned event when variant is assigned', async () => {
        // Setup: Create experiment and start it
        // Test: Assign variant to recipient
        // Assert: SSE event emitted with correct data
    });

    it('should emit ab_experiment_started event when experiment is started', async () => {
        // Test: Start experiment
        // Assert: SSE event emitted
    });

    it('should emit ab_winner_declared event when winner is found', async () => {
        // Setup: Create experiment with clear winner data
        // Test: Check and stop experiment
        // Assert: Winner event emitted with lift, p-value
    });
});
```

**Run Tests**:
```bash
cd server
npm test -- ABTestService.test.js
```

#### 2. Distribution A/B Integration Tests
**File**: `server/src/api/routes/__tests__/distributions-ab.test.js`

**Test Cases**:
```javascript
const request = require('supertest');
const { createTestApp, generateTestToken } = require('../../../test/helpers');

describe('Distribution with A/B Testing', () => {
    let app;
    let token;

    beforeEach(async () => {
        app = await createTestApp();
        token = generateTestToken({ tenant_id: 1 });
    });

    it('should create distribution with experimentId', async () => {
        // Setup: Create experiment
        const expResponse = await request(app)
            .post('/api/ab-tests')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Test Experiment',
                channel: 'email',
                trafficAllocation: { A: 50, B: 50 },
                successMetric: 'response_rate',
                variants: [
                    { name: 'A', subject: 'Subject A', body: 'Body A' },
                    { name: 'B', subject: 'Subject B', body: 'Body B' }
                ]
            });

        const experimentId = expResponse.body.experiment.id;

        // Start experiment
        await request(app)
            .post(`/api/ab-tests/${experimentId}/start`)
            .set('Authorization', `Bearer ${token}`);

        // Create distribution with experiment
        const distResponse = await request(app)
            .post('/api/distributions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Test Campaign',
                surveyId: 1,
                type: 'email',
                experimentId: experimentId,
                contacts: [
                    { email: 'user1@test.com', name: 'User 1' },
                    { email: 'user2@test.com', name: 'User 2' }
                ]
            });

        expect(distResponse.status).toBe(201);

        // Verify assignments were created
        const assignments = await query(
            'SELECT COUNT(*) FROM ab_assignments WHERE experiment_id = $1',
            [experimentId]
        );

        expect(parseInt(assignments.rows[0].count)).toBe(2);
    });

    it('should reject distribution if experiment is not running', async () => {
        // Create experiment but don't start it
        // Attempt distribution
        // Expect error
    });

    it('should use variant-specific content in distribution', async () => {
        // Setup: Create experiment with different subjects
        // Send distribution
        // Verify emails sent with correct subjects
    });
});
```

**Run Tests**:
```bash
cd server
npm test -- distributions-ab.test.js
```

### Frontend Tests

#### 3. Component Tests (Jest + React Testing Library)

**File**: `client/src/components/ab-testing/__tests__/ABTestingDashboard.test.jsx`

```javascript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ABTestingDashboard from '../ABTestingDashboard';
import axios from '../../../axiosConfig';

jest.mock('../../../axiosConfig');
jest.mock('../../../hooks/useAnalyticsStream', () => ({
    useAnalyticsStream: () => ({ connected: true, error: null, reconnect: jest.fn() })
}));

describe('ABTestingDashboard', () => {
    const mockExperiments = [
        {
            id: 1,
            name: 'Email Subject Test',
            status: 'running',
            channel: 'email',
            success_metric: 'response_rate',
            total_assignments: 100
        }
    ];

    beforeEach(() => {
        axios.get.mockResolvedValue({ data: mockExperiments });
    });

    it('renders experiments list', async () => {
        render(
            <BrowserRouter>
                <ABTestingDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Email Subject Test')).toBeInTheDocument();
        });
    });

    it('filters experiments by status', async () => {
        render(
            <BrowserRouter>
                <ABTestingDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Email Subject Test')).toBeInTheDocument();
        });

        const runningTab = screen.getByText('Running');
        fireEvent.click(runningTab);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                '/api/ab-tests',
                { params: { status: 'running' } }
            );
        });
    });

    it('shows live indicator when SSE connected', async () => {
        render(
            <BrowserRouter>
                <ABTestingDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Live')).toBeInTheDocument();
        });
    });
});
```

**File**: `client/src/components/ab-testing/__tests__/ABExperimentBuilder.test.jsx`

```javascript
describe('ABExperimentBuilder', () => {
    it('validates required fields in step 1', () => {
        // Render wizard
        // Try to proceed without filling name
        // Expect error message
    });

    it('progresses through all 4 steps', () => {
        // Fill step 1
        // Click Next
        // Fill step 2
        // Click Next
        // Fill step 3
        // Click Next
        // See step 4 review
    });

    it('launches experiment on final step', async () => {
        // Complete all steps
        // Click Launch
        // Expect POST to /api/ab-tests
        // Expect POST to /api/ab-tests/:id/start
        // Expect navigation to results page
    });
});
```

**Run Tests**:
```bash
cd client
npm test -- ABTestingDashboard.test.jsx
npm test -- ABExperimentBuilder.test.jsx
```

### End-to-End Tests

#### 4. E2E Tests (Playwright)

**File**: `e2e/tests/ab-testing.spec.js`

```javascript
const { test, expect } = require('@playwright/test');
const { login, generateTestData } = require('./helpers/test-utils');

test.describe('A/B Testing Experiment Lifecycle', () => {
    test.beforeEach(async ({ page }) => {
        await login(page, 'test@example.com', 'password123');
    });

    test('Create and launch A/B test experiment', async ({ page }) => {
        // Navigate to A/B Testing
        await page.goto('/ab-tests');
        await expect(page.locator('h1')).toContainText('A/B Testing');

        // Click New Experiment
        await page.click('text=New Experiment');
        await expect(page).toHaveURL(/\/ab-tests\/new/);

        // Step 1: Details
        await page.fill('[name="name"]', 'Email Subject Line Test');
        await page.selectOption('[name="channel"]', 'email');
        await page.selectOption('[name="formId"]', '1');
        await page.click('text=Next');

        // Step 2: Variants
        await page.fill('[data-variant="A"] [name="subject"]', 'Hello World!');
        await page.fill('[data-variant="A"] [name="body"]', 'Test message A');
        await page.fill('[data-variant="B"] [name="subject"]', 'Hi There!');
        await page.fill('[data-variant="B"] [name="body"]', 'Test message B');
        await page.click('text=Next');

        // Step 3: Traffic (use default 50/50)
        await page.click('text=Next');

        // Step 4: Launch
        await page.click('text=Launch Experiment');

        // Verify redirect to results page
        await expect(page).toHaveURL(/\/ab-tests\/\d+/);
        await expect(page.locator('text=Variant A')).toBeVisible();
        await expect(page.locator('text=Variant B')).toBeVisible();
    });

    test('View experiment results and check for winner', async ({ page }) => {
        // Navigate to existing experiment
        await page.goto('/ab-tests/1');

        // Verify results display
        await expect(page.locator('text=Delivery Rate')).toBeVisible();
        await expect(page.locator('text=Response Rate')).toBeVisible();

        // Click Check for Winner
        await page.click('text=Check for Winner');

        // Expect either winner modal or "no winner yet" message
        // (depends on test data)
    });

    test('Live indicator shows SSE connection', async ({ page }) => {
        await page.goto('/ab-tests');

        // Wait for Live indicator
        await expect(page.locator('text=Live')).toBeVisible({ timeout: 5000 });
    });
});
```

**Run Tests**:
```bash
cd e2e
npx playwright test ab-testing.spec.js
```

## Manual Testing Checklist

### Backend Verification

- [ ] Run all migrations successfully: `npm run migrate`
- [ ] All unit tests pass: `npm test`
- [ ] API endpoints respond correctly:
  - [ ] `POST /api/ab-tests` creates experiment
  - [ ] `POST /api/ab-tests/:id/start` starts experiment
  - [ ] `GET /api/ab-tests/:id/results` returns results
  - [ ] `POST /api/ab-tests/:id/check-winner` detects winner
- [ ] SSE stream connects: `curl http://localhost:3000/api/analytics/sse/stream`
- [ ] Cron job logs appear every 5 minutes

### Frontend Verification

- [ ] Dashboard loads experiments
- [ ] Status filter works (all, draft, running, completed)
- [ ] Live indicator shows when SSE connected
- [ ] New Experiment wizard completes all 4 steps
- [ ] Traffic allocation validation works (must sum to 100%)
- [ ] Results page displays metrics correctly
- [ ] Charts render without errors
- [ ] Winner modal appears when winner declared

### Integration Verification

- [ ] Create distribution with experimentId
- [ ] Variants assigned correctly during distribution
- [ ] Message content matches variant
- [ ] SSE events received in real-time
- [ ] Winner auto-detected by cron job

## Performance Testing

### SSE Load Test

Test 100+ concurrent SSE connections:

```javascript
// loadtest-sse.js
const EventSource = require('eventsource');

const connections = [];
for (let i = 0; i < 100; i++) {
    const es = new EventSource('http://localhost:3000/api/analytics/sse/stream');
    es.onmessage = (event) => {
        console.log(`Connection ${i}: ${event.data}`);
    };
    connections.push(es);
}

console.log('100 connections established');
```

Run:
```bash
node loadtest-sse.js
```

### Memory Leak Test

Run server for 1 hour with continuous SSE connections and check memory usage:
```bash
node --inspect index.js
```

Open Chrome DevTools → Memory → Take heap snapshot before/after

## Test Coverage Goals

- **Backend**: 90%+ coverage for A/B testing services
- **Frontend**: 80%+ coverage for A/B testing components
- **E2E**: All critical user flows covered

## Known Test Limitations

1. **SSE Testing**: Mock SSE in unit tests, verify in E2E tests
2. **Cron Job Testing**: Test service methods directly, not cron scheduler
3. **Statistical Tests**: Use known datasets with expected outcomes

## Continuous Integration

Add to GitHub Actions workflow:

```yaml
- name: Run A/B Testing Tests
  run: |
    cd server
    npm test -- ab-testing
    npm test -- distributions-ab
    cd ../client
    npm test -- ab-testing
    cd ../e2e
    npx playwright test ab-testing.spec.js
```

## Next Steps

1. Implement test files listed above
2. Run test coverage reports
3. Fix any failing tests
4. Add tests to CI/CD pipeline
5. Document test results in IMPLEMENTATION_SUMMARY.md
