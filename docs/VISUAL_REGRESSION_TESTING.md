# Visual Regression Testing Guide

## Overview
This document provides guidance for visual regression testing in VTrustX to ensure design consistency and catch unintended visual changes after code modifications, especially following the Phase 1 design token migration.

**Purpose:** Verify CSS design token migration hasn't introduced visual regressions
**Last Updated:** February 15, 2026

---

## 1. What is Visual Regression Testing?

Visual regression testing compares screenshots of your application before and after changes to detect unintended visual differences. This is especially critical after:

- CSS design token migration (Phase 1 - COMPLETE)
- Theme system updates
- Component library changes
- Browser updates
- Responsive layout modifications

---

## 2. Testing Strategy

### 2.1 Manual Visual Inspection (Quick Check)
**Time:** 30-60 minutes
**When:** After each design token migration

**Checklist:**
- [ ] Open app in browser (Chrome recommended)
- [ ] Navigate through key pages side-by-side with Git diff
- [ ] Verify no visual changes from token replacements
- [ ] Check light/dark theme switching (if implemented)
- [ ] Test responsive breakpoints (360px, 768px, 1024px, 1920px)

**Key Pages to Verify:**
1. Dashboard (/)
2. Forms List (/forms)
3. Form Builder (/forms/create)
4. Results Viewer (/forms/:id/results)
5. Analytics Studio (/analytics)
6. Settings (/settings)
7. User Management (/admin/users)
8. CRM Dashboard (/crm)

**What to Look For:**
- Spacing/padding changes
- Color variations
- Font size differences
- Border radius changes
- Box shadow differences
- Layout shifts
- Broken responsive behavior

### 2.2 Automated Visual Regression Testing
**Time:** Initial setup 2-4 hours, ongoing 15-30 minutes per run
**When:** Before major releases, after design system changes

---

## 3. Tools & Setup

### 3.1 Playwright with Visual Comparisons (Recommended)
**Why Playwright?**
- Built-in screenshot comparison
- Cross-browser support
- Reliable, fast execution
- Already used for E2E tests in VTrustX

**Installation:**
```bash
cd D:\VTrustX\e2e
npm install --save-dev @playwright/test

# Verify installation
npx playwright --version
```

**Configuration:** `playwright.config.js`
```javascript
module.exports = {
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Visual comparison settings
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100, // Allow minor anti-aliasing differences
      threshold: 0.2,     // 20% difference threshold
    },
  },
};
```

**Create Visual Test Suite:** `e2e/tests/visual-regression.spec.js`
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/');
  });

  test('Dashboard page', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
    });
  });

  test('Forms list page', async ({ page }) => {
    await page.goto('http://localhost:3000/forms');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('forms-list.png', {
      fullPage: true,
    });
  });

  test('Form builder', async ({ page }) => {
    await page.goto('http://localhost:3000/forms/create');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('form-builder.png', {
      fullPage: true,
    });
  });

  test('Analytics Studio', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for charts to render
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('analytics-studio.png', {
      fullPage: true,
    });
  });

  test('Settings page', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings.png', {
      fullPage: true,
    });
  });

  // Responsive tests
  test('Dashboard - Mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 Pro
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
    });
  });

  test('Dashboard - Tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
    });
  });

  // Component-level tests
  test('Modal dialog', async ({ page }) => {
    await page.goto('http://localhost:3000/forms');
    await page.waitForLoadState('networkidle');

    // Open create modal
    await page.click('text=Create New Survey');
    await page.waitForSelector('.modal-overlay');

    await expect(page.locator('.modal-overlay')).toHaveScreenshot('create-modal.png');
  });

  test('Dropdown menu', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Open dropdown (adjust selector as needed)
    await page.click('[data-testid="survey-menu"]');
    await page.waitForSelector('.dropdown-menu');

    await expect(page.locator('.dropdown-menu')).toHaveScreenshot('dropdown-menu.png');
  });
});
```

**Running Visual Tests:**
```bash
cd D:\VTrustX\e2e

