/**
 * E2E Test Utilities
 * Helper functions for common test operations
 */

/**
 * Login helper
 * @param {import('@playwright/test').Page} page
 * @param {string} username
 * @param {string} password
 */
async function login(page, username, password) {
  await page.goto('/login');
  await page.locator('input[name="username"], input[type="text"]').first().fill(username);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
}

/**
 * Logout helper
 * @param {import('@playwright/test').Page} page
 */
async function logout(page) {
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout")').first();
  await logoutButton.click();
  await page.waitForURL(/.*\/login/, { timeout: 10000 });
}

/**
 * Create a test user (for setup/teardown)
 * @param {import('@playwright/test').Page} page
 * @param {Object} userData
 */
async function createTestUser(page, userData) {
  await page.goto('/register');

  await page.locator('input[name="username"]').fill(userData.username);
  await page.locator('input[name="email"]').fill(userData.email);
  await page.locator('input[name="password"]').fill(userData.password);

  const confirmPassword = page.locator('input[name="confirmPassword"]');
  if (await confirmPassword.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmPassword.fill(userData.password);
  }

  const tenantNameInput = page.locator('input[name="tenantName"]');
  if (await tenantNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await tenantNameInput.fill(userData.tenantName || 'Test Tenant');
  }

  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/.*\/(dashboard|login)/, { timeout: 10000 });
}

/**
 * Wait for element to be visible
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {number} timeout
 */
async function waitForElement(page, selector, timeout = 5000) {
  return await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Generate unique test data
 * @param {string} prefix
 * @returns {Object}
 */
function generateTestData(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return {
    timestamp,
    random,
    username: `${prefix}_user_${timestamp}`,
    email: `${prefix}_${timestamp}@example.com`,
    password: `Test${random}123!`,
    tenantName: `${prefix} Tenant ${timestamp}`,
    formTitle: `${prefix} Form ${timestamp}`,
  };
}

/**
 * Take screenshot with name
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function takeScreenshot(page, name) {
  await page.screenshot({ path: `screenshots/${name}-${Date.now()}.png`, fullPage: true });
}

/**
 * Clear browser storage (cookies, localStorage, sessionStorage)
 * @param {import('@playwright/test').Page} page
 */
async function clearStorage(page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Wait for API response
 * @param {import('@playwright/test').Page} page
 * @param {string} urlPattern
 * @param {Function} triggerAction
 */
async function waitForApiResponse(page, urlPattern, triggerAction) {
  const responsePromise = page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() === 200,
    { timeout: 10000 }
  );

  await triggerAction();
  return await responsePromise;
}

/**
 * Check if element exists
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
async function elementExists(page, selector) {
  return await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false);
}

module.exports = {
  login,
  logout,
  createTestUser,
  waitForElement,
  generateTestData,
  takeScreenshot,
  clearStorage,
  waitForApiResponse,
  elementExists,
};
