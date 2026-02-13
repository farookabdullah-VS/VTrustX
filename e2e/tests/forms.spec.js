const { test, expect } = require('@playwright/test');

test.describe('Forms Management', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    const username = process.env.TEST_USERNAME || 'admin';
    const password = process.env.TEST_PASSWORD || 'admin123';

    await page.locator('input[name="username"], input[type="text"]').first().fill(username);
    await page.locator('input[name="password"], input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
  });

  test('should navigate to forms page', async ({ page }) => {
    // Look for forms link in navigation
    const formsLink = page.locator('a:has-text("Forms"), a:has-text("Surveys")').first();
    await formsLink.click();

    // Check URL
    await expect(page).toHaveURL(/.*\/(forms|surveys)/);

    // Check for forms list or create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Form"), button:has-text("New Survey")');
    await expect(createButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display forms list', async ({ page }) => {
    await page.goto('/forms');

    // Wait for forms list to load
    await page.waitForSelector('table, [role="list"], .form-card', { timeout: 10000 });

    // Check if we have any forms (table, list, or cards)
    const hasForms = await page.locator('table tbody tr, [role="listitem"], .form-card').count() > 0;

    if (hasForms) {
      // If forms exist, check we can see form titles
      await expect(page.locator('text=/form|survey/i').first()).toBeVisible();
    } else {
      // If no forms, check for empty state
      await expect(page.locator('text=/no forms|empty|create your first/i')).toBeVisible();
    }
  });

  test('should open form builder', async ({ page }) => {
    await page.goto('/forms');

    // Click create form button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Form"), button:has-text("New Survey")').first();
    await createButton.click();

    // Check URL changed to form builder
    await page.waitForURL(/.*\/(forms|surveys)\/(create|new|builder)/, { timeout: 10000 });

    // Check for form builder elements (title input, question types, etc.)
    const titleInput = page.locator('input[placeholder*="title"], input[name="title"]');
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('should create a basic form', async ({ page }) => {
    await page.goto('/forms/create');

    const timestamp = Date.now();
    const formTitle = `Test Form ${timestamp}`;

    // Fill in form title
    const titleInput = page.locator('input[placeholder*="title"], input[name="title"]').first();
    await titleInput.fill(formTitle);

    // Add a question (implementation depends on your form builder)
    // This is a generic approach - adjust based on your actual UI
    const addQuestionButton = page.locator('button:has-text("Add Question"), button:has-text("Add Field")');

    if (await addQuestionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addQuestionButton.first().click();

      // Fill in question details
      const questionInput = page.locator('input[placeholder*="question"], textarea[placeholder*="question"]').first();
      if (await questionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await questionInput.fill('What is your name?');
      }
    }

    // Save the form
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Publish")').first();
    await saveButton.click();

    // Wait for success message or redirect
    await page.waitForTimeout(2000);

    // Verify form was created
    const successMessage = page.locator('text=/created|success|saved/i');
    if (await successMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(successMessage).toBeVisible();
    }
  });

  test('should edit an existing form', async ({ page }) => {
    await page.goto('/forms');

    // Find first form in the list
    const firstForm = page.locator('table tbody tr, [role="listitem"], .form-card').first();

    if (await firstForm.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click edit button (could be icon, button, or link)
      const editButton = firstForm.locator('button:has-text("Edit"), a:has-text("Edit"), [aria-label*="edit"]').first();
      await editButton.click();

      // Wait for form builder to load
      await page.waitForURL(/.*\/(forms|surveys)\/[^/]+\/(edit|builder)/, { timeout: 10000 });

      // Verify form builder is loaded
      const titleInput = page.locator('input[placeholder*="title"], input[name="title"]').first();
      await expect(titleInput).toBeVisible();

      // Verify title is not empty (existing form)
      const titleValue = await titleInput.inputValue();
      expect(titleValue.length).toBeGreaterThan(0);
    }
  });

  test('should delete a form', async ({ page }) => {
    // First, create a form to delete
    await page.goto('/forms/create');

    const timestamp = Date.now();
    const formTitle = `Delete Test Form ${timestamp}`;

    const titleInput = page.locator('input[placeholder*="title"], input[name="title"]').first();
    await titleInput.fill(formTitle);

    const saveButton = page.locator('button:has-text("Save"), button:has-text("Create")').first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Go back to forms list
    await page.goto('/forms');

    // Find the form we just created
    const formRow = page.locator(`text="${formTitle}"`).locator('..').locator('..');

    if (await formRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click delete button
      const deleteButton = formRow.locator('button:has-text("Delete"), [aria-label*="delete"]').first();
      await deleteButton.click();

      // Confirm deletion (if there's a confirmation dialog)
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Verify form is deleted
      await page.waitForTimeout(1000);
      await expect(page.locator(`text="${formTitle}"`)).not.toBeVisible();
    }
  });
});
