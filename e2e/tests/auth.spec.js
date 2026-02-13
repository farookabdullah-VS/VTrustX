const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Check if we're on the login page or redirected to it
    await expect(page).toHaveURL(/.*\/(login)?/);

    // Check for login form elements
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.locator('input[name="username"], input[type="text"]').first().fill('invalid@example.com');
    await page.locator('input[name="password"], input[type="password"]').first().fill('wrongpassword');

    // Click login button
    await page.locator('button[type="submit"]').click();

    // Check for error message
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible({ timeout: 10000 });
  });

  test('should successfully register a new user', async ({ page }) => {
    await page.goto('/register');

    // Generate unique test user
    const timestamp = Date.now();
    const testUser = {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'TestPassword123!',
      tenantName: `Test Tenant ${timestamp}`,
    };

    // Fill in registration form
    await page.locator('input[name="username"]').fill(testUser.username);
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);

    // Some forms might have confirm password
    const confirmPassword = page.locator('input[name="confirmPassword"]');
    if (await confirmPassword.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmPassword.fill(testUser.password);
    }

    // Tenant name (if required)
    const tenantNameInput = page.locator('input[name="tenantName"]');
    if (await tenantNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tenantNameInput.fill(testUser.tenantName);
    }

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Check for successful registration (redirect to dashboard or login)
    await page.waitForURL(/.*\/(dashboard|login)/, { timeout: 10000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Note: This test assumes a test user exists in the database
    // You may need to seed the database or use the user created in previous test

    await page.goto('/login');

    // Use environment variables or default test credentials
    const username = process.env.TEST_USERNAME || 'admin';
    const password = process.env.TEST_PASSWORD || 'admin123';

    await page.locator('input[name="username"], input[type="text"]').first().fill(username);
    await page.locator('input[name="password"], input[type="password"]').first().fill(password);

    await page.locator('button[type="submit"]').click();

    // Check for successful login (redirect to dashboard)
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });

    // Verify we can see dashboard elements
    await expect(page.locator('text=/dashboard/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');

    const username = process.env.TEST_USERNAME || 'admin';
    const password = process.env.TEST_PASSWORD || 'admin123';

    await page.locator('input[name="username"], input[type="text"]').first().fill(username);
    await page.locator('input[name="password"], input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });

    // Find and click logout button (could be in menu, navbar, etc.)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout")').first();
    await logoutButton.click();

    // Verify redirect to login page
    await page.waitForURL(/.*\/login/, { timeout: 10000 });
  });

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    // Clear cookies to ensure we're logged out
    await page.context().clearCookies();

    // Try to access dashboard directly
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/.*\/login/, { timeout: 10000 });
  });
});
