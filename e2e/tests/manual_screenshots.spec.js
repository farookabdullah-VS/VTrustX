const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuration for pages to capture
const PAGES_TO_CAPTURE = require('../../manual-config.json');

const OUTPUT_DIR = path.join(__dirname, '../../manual-assets');

test.describe('Manual Screenshot Generator', () => {

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    test.use({
        viewport: { width: 1440, height: 900 },
        storageState: 'admin-auth.json', // We will generate this
    });

    // Login once to generate state
    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        // Use relative URL assuming baseURL is set in config
        await page.goto('/login');

        // Check if already logged in or needs login
        if (await page.isVisible('input[name="username"]')) {
            await page.fill('input[name="username"]', 'admin');
            await page.fill('input[name="password"]', 'Admin@123');
            await page.click('button[type="submit"]');
            await page.waitForURL('**/dashboard', { timeout: 15000 });
        }

        await page.context().storageState({ path: 'admin-auth.json' });
        await page.close();
    });

    for (const pageConfig of PAGES_TO_CAPTURE) {
        test(`Capture ${pageConfig.title}`, async ({ page }) => {
            console.log(`Navigating to ${pageConfig.path}...`);
            await page.goto(pageConfig.path);

            if (pageConfig.path !== '/login') {
                // Wait for specific element to ensure hydration
                if (pageConfig.waitFor) {
                    try {
                        console.log(`Waiting for selector: ${pageConfig.waitFor}`);
                        await page.waitForSelector(pageConfig.waitFor, { timeout: 10000 });
                    } catch (e) {
                        console.log(`Warning: Selector ${pageConfig.waitFor} not found on ${pageConfig.path}, proceeding with screenshot anyway.`);
                    }
                }

                // Wait a bit for animations/rendering
                await page.waitForTimeout(3000);
            }

            const screenshotPath = path.join(OUTPUT_DIR, pageConfig.filename);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`Saved screenshot: ${pageConfig.filename}`);
        });
    }
});