# First run - generate baseline screenshots
npm run test:visual

# Subsequent runs - compare against baseline
npm run test:visual

# Update baselines after intentional changes
npm run test:visual -- --update-snapshots

# Test specific viewport
npm run test:visual -- --project=chromium
npm run test:visual -- --project=firefox
npm run test:visual -- --project=webkit
```

**Add to package.json:**
```json
{
  "scripts": {
    "test:visual": "playwright test visual-regression.spec.js",
    "test:visual:update": "playwright test visual-regression.spec.js --update-snapshots"
  }
}
```

### 3.2 Alternative: Percy (Visual Testing Platform)
**Pros:**
- Cloud-based visual diffing
- Parallel testing
- Historical tracking
- Team collaboration
- CI/CD integration

**Cons:**
- Paid service (free tier available)
- Requires internet connection
- External dependency

**Setup:**
```bash
npm install --save-dev @percy/cli @percy/playwright

# Set Percy token
export PERCY_TOKEN=your_token_here
```

**Usage:**
```bash
npx percy exec -- playwright test
```

### 3.3 Alternative: BackstopJS
**Pros:**
- Free and open-source
- Detailed visual diff reports
- CSS selector testing

**Cons:**
- More complex setup
- Slower than Playwright
- Less maintained

---

## 4. Theme Testing

### 4.1 White-Label Theme Verification
After design token migration, verify custom themes work correctly:

**Test Process:**
1. Create test theme in `client/src/themes/test-theme.css`:
```css
:root {
  --status-info: #FF6B6B;        /* Changed from blue */
  --text-primary: #2C3E50;       /* Changed from default */
  --card-bg: #F8F9FA;            /* Changed from white */
  --radius-md: 16px;             /* Changed from 8px */
  --space-6: 32px;               /* Changed from 24px */
}
```

2. Apply theme and take screenshots
3. Verify all components use design tokens (no hardcoded values showing)
4. Check for any broken layouts due to token changes

**Visual Checklist:**
- [ ] Colors change throughout app (not just some areas)
- [ ] Spacing changes apply consistently
- [ ] Border radius changes apply consistently
- [ ] No hardcoded values visible
- [ ] No broken layouts
- [ ] Typography scales correctly
- [ ] Box shadows adapt to colors

### 4.2 Dark Mode Testing (Future)
**When implemented:**
- [ ] All pages render correctly in dark mode
- [ ] Contrast ratios maintained (WCAG AA)
- [ ] Images/icons adapt appropriately
- [ ] No white/light backgrounds bleeding through
- [ ] Smooth transition between light/dark

---

## 5. Responsive Visual Testing

### 5.1 Breakpoint Testing
Test key breakpoints defined in `responsive.css`:

**Breakpoints:**
- **Mobile:** 360px, 375px, 390px, 412px
- **Tablet:** 768px, 820px, 1024px
- **Desktop:** 1280px, 1440px, 1920px

**Playwright Test:**
```javascript
const viewports = [
  { name: 'mobile-small', width: 360, height: 800 },
  { name: 'mobile-iphone', width: 390, height: 844 },
  { name: 'tablet-ipad', width: 768, height: 1024 },
  { name: 'tablet-ipad-air', width: 820, height: 1180 },
  { name: 'desktop-hd', width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`Dashboard - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height
    });
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
      fullPage: true,
    });
  });
}
```

### 5.2 Orientation Testing
**Test Cases:**
- [ ] Portrait orientation (standard)
- [ ] Landscape orientation (tablets/phones)
- [ ] Layout adapts smoothly to orientation change
- [ ] No content cutoff in landscape

---

## 6. Component-Level Testing

### 6.1 Critical Components to Test
Test components in isolation to catch CSS token issues:

**Components:**
1. **Buttons** (all variants: primary, secondary, danger, disabled)
2. **Form inputs** (text, select, checkbox, radio, textarea)
3. **Cards** (survey cards, metric cards, profile cards)
4. **Tables** (data tables with various row counts)
5. **Modals** (dialogs, confirmations, forms)
6. **Navigation** (sidebar, bottom nav, breadcrumbs)
7. **Dropdowns** (menus, selects, command palette)
8. **Charts** (bar, line, pie from Analytics Studio)
9. **Empty states** (no data, errors, loading)
10. **Badges & tags** (status, labels, scope badges)

**Storybook Integration (Future):**
```bash
# If Storybook is added
npm run storybook
npm run test:visual:storybook
```

---

## 7. Cross-Browser Testing

### 7.1 Browser Matrix
**Priority Browsers:**
- [ ] **Chrome** (latest) - 70% market share
- [ ] **Safari** (latest) - iOS users
- [ ] **Firefox** (latest) - Developer preference
- [ ] **Edge** (latest) - Enterprise users

**Playwright Configuration:**
```javascript
// playwright.config.js
module.exports = {
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
};
```

**Run cross-browser tests:**
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## 8. Testing Workflow

### 8.1 Before Code Changes
```bash
# 1. Start dev server
cd D:\VTrustX\client
npm run dev

# 2. Generate baseline screenshots
cd ../e2e
npm run test:visual

# Baseline images saved to:
# e2e/tests/visual-regression.spec.js-snapshots/
```

### 8.2 After Code Changes
```bash
# 1. Run visual tests
npm run test:visual

# 2. Review differences
# Playwright shows side-by-side comparison in HTML report

# 3. If changes are intentional:
npm run test:visual -- --update-snapshots

# 4. If changes are bugs:
# Fix CSS/code and re-run tests
```

### 8.3 CI/CD Integration
**GitHub Actions Workflow:** `.github/workflows/visual-regression.yml`
```yaml
name: Visual Regression Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd client && npm ci
          cd ../e2e && npm ci

      - name: Build app
        run: cd client && npm run build

      - name: Start server
        run: |
          cd client
          npm run preview &
          npx wait-on http://localhost:3000

      - name: Run visual tests
        run: cd e2e && npm run test:visual

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

---

## 9. Analyzing Test Results

### 9.1 Playwright HTML Report
After running tests, Playwright generates an HTML report:

```bash
# View report
npx playwright show-report

# Report location: e2e/playwright-report/index.html
```

**Report Features:**
- Side-by-side image comparison
- Diff highlighting (red = removed, green = added)
- Pixel difference count
- Pass/fail status
- Test execution timeline

### 9.2 Interpreting Differences
**Expected Differences (Pass):**
- Anti-aliasing variations (<100 pixels difference)
- Dynamic content (dates, random data)
- Loading states (if timing varies)

**Unexpected Differences (Fail):**
- Color changes (design tokens not applied correctly)
- Spacing changes (padding/margin tokens incorrect)
- Border radius changes (radius tokens incorrect)
- Layout shifts (responsive breakpoints broken)
- Font size changes (typography tokens incorrect)

**Action Items:**
```
If test fails:
1. View diff image in HTML report
2. Identify what changed
3. Check if change is intentional:
   - YES → Update snapshots
   - NO → Fix CSS bug and re-run test
```

---

## 10. Best Practices

### 10.1 Screenshot Stability
**Make screenshots deterministic:**
- Hide dynamic content (dates, timestamps)
- Use fixed test data
- Wait for animations to complete
- Wait for network idle
- Hide auto-playing videos
- Freeze time in tests (if needed)

**Example:**
```javascript
test('Stable dashboard screenshot', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Hide dynamic elements
  await page.addStyleTag({
    content: `
      .timestamp, .live-badge, .animated-element {
        visibility: hidden !important;
      }
    `
  });

  // Wait for everything to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Let animations finish

  await expect(page).toHaveScreenshot('dashboard-stable.png');
});
```

### 10.2 Handling Flaky Tests
**Common causes:**
- Network timing variations
- Animation timing
- External API responses
- Browser font rendering differences

**Solutions:**
- Increase `maxDiffPixels` threshold
- Add explicit waits
- Mock external APIs
- Use consistent test data

### 10.3 Snapshot Management
**DO:**
- Commit baseline screenshots to Git
- Update snapshots after intentional design changes
- Review snapshot diffs in PRs
- Keep snapshots organized by feature

**DON'T:**
- Update snapshots blindly to make tests pass
- Ignore small differences without investigation
- Let snapshot files grow too large
- Forget to update snapshots after design token changes

---

## 11. Testing Checklist

### 11.1 After Design Token Migration
- [ ] Run full visual regression suite
- [ ] Compare all pages side-by-side
- [ ] Verify spacing matches exactly
- [ ] Verify colors match exactly
- [ ] Verify border-radius matches
- [ ] Verify typography matches
- [ ] Check all responsive breakpoints
- [ ] Test light/dark themes (if applicable)
- [ ] Update snapshots if all correct

### 11.2 Before Each Release
- [ ] Run visual tests on main branch
- [ ] Test on all target browsers
- [ ] Test on all target devices
- [ ] Review any new differences
- [ ] Update snapshots if needed
- [ ] Document any known visual issues

---

## 12. Known Issues & Limitations

### 12.1 Expected Variations
**Anti-aliasing:** Different browsers may render fonts slightly differently
**Solution:** Set `maxDiffPixels: 100` threshold

**Dynamic content:** Timestamps, live badges, random data
**Solution:** Hide or mock dynamic elements

**External images:** Profile pictures, remote content
**Solution:** Use placeholder images in tests

### 12.2 Future Improvements
- [ ] Add visual tests for all major components
- [ ] Integrate with CI/CD pipeline
- [ ] Add Percy or similar visual testing platform
- [ ] Create component-level visual tests (Storybook)
- [ ] Add performance metrics to visual tests
- [ ] Test with real user data (anonymized)

---

## 13. Success Criteria

### 13.1 Phase 1 Design Token Migration Verification
- ✅ All pages visually identical before/after migration
- ✅ No spacing regressions
- ✅ No color regressions
- ✅ No typography regressions
- ✅ No layout shifts
- ✅ All responsive breakpoints work correctly

### 13.2 Ongoing Visual Regression Testing
- ✅ Visual tests run on every PR
- ✅ No unintended visual changes merged
- ✅ Baseline screenshots up to date
- ✅ Test coverage for all critical pages
- ✅ Cross-browser compatibility verified

---

## 14. Resources

### 14.1 Documentation
- **Playwright Visual Comparisons:** https://playwright.dev/docs/test-snapshots
- **Percy Documentation:** https://docs.percy.io/
- **BackstopJS:** https://github.com/garris/BackstopJS

### 14.2 Tools
- **Playwright:** https://playwright.dev/
- **Percy:** https://percy.io/
- **Chromatic:** https://www.chromatic.com/
- **Applitools:** https://applitools.com/

---

## Conclusion

Visual regression testing is essential after the Phase 1 design token migration to ensure no unintended visual changes were introduced. This guide provides multiple approaches ranging from manual inspection (30-60 minutes) to fully automated testing with Playwright (2-4 hours setup, then 15-30 minutes per run).

**Recommended Approach:**
1. **Immediate:** Manual visual inspection of all pages (60 minutes)
2. **Short-term:** Set up Playwright visual tests (4 hours)
3. **Long-term:** Integrate visual tests into CI/CD pipeline

**Testing Time Estimate:**
- Manual inspection: 1 hour
- Automated setup: 4 hours (one-time)
- Automated execution: 15-30 minutes per run
- Review and analysis: 30-60 minutes per run

---

**Document Version:** 1.0
**Last Updated:** February 15, 2026
**Maintained By:** Development Team
**Review Frequency:** After major design changes
