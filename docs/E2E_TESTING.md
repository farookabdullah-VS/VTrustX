# End-to-End (E2E) Testing Guide

This document explains the E2E testing setup using Playwright for RayiX.

## Overview

E2E tests simulate real user interactions with the application, testing complete user workflows from frontend to backend to database.

**Test Coverage:**
- ✅ Authentication (login, register, logout)
- ✅ Forms management (create, edit, delete)
- ✅ Survey submission
- ✅ Protected routes
- ✅ Form validation

## Technology Stack

- **Framework**: [Playwright](https://playwright.dev/) - Fast, reliable E2E testing
- **Browser**: Chromium (headless by default, can run headed)
- **Test Runner**: Playwright Test Runner
- **Language**: JavaScript (Node.js)

## Quick Start

### Run All E2E Tests

```bash
# Headless mode (default)
npm run test:e2e --prefix server

# With UI (interactive mode)
npm run test:e2e:ui --prefix server

# Headed mode (see browser)
npm run test:e2e:headed --prefix server

# View last report
npm run test:e2e:report --prefix server
```

### Run Specific Tests

```bash
cd e2e

# Run specific test file
npx playwright test tests/auth.spec.js

# Run tests matching pattern
npx playwright test -g "login"

# Debug mode (step through tests)
npx playwright test --debug
```

## Project Structure

```
e2e/
├── playwright.config.js      # Playwright configuration
├── tests/
│   ├── auth.spec.js          # Authentication tests
│   ├── forms.spec.js         # Forms management tests
│   ├── survey-submission.spec.js # Survey submission tests
│   └── helpers/
│       └── test-utils.js     # Test helper functions
├── playwright-report/        # HTML test reports
└── test-results/             # Screenshots & videos on failure
```

## Test Suites

### 1. Authentication Tests (`auth.spec.js`)

**Tests:**
- Display login page
- Show error on invalid credentials
- Successfully register new user
- Successfully login with valid credentials
- Logout successfully
- Protect dashboard route when not authenticated

**Example:**
```javascript
test('should successfully login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*\/dashboard/);
});
```

### 2. Forms Management Tests (`forms.spec.js`)

**Tests:**
- Navigate to forms page
- Display forms list
- Open form builder
- Create a basic form
- Edit an existing form
- Delete a form

**Prerequisites:**
- User must be logged in (handled by `beforeEach`)

### 3. Survey Submission Tests (`survey-submission.spec.js`)

**Tests:**
- Load public survey form
- Validate required fields
- Successfully submit survey
- Display thank you page after submission
- Prevent duplicate submissions

**Note:** These tests require a test survey to exist. You may need to create one first or skip these tests if no survey is available.

## Configuration

### Playwright Config (`playwright.config.js`)

Key settings:
- **Base URL**: `http://localhost:3000` (configurable via `BASE_URL` env var)
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Parallel**: Yes (except on CI)
- **Screenshots**: On failure only
- **Video**: Retained on failure
- **Web Server**: Auto-starts server before tests

### Environment Variables

```bash
# Base URL (default: http://localhost:3000)
BASE_URL=http://localhost:3000

# Test credentials
TEST_USERNAME=admin
TEST_PASSWORD=admin123

# Test survey (for submission tests)
TEST_SURVEY_SLUG=test-survey

# Database (for test server)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rayix_test
```

## Writing Tests

### Basic Test Structure

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test steps
    await page.click('button');
    await expect(page.locator('h1')).toHaveText('Success');
  });
});
```

### Using Test Utilities

```javascript
const { login, generateTestData } = require('./helpers/test-utils');

test('should access protected route', async ({ page }) => {
  // Login helper
  await login(page, 'admin', 'admin123');

  // Navigate to protected route
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/.*\/dashboard/);
});

