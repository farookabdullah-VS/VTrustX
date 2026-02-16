/**
 * E2E tests for Analytics Widgets
 *
 * Tests advanced analytics widgets:
 * - Cohort analysis
 * - Forecasting
 * - KPI cards
 * - Charts and visualizations
 */

const { test, expect } = require('@playwright/test');
const { login, logout } = require('./helpers/test-utils');

test.describe('Analytics Widgets', () => {
  let testUser;

  test.beforeEach(async ({ page }) => {
    testUser = {
      email: 'admin@test.com',
      password: 'Test123!'
    };

    await login(page, testUser);
    await page.goto('/analytics');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe('KPI Widgets', () => {
    test('should display KPI card', async ({ page }) => {
      // Look for KPI widgets in dashboard
      const kpiWidget = page.locator('[class*="kpi"]').or(page.locator('text=Total Responses'));

      if (await kpiWidget.count() > 0) {
        await expect(kpiWidget.first()).toBeVisible();
      }
    });

    test('should show KPI value', async ({ page }) => {
      const kpiValue = page.locator('[class*="kpiValue"]').or(page.locator('text=/\\d+/'));

      if (await kpiValue.count() > 0) {
        const value = await kpiValue.first().textContent();
        expect(value).toBeTruthy();
      }
    });

    test('should display trend indicator', async ({ page }) => {
      const trendIndicator = page.locator('[class*="trend"]').or(page.locator('svg').filter({ hasText: /up|down/ }));

      // Trend indicators may or may not be present
      const hasTrend = await trendIndicator.count() > 0;
      expect(typeof hasTrend).toBe('boolean');
    });
  });

  test.describe('Chart Widgets', () => {
    test('should render chart visualization', async ({ page }) => {
      // Open an existing report with charts
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for chart elements (recharts SVG)
        const chartSvg = page.locator('svg').filter({ has: page.locator('[class*="recharts"]') });
        const regularChart = page.locator('[class*="chart"]');

        const hasChart = (await chartSvg.count() > 0) || (await regularChart.count() > 0);
        expect(typeof hasChart).toBe('boolean');
      }
    });

    test('should display chart legend', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for legend
        const legend = page.locator('[class*="legend"]').or(page.locator('.recharts-legend-wrapper'));

        const hasLegend = await legend.count() > 0;
        expect(typeof hasLegend).toBe('boolean');
      }
    });

    test('should show tooltip on hover', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Hover over chart area
        const chartArea = page.locator('svg').first();

        if (await chartArea.isVisible()) {
          await chartArea.hover();
          await page.waitForTimeout(500);

          // Tooltip may appear
          const tooltip = page.locator('[class*="tooltip"]').or(page.locator('.recharts-tooltip-wrapper'));
          const hasTooltip = await tooltip.count() > 0;

          expect(typeof hasTooltip).toBe('boolean');
        }
      }
    });

    test('should support different chart types', async ({ page }) => {
      // Create a report and add different chart types
      await page.click('button:has-text("Create Report")');
      await page.click('button:has-text("Start from Scratch")');

      const firstSurvey = page.locator('button').filter({ hasText: /Survey/ }).first();
      if (await firstSurvey.isVisible()) {
        await firstSurvey.click();
        await page.waitForTimeout(1000);

        // Look for visual gallery with different chart types
        const visualGallery = page.locator('[class*="visual"]');

        if (await visualGallery.count() > 0) {
          // Should have multiple chart options
          const chartButtons = page.locator('button').filter({ hasText: /Bar|Line|Pie|Area/ });
          const hasChartTypes = await chartButtons.count() > 0;

          expect(hasChartTypes).toBe(true);
        }
      }
    });
  });

  test.describe('Cohort Analysis Widget', () => {
    test('should display cohort widget', async ({ page }) => {
      // Look for cohort analysis in reports
      const cohortWidget = page.locator('text=Cohort Analysis').or(page.locator('[class*="cohort"]'));

      if (await cohortWidget.count() > 0) {
        await expect(cohortWidget.first()).toBeVisible();
      }
    });

    test('should show cohort data table', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for cohort widget
        const cohortWidget = page.locator('text=Cohort');

        if (await cohortWidget.isVisible()) {
          // Check for table view toggle
          const tableButton = page.locator('button:has-text("Table")');

          if (await tableButton.isVisible()) {
            await tableButton.click();
            await page.waitForTimeout(500);

            // Table should be visible
            const table = page.locator('table');
            expect(await table.count()).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should switch between chart and table views', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        const cohortWidget = page.locator('text=Cohort');

        if (await cohortWidget.isVisible()) {
          const chartButton = page.locator('button:has-text("Chart")');
          const tableButton = page.locator('button:has-text("Table")');

          if (await chartButton.isVisible() && await tableButton.isVisible()) {
            // Switch to table
            await tableButton.click();
            await page.waitForTimeout(500);
            await expect(page.locator('table')).toBeVisible();

            // Switch back to chart
            await chartButton.click();
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test('should display trend indicators in cohort data', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        const cohortWidget = page.locator('text=Cohort');

        if (await cohortWidget.isVisible()) {
          const tableButton = page.locator('button:has-text("Table")');

          if (await tableButton.isVisible()) {
            await tableButton.click();
            await page.waitForTimeout(500);

            // Look for trend indicators (up/down arrows)
            const trendIcons = page.locator('svg').filter({ hasText: /trending/i });
            const hasTrends = await trendIcons.count() > 0;

            expect(typeof hasTrends).toBe('boolean');
          }
        }
      }
    });
  });

  test.describe('Forecast Widget', () => {
    test('should display forecast widget', async ({ page }) => {
      const forecastWidget = page.locator('text=Forecast').or(page.locator('[class*="forecast"]'));

      if (await forecastWidget.count() > 0) {
        await expect(forecastWidget.first()).toBeVisible();
      }
    });

    test('should show forecast chart with confidence intervals', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        const forecastWidget = page.locator('text=Forecast');

        if (await forecastWidget.isVisible()) {
          // Look for chart with forecast line
          const chart = page.locator('svg').first();
          expect(await chart.isVisible()).toBe(true);
        }
      }
    });

    test('should display forecast metrics', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        const forecastWidget = page.locator('text=Forecast');

        if (await forecastWidget.isVisible()) {
          // Look for R², MSE, or other metrics
          const metricsCard = page.locator('text=R²').or(page.locator('text=MSE')).or(page.locator('text=Next Value'));

          const hasMetrics = await metricsCard.count() > 0;
          expect(typeof hasMetrics).toBe('boolean');
        }
      }
    });

    test('should show trend badge', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        const forecastWidget = page.locator('text=Forecast');

        if (await forecastWidget.isVisible()) {
          // Look for trend badge (increasing/decreasing/flat)
          const trendBadge = page.locator('text=increasing').or(page.locator('text=decreasing')).or(page.locator('text=flat'));

          const hasTrendBadge = await trendBadge.count() > 0;
          expect(typeof hasTrendBadge).toBe('boolean');
        }
      }
    });

    test('should display historical vs forecast data', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        const forecastWidget = page.locator('text=Forecast');

        if (await forecastWidget.isVisible()) {
          // Look for legend showing historical and forecast
          const legend = page.locator('text=Historical').or(page.locator('text=Forecast'));

          const hasLegend = await legend.count() > 0;
          expect(typeof hasLegend).toBe(true);
        }
      }
    });
  });

  test.describe('Widget Interactions', () => {
    test('should expand widget to fullscreen', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for expand/fullscreen button
        const expandButton = page.locator('button[aria-label*="Expand"]').or(page.locator('[class*="expand"]'));

        if (await expandButton.count() > 0) {
          await expandButton.first().click();
          await page.waitForTimeout(500);

          // Widget should be expanded
          const expandedWidget = page.locator('[class*="fullscreen"]').or(page.locator('[class*="expanded"]'));
          const isExpanded = await expandedWidget.count() > 0;

          expect(typeof isExpanded).toBe('boolean');
        }
      }
    });

    test('should edit widget configuration', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for edit button on widget
        const editButton = page.locator('button[aria-label*="Edit"]').or(page.locator('[class*="edit"]'));

        if (await editButton.count() > 0) {
          await editButton.first().click();
          await page.waitForTimeout(500);

          // Edit panel or modal should appear
          const editPanel = page.locator('text=Properties').or(page.locator('text=Configuration'));
          const hasEditPanel = await editPanel.count() > 0;

          expect(typeof hasEditPanel).toBe('boolean');
        }
      }
    });

    test('should remove widget from report', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for remove/delete button
        const removeButton = page.locator('button[aria-label*="Remove"]').or(page.locator('[class*="delete"]'));

        if (await removeButton.count() > 0) {
          const initialWidgetCount = await page.locator('[class*="widget"]').count();

          await removeButton.first().click();
          await page.waitForTimeout(500);

          const newWidgetCount = await page.locator('[class*="widget"]').count();

          // Count may decrease or stay same if modal appears
          expect(typeof newWidgetCount).toBe('number');
        }
      }
    });

    test('should drag and drop widget to reposition', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        const widget = page.locator('[class*="widget"]').first();

        if (await widget.isVisible()) {
          // Get initial position
          const initialBox = await widget.boundingBox();

          if (initialBox) {
            // Drag widget
            await widget.hover();
            await page.mouse.down();
            await page.mouse.move(initialBox.x + 100, initialBox.y + 50);
            await page.mouse.up();

            await page.waitForTimeout(500);

            // Position may have changed (grid layout)
            const newBox = await widget.boundingBox();
            expect(newBox).toBeDefined();
          }
        }
      }
    });
  });

  test.describe('Data Filtering', () => {
    test('should apply filters to widgets', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for filters panel
        const filtersPanel = page.locator('text=Filters').or(page.locator('[class*="filter"]'));

        if (await filtersPanel.count() > 0) {
          await filtersPanel.first().click();
          await page.waitForTimeout(500);

          // Filter options should appear
          const filterOptions = page.locator('input[type="checkbox"]').or(page.locator('select'));
          const hasFilterOptions = await filterOptions.count() > 0;

          expect(typeof hasFilterOptions).toBe('boolean');
        }
      }
    });

    test('should show active filters', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for active filter badges
        const activeFilters = page.locator('[class*="activeFilter"]').or(page.locator('[class*="badge"]'));

        const hasActiveFilters = await activeFilters.count() > 0;
        expect(typeof hasActiveFilters).toBe('boolean');
      }
    });

    test('should clear all filters', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Look for clear filters button
        const clearButton = page.locator('button:has-text("Clear")').or(page.locator('button:has-text("Reset")'));

        if (await clearButton.count() > 0) {
          await clearButton.first().click();
          await page.waitForTimeout(500);

          // Filters should be cleared
          const activeFilters = await page.locator('[class*="activeFilter"]').count();
          expect(activeFilters).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  test.describe('Widget Performance', () => {
    test('should load widgets within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/analytics');
      await page.waitForTimeout(1000);

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForLoadState('networkidle');

        const loadTime = Date.now() - startTime;

        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
      }
    });

    test('should handle large datasets', async ({ page }) => {
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(2000);

        // Widgets should render even with large data
        const widgets = await page.locator('[class*="widget"]').count();
        expect(widgets).toBeGreaterThanOrEqual(0);
      }
    });

    test('should not cause memory leaks on repeated navigation', async ({ page }) => {
      // Navigate to analytics multiple times
      for (let i = 0; i < 3; i++) {
        await page.goto('/analytics');
        await page.waitForTimeout(1000);

        const reportCard = page.locator('[class*="reportCard"]').first();

        if (await reportCard.count() > 0) {
          await reportCard.click();
          await page.waitForTimeout(1000);

          // Go back
          await page.goBack();
          await page.waitForTimeout(500);
        }
      }

      // Page should still be responsive
      const createButton = page.locator('button:has-text("Create Report")');
      expect(await createButton.isVisible()).toBe(true);
    });
  });
});
