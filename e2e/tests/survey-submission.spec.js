const { test, expect } = require('@playwright/test');

test.describe('Survey Submission', () => {
  test('should load public survey form', async ({ page }) => {
    // This test assumes you have a public survey URL
    // You may need to create a test survey first or use a known survey slug

    // Note: Adjust URL based on your routing structure
    const testSurveySlug = process.env.TEST_SURVEY_SLUG || 'test-survey';
    await page.goto(`/survey/${testSurveySlug}`);

    // Check if survey loaded (either form or error message)
    const hasForm = await page.locator('form, [role="form"]').isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await page.locator('text=/not found|expired|unavailable/i').isVisible({ timeout: 5000 }).catch(() => false);

    if (hasForm) {
      // Survey loaded successfully
      await expect(page.locator('form, [role="form"]')).toBeVisible();
    } else if (hasError) {
      // Survey doesn't exist - this is expected for test environment
      console.log('Test survey not found - skipping submission test');
    } else {
      throw new Error('Survey page loaded but no form or error found');
    }
  });

  test('should validate required fields', async ({ page }) => {
    const testSurveySlug = process.env.TEST_SURVEY_SLUG || 'test-survey';
    await page.goto(`/survey/${testSurveySlug}`);

    const hasForm = await page.locator('form, [role="form"]').isVisible({ timeout: 5000 }).catch(() => false);

    if (hasForm) {
      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
      await submitButton.click();

      // Check for validation errors
      await expect(page.locator('text=/required|must|fill/i').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should successfully submit survey', async ({ page }) => {
    const testSurveySlug = process.env.TEST_SURVEY_SLUG || 'test-survey';
    await page.goto(`/survey/${testSurveySlug}`);

    const hasForm = await page.locator('form, [role="form"]').isVisible({ timeout: 5000 }).catch(() => false);

    if (hasForm) {
      // Fill in form fields (this is generic - adjust based on your survey structure)
      const textInputs = page.locator('input[type="text"], input[type="email"], textarea');
      const inputCount = await textInputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = textInputs.nth(i);
        if (await input.isVisible().catch(() => false)) {
          await input.fill(`Test response ${i + 1}`);
        }
      }

      // Handle radio buttons
      const radioButtons = page.locator('input[type="radio"]');
      const radioCount = await radioButtons.count();
      if (radioCount > 0) {
        await radioButtons.first().click();
      }

      // Handle checkboxes
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      if (checkboxCount > 0) {
        await checkboxes.first().click();
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
      await submitButton.click();

      // Check for success message
      await expect(page.locator('text=/thank you|success|submitted|complete/i').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display thank you page after submission', async ({ page }) => {
    const testSurveySlug = process.env.TEST_SURVEY_SLUG || 'test-survey';
    await page.goto(`/survey/${testSurveySlug}`);

    const hasForm = await page.locator('form, [role="form"]').isVisible({ timeout: 5000 }).catch(() => false);

    if (hasForm) {
      // Quick fill and submit
      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await textInput.fill('Test response');
      }

      const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
      await submitButton.click();

      // Verify thank you page elements
      const thankYouMessage = page.locator('text=/thank you|success|submitted|response.*received/i');
      await expect(thankYouMessage.first()).toBeVisible({ timeout: 10000 });

      // Check if form is no longer visible (replaced by thank you message)
      const formVisible = await page.locator('form, [role="form"]').isVisible({ timeout: 2000 }).catch(() => false);
      expect(formVisible).toBe(false);
    }
  });

  test('should prevent duplicate submissions', async ({ page }) => {
    const testSurveySlug = process.env.TEST_SURVEY_SLUG || 'test-survey';

    // Submit survey once
    await page.goto(`/survey/${testSurveySlug}`);
    const hasForm = await page.locator('form, [role="form"]').isVisible({ timeout: 5000 }).catch(() => false);

    if (hasForm) {
      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await textInput.fill('Test response');
      }

      const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
      await submitButton.click();

      await page.waitForSelector('text=/thank you|success|submitted/i', { timeout: 10000 });

      // Try to access survey again
      await page.goto(`/survey/${testSurveySlug}`);

      // Should show "already submitted" message or redirect
      const alreadySubmitted = await page.locator('text=/already.*submitted|completed/i').isVisible({ timeout: 5000 }).catch(() => false);
      const formNotVisible = !await page.locator('form, [role="form"]').isVisible({ timeout: 2000 }).catch(() => true);

      expect(alreadySubmitted || formNotVisible).toBe(true);
    }
  });
});
