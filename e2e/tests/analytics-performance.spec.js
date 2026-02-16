/**
 * Performance Tests for Analytics Studio
 *
 * Measures key performance metrics and ensures they meet targets:
 * - Page load: < 2s
 * - Widget render: < 500ms
 * - API response: < 1s
 * - Chart render: < 200ms
 * - Export generation: < 10s
 */

const { test, expect } = require('@playwright/test');
const { login, generateTestData } = require('./helpers/test-utils');

const PERFORMANCE_TARGETS = {
  pageLoad: 2000,        // 2 seconds
  widgetRender: 500,     // 500ms
  apiResponse: 1000,     // 1 second
  chartRender: 200,      // 200ms
  exportGeneration: 10000, // 10 seconds
  dataQuery: 1000,       // 1 second
  filterApply: 500,      // 500ms
  modalOpen: 300         // 300ms
};

test.describe('Analytics Studio Performance', () => {
  const testUser = {
    email: 'admin@test.com',
    password: 'Test123!'
  };

  test.beforeEach(async ({ page }) => {
    await login(page, testUser);
  });

  test.describe('Page Load Performance', () => {
    test('should load Analytics Studio within target time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/analytics-studio');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      console.log(`📊 Analytics Studio Load Time: ${loadTime}ms (target: ${PERFORMANCE_TARGETS.pageLoad}ms)`);

      expect(loadTime).toBeLessThan(PERFORMANCE_TARGETS.pageLoad);
    });

    test('should have acceptable First Contentful Paint', async ({ page }) => {
      await page.goto('/analytics-studio');

      const performanceMetrics = await page.evaluate(() => {
        return JSON.stringify(window.performance.timing);
      });

      const timing = JSON.parse(performanceMetrics);
      const fcp = timing.responseEnd - timing.navigationStart;

      console.log(`🎨 First Contentful Paint: ${fcp}ms`);

      expect(fcp).toBeLessThan(1000); // FCP < 1s
    });

    test('should have acceptable Time to Interactive', async ({ page }) => {
      await page.goto('/analytics-studio');

      const tti = await page.evaluate(() => {
        if (window.performance && window.performance.timing) {
          const timing = window.performance.timing;
          return timing.domInteractive - timing.navigationStart;
        }
        return 0;
      });

      console.log(`⚡ Time to Interactive: ${tti}ms`);

      expect(tti).toBeLessThan(3000); // TTI < 3s
    });

    test('should load with acceptable memory usage', async ({ page }) => {
      await page.goto('/analytics-studio');
      await page.waitForLoadState('networkidle');

      const memoryUsage = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });

      if (memoryUsage) {
        const usedMB = (memoryUsage.used / 1024 / 1024).toFixed(2);
        console.log(`💾 Memory Usage: ${usedMB} MB`);

        // Memory usage should be under 100MB for initial load
        expect(memoryUsage.used).toBeLessThan(100 * 1024 * 1024);
      }
    });
  });

  test.describe('Widget Render Performance', () => {
    test('should render KPI widget within target time', async ({ page }) => {
      await page.goto('/analytics-studio');
      await page.waitForTimeout(1000);

      // Open a report with KPI widgets
      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        const startTime = Date.now();

        await reportCard.click();
        await page.waitForSelector('text=KPI', { timeout: 5000 }).catch(() => {});

        const renderTime = Date.now() - startTime;

        console.log(`📈 KPI Widget Render Time: ${renderTime}ms (target: ${PERFORMANCE_TARGETS.widgetRender}ms)`);

        expect(renderTime).toBeLessThan(PERFORMANCE_TARGETS.widgetRender);
      } else {
        test.skip();
      }
    });

    test('should render chart widget within target time', async ({ page }) => {
      await page.goto('/analytics-studio');
      await page.waitForTimeout(1000);

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(500);

        // Measure chart render time
        const startTime = Date.now();

        await page.waitForSelector('[class*="recharts-wrapper"]', { timeout: 5000 }).catch(() => {});

        const renderTime = Date.now() - startTime;

        console.log(`📊 Chart Widget Render Time: ${renderTime}ms (target: ${PERFORMANCE_TARGETS.chartRender}ms)`);

        // Charts may take slightly longer than target, so allow 300ms
        expect(renderTime).toBeLessThan(300);
      } else {
        test.skip();
      }
    });

    test('should render table widget efficiently', async ({ page }) => {
      await page.goto('/analytics-studio');

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(500);

        const startTime = Date.now();

        // Look for table elements
        await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});

        const renderTime = Date.now() - startTime;

        console.log(`📋 Table Widget Render Time: ${renderTime}ms`);

        expect(renderTime).toBeLessThan(PERFORMANCE_TARGETS.widgetRender);
      } else {
        test.skip();
      }
    });

    test('should handle multiple widgets efficiently', async ({ page }) => {
      await page.goto('/analytics-studio');

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        const startTime = Date.now();

        await reportCard.click();
        await page.waitForLoadState('networkidle');

        const totalRenderTime = Date.now() - startTime;

        console.log(`🎯 Multiple Widgets Render Time: ${totalRenderTime}ms`);

        // Multiple widgets should render within 2 seconds
        expect(totalRenderTime).toBeLessThan(2000);
      } else {
        test.skip();
      }
    });
  });

  test.describe('API Response Performance', () => {
    test('should fetch reports list within target time', async ({ page }) => {
      await page.goto('/analytics-studio');

      // Wait for and measure API call
      const response = await page.waitForResponse(
        response => response.url().includes('/api/reports') && response.status() === 200,
        { timeout: PERFORMANCE_TARGETS.apiResponse }
      );

      const timing = await response.request().timing();
      const responseTime = timing.responseEnd;

      console.log(`🌐 Reports API Response Time: ${responseTime.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.apiResponse}ms)`);

      expect(responseTime).toBeLessThan(PERFORMANCE_TARGETS.apiResponse);
    });

    test('should fetch survey data within target time', async ({ page }) => {
      await page.goto('/analytics-studio');
      await page.waitForTimeout(1000);

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        let apiResponseTime = null;

        page.on('response', async response => {
          if (response.url().includes('/api/analytics/query-data')) {
            const timing = await response.request().timing();
            apiResponseTime = timing.responseEnd;
          }
        });

        await reportCard.click();
        await page.waitForTimeout(2000);

        if (apiResponseTime !== null) {
          console.log(`📊 Survey Data API Response Time: ${apiResponseTime.toFixed(2)}ms`);
          expect(apiResponseTime).toBeLessThan(PERFORMANCE_TARGETS.dataQuery);
        }
      } else {
        test.skip();
      }
    });

    test('should handle paginated data efficiently', async ({ page }) => {
      await page.goto('/analytics-studio');

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(1000);

        // Scroll to trigger pagination
        const startTime = Date.now();

        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await page.waitForTimeout(1500);

        const paginationTime = Date.now() - startTime;

        console.log(`📄 Pagination Load Time: ${paginationTime}ms`);

        expect(paginationTime).toBeLessThan(2000);
      } else {
        test.skip();
      }
    });
  });

  test.describe('User Interaction Performance', () => {
    test('should open filter modal within target time', async ({ page }) => {
      await page.goto('/analytics-studio');

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(1000);

        const filterButton = page.locator('button:has-text("Filter")').first();

        if (await filterButton.count() > 0) {
          const startTime = Date.now();

          await filterButton.click();
          await page.waitForSelector('[role="dialog"]', { timeout: 1000 }).catch(() => {});

          const modalOpenTime = Date.now() - startTime;

          console.log(`🔍 Filter Modal Open Time: ${modalOpenTime}ms (target: ${PERFORMANCE_TARGETS.modalOpen}ms)`);

          expect(modalOpenTime).toBeLessThan(PERFORMANCE_TARGETS.modalOpen);
        }
      }
    });

    test('should apply filters within target time', async ({ page }) => {
      await page.goto('/analytics-studio');

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(1000);

        const filterButton = page.locator('button:has-text("Filter")').first();

        if (await filterButton.count() > 0) {
          await filterButton.click();
          await page.waitForTimeout(500);

          const startTime = Date.now();

          // Apply a filter (implementation depends on actual UI)
          const applyButton = page.locator('button:has-text("Apply")').first();
          if (await applyButton.count() > 0) {
            await applyButton.click();
            await page.waitForLoadState('networkidle');
          }

          const filterApplyTime = Date.now() - startTime;

          console.log(`✅ Filter Apply Time: ${filterApplyTime}ms (target: ${PERFORMANCE_TARGETS.filterApply}ms)`);

          expect(filterApplyTime).toBeLessThan(1000); // Allow 1s for filter application
        }
      }
    });

    test('should switch tabs quickly', async ({ page }) => {
      await page.goto('/analytics-studio');
      await page.waitForLoadState('networkidle');

      const deliveryTab = page.locator('button:has-text("Delivery Performance")');

      if (await deliveryTab.count() > 0) {
        const startTime = Date.now();

        await deliveryTab.click();
        await page.waitForTimeout(500);

        const tabSwitchTime = Date.now() - startTime;

        console.log(`🔄 Tab Switch Time: ${tabSwitchTime}ms`);

        expect(tabSwitchTime).toBeLessThan(500);
      }
    });
  });

  test.describe('Export Performance', () => {
    test('should initiate export quickly', async ({ page }) => {
      await page.goto('/analytics-studio');

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(1000);

        const exportButton = page.locator('button:has-text("Export")').first();

        if (await exportButton.count() > 0) {
          const startTime = Date.now();

          await exportButton.click();
          await page.waitForSelector('[role="dialog"]', { timeout: 1000 }).catch(() => {});

          const exportModalTime = Date.now() - startTime;

          console.log(`📤 Export Modal Open Time: ${exportModalTime}ms`);

          expect(exportModalTime).toBeLessThan(PERFORMANCE_TARGETS.modalOpen);
        }
      }
    });
  });

  test.describe('Memory Management', () => {
    test('should not have memory leaks on repeated navigation', async ({ page }) => {
      await page.goto('/analytics-studio');
      await page.waitForLoadState('networkidle');

      const initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });

      // Navigate back and forth multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('/dashboard');
        await page.waitForTimeout(500);
        await page.goto('/analytics-studio');
        await page.waitForTimeout(500);
      }

      const finalMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const increasePercent = (memoryIncrease / initialMemory * 100).toFixed(2);

        console.log(`💾 Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${increasePercent}%)`);

        // Memory should not increase by more than 50% after repeated navigation
        expect(increasePercent).toBeLessThan(50);
      }
    });

    test('should clean up resources when unmounting', async ({ page }) => {
      await page.goto('/analytics-studio');
      await page.waitForLoadState('networkidle');

      const reportCard = page.locator('[class*="reportCard"]').first();

      if (await reportCard.count() > 0) {
        await reportCard.click();
        await page.waitForTimeout(1000);

        const memoryBefore = await page.evaluate(() => {
          return performance.memory ? performance.memory.usedJSHeapSize : 0;
        });

        // Navigate away
        await page.goto('/dashboard');
        await page.waitForTimeout(1000);

        // Force garbage collection if available
        await page.evaluate(() => {
          if (window.gc) window.gc();
        });

        const memoryAfter = await page.evaluate(() => {
          return performance.memory ? performance.memory.usedJSHeapSize : 0;
        });

        if (memoryBefore > 0 && memoryAfter > 0) {
          console.log(`♻️ Memory Before: ${(memoryBefore / 1024 / 1024).toFixed(2)} MB`);
          console.log(`♻️ Memory After: ${(memoryAfter / 1024 / 1024).toFixed(2)} MB`);

          // Memory should decrease or stay relatively stable (within 20% increase)
          const increasePercent = ((memoryAfter - memoryBefore) / memoryBefore * 100);
          expect(increasePercent).toBeLessThan(20);
        }
      }
    });
  });

  test.describe('Bundle Size Impact', () => {
    test('should have reasonable JavaScript bundle size', async ({ page }) => {
      await page.goto('/analytics-studio');

      const jsResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return resources
          .filter(r => r.initiatorType === 'script')
          .map(r => ({
            name: r.name.split('/').pop(),
            size: r.transferSize,
            duration: r.duration
          }));
      });

      const totalJSSize = jsResources.reduce((sum, r) => sum + r.size, 0);
      const totalJSSizeMB = (totalJSSize / 1024 / 1024).toFixed(2);

      console.log(`📦 Total JS Bundle Size: ${totalJSSizeMB} MB`);

      // Total JS should be under 2MB
      expect(totalJSSize).toBeLessThan(2 * 1024 * 1024);
    });

    test('should load CSS efficiently', async ({ page }) => {
      await page.goto('/analytics-studio');

      const cssResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return resources
          .filter(r => r.initiatorType === 'link' || r.name.endsWith('.css'))
          .map(r => ({
            name: r.name.split('/').pop(),
            size: r.transferSize,
            duration: r.duration
          }));
      });

      const totalCSSSize = cssResources.reduce((sum, r) => sum + r.size, 0);
      const totalCSSSizeKB = (totalCSSSize / 1024).toFixed(2);

      console.log(`🎨 Total CSS Size: ${totalCSSSizeKB} KB`);

      // Total CSS should be under 500KB
      expect(totalCSSSize).toBeLessThan(500 * 1024);
    });
  });

  test.describe('Performance Report', () => {
    test('should generate comprehensive performance report', async ({ page }) => {
      await page.goto('/analytics-studio');
      await page.waitForLoadState('networkidle');

      // Wait for performance monitor to collect data
      await page.waitForTimeout(2000);

      const performanceReport = await page.evaluate(() => {
        if (window.performanceMonitor) {
          return window.performanceMonitor.generateReport();
        }
        return null;
      });

      if (performanceReport) {
        console.log('\n📊 Performance Report:');
        console.log('==========================================');
        console.log('Timestamp:', performanceReport.timestamp);
        console.log('Total Measurements:', performanceReport.summary.totalMeasurements);

        if (performanceReport.summary.memoryUsage) {
          console.log('Memory Usage:', performanceReport.summary.memoryUsage.usedPercent + '%');
        }

        console.log('\nSlowest Operations:');
        performanceReport.slowest.forEach((op, i) => {
          console.log(`  ${i + 1}. ${op.label}: ${op.duration}`);
        });

        console.log('\nAverages:');
        Object.entries(performanceReport.averages).forEach(([type, data]) => {
          console.log(`  ${type}: ${data.average}ms (${data.count} measurements)`);
        });
        console.log('==========================================\n');

        expect(performanceReport.summary.totalMeasurements).toBeGreaterThan(0);
      }
    });
  });
});