test('should create unique user', async ({ page }) => {
  const data = generateTestData('signup');

  await page.goto('/register');
  await page.fill('input[name="username"]', data.username);
  await page.fill('input[name="email"]', data.email);
  // ... rest of registration
});
```

### Best Practices

1. **Use specific locators:**
   ```javascript
   // Good
   await page.locator('button[type="submit"]').click();

   // Avoid
   await page.locator('button').first().click();
   ```

2. **Wait for elements properly:**
   ```javascript
   // Good
   await expect(page.locator('h1')).toBeVisible();

   // Avoid
   await page.waitForTimeout(2000);
   ```

3. **Generate unique test data:**
   ```javascript
   const timestamp = Date.now();
   const email = `test${timestamp}@example.com`;
   ```

4. **Clean up after tests:**
   ```javascript
   test.afterEach(async ({ page }) => {
     // Delete test data
     // Clear cookies
   });
   ```

5. **Use descriptive test names:**
   ```javascript
   // Good
   test('should show error when email is invalid', ...)

   // Avoid
   test('email validation', ...)
   ```

## CI/CD Integration

E2E tests run automatically in GitHub Actions on:
- Push to `main` branch
- Pull requests to `main`
- Manual workflow dispatch

### Workflow: `.github/workflows/e2e-tests.yml`

**Steps:**
1. Setup PostgreSQL test database
2. Install dependencies (server, client, Playwright)
3. Run database migrations
4. Seed test data (admin user)
5. Build frontend
6. Run E2E tests
7. Upload test reports & screenshots on failure

**Artifacts:**
- Playwright HTML report (always uploaded)
- Screenshots & videos (uploaded on failure)

## Debugging

### Debug Mode

Run tests step-by-step with Playwright Inspector:

```bash
cd e2e
npx playwright test --debug
```

### Headed Mode

See the browser while tests run:

```bash
npm run test:e2e:headed --prefix server
```

### Screenshot on Failure

Screenshots are automatically taken on test failures and saved to `e2e/test-results/`.

### Video Recording

Videos are recorded for failed tests and saved to `e2e/test-results/`.

### Trace Viewer

View detailed traces of test execution:

```bash
cd e2e
npx playwright show-trace test-results/trace.zip
```

## Test Data Management

### Test Database

Tests use a separate database (`rayix_test`) to avoid polluting production data.

**Setup:**
```sql
CREATE DATABASE rayix_test;
```

**Reset between runs:**
```bash
# Drop and recreate
psql -c "DROP DATABASE IF EXISTS rayix_test;"
psql -c "CREATE DATABASE rayix_test;"

# Run migrations
npm run migrate --prefix server
```

### Seed Data

Create test users and data for E2E tests:

```javascript
// server/scripts/seed-test-data.js
const bcrypt = require('bcryptjs');
const db = require('../src/infrastructure/database/db');

async function seed() {
  const hash = await bcrypt.hash('admin123', 10);

  await db.query(`
    INSERT INTO users (username, email, password, role, tenant_id)
    VALUES ('admin', 'admin@test.com', $1, 'admin', 1)
    ON CONFLICT (username) DO NOTHING
  `, [hash]);

  console.log('Test data seeded');
  await db.close();
}

seed();
```

Run: `node server/scripts/seed-test-data.js`

## Common Issues

### Issue: Server doesn't start

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:3000`

**Solution:**
- Check if port 3000 is already in use
- Verify database is running
- Check environment variables

### Issue: Tests timeout

**Error**: `Test timeout of 30000ms exceeded`

**Solution:**
- Increase timeout in `playwright.config.js`
- Check if server is responding
- Simplify complex selectors

### Issue: Element not found

**Error**: `locator.click: Error: strict mode violation`

**Solution:**
- Use more specific selectors
- Wait for element to be visible
- Check if element exists in current UI

### Issue: Flaky tests

**Problem**: Tests pass sometimes, fail other times

**Solution:**
- Add explicit waits (`waitForSelector`, `waitForLoadState`)
- Use `expect().toBeVisible()` instead of `waitForTimeout`
- Check for race conditions

## Performance

### Test Execution Time

- **Average**: ~30-60 seconds for full suite
- **Per test**: ~2-5 seconds

### Optimization Tips

1. **Run tests in parallel** (already enabled)
2. **Use `test.describe.configure({ mode: 'parallel' })`** for independent tests
3. **Reuse authentication state** (Playwright storage state)
4. **Mock API calls** for non-critical paths (use `page.route()`)

## Reporting

### HTML Report

Generated after test run:

```bash
# Open report
npm run test:e2e:report --prefix server
```

Includes:
- Test results (pass/fail)
- Test duration
- Screenshots & videos
- Trace files

### CI Report

On GitHub Actions:
- See workflow run for test status
- Download artifacts (reports, screenshots)
- View annotations for failed tests

## Maintenance

### Updating Playwright

```bash
cd e2e
npm update @playwright/test
npx playwright install
```

### Adding New Tests

1. Create new spec file in `e2e/tests/`
2. Follow naming convention: `feature-name.spec.js`
3. Use test utilities from `helpers/test-utils.js`
4. Add to CI workflow (auto-detected by pattern)

### Skipping Tests

```javascript
// Skip single test
test.skip('should do something', async ({ page }) => {
  // ...
});

// Skip entire suite
test.describe.skip('Feature Name', () => {
  // ...
});

// Conditional skip
test('should work on desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop only');
  // ...
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Test Generator](https://playwright.dev/docs/codegen) - Generate tests by recording interactions
