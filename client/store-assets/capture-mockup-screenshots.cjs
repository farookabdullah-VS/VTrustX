/**
 * Automated Screenshot Capture for Play Store Mockups
 * Uses Puppeteer to capture high-quality screenshots
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Check if puppeteer is installed
async function installPuppeteer() {
  console.log('Checking for Puppeteer...\n');

  try {
    require('puppeteer');
    console.log('✓ Puppeteer is already installed\n');
    return true;
  } catch (error) {
    console.log('Installing Puppeteer (this may take a minute)...');
    try {
      await execAsync('npm install --no-save puppeteer', {
        cwd: __dirname,
        stdio: 'inherit'
      });
      console.log('\n✓ Puppeteer installed successfully\n');
      return true;
    } catch (installError) {
      console.error('❌ Failed to install Puppeteer');
      console.error('   Error:', installError.message);
      return false;
    }
  }
}

async function captureScreenshots() {
  console.log('📸 Play Store Screenshot Capture\n');
  console.log('=================================\n');

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
    console.log('✓ Created screenshots directory\n');
  }

  // Install Puppeteer if needed
  if (!await installPuppeteer()) {
    console.log('\n⚠️  Cannot capture screenshots without Puppeteer\n');
    console.log('Alternative options:');
    console.log('1. Install Puppeteer manually: npm install puppeteer');
    console.log('2. Use manual capture (see screenshot-guide.md)');
    console.log('3. Use online screenshot tools\n');
    return;
  }

  // Import puppeteer after installation
  const puppeteer = require('puppeteer');

  // Mockup files to capture
  const mockups = [
    {
      file: '01-dashboard.html',
      output: 'screenshot-01-dashboard.png',
      description: 'Dashboard Overview'
    },
    {
      file: '02-analytics.html',
      output: 'screenshot-02-analytics.png',
      description: 'AI-Powered Analytics'
    },
    {
      file: '03-distribution.html',
      output: 'screenshot-03-distribution.png',
      description: 'Multi-Channel Distribution'
    }
  ];

  console.log('Launching browser...\n');

  try {
    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to Play Store phone dimensions
    await page.setViewport({
      width: 1080,
      height: 1920,
      deviceScaleFactor: 2 // High DPI for better quality
    });

    console.log('Capturing screenshots...\n');

    let successCount = 0;

    for (const mockup of mockups) {
      const mockupPath = path.join(__dirname, 'mockups', mockup.file);
      const outputPath = path.join(screenshotsDir, mockup.output);

      console.log(`📱 ${mockup.description}...`);

      if (!fs.existsSync(mockupPath)) {
        console.log(`   ❌ Mockup file not found: ${mockup.file}\n`);
        continue;
      }

      try {
        // Load the HTML file
        await page.goto(`file://${mockupPath}`, {
          waitUntil: 'networkidle0'
        });

        // Wait a bit for any animations/rendering
        await new Promise(resolve => setTimeout(resolve, 500));

        // Take screenshot
        await page.screenshot({
          path: outputPath,
          type: 'png',
          fullPage: false
        });

        const stats = fs.statSync(outputPath);
        console.log(`   ✓ Saved: ${mockup.output}`);
        console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
        console.log(`   Resolution: 1080x1920 @ 2x DPI\n`);

        successCount++;
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
      }
    }

    await browser.close();

    console.log('=================================\n');

    if (successCount === mockups.length) {
      console.log(`✅ All ${successCount} screenshots captured successfully!\n`);
      console.log('📁 Location: client/store-assets/screenshots/\n');
      console.log('Files created:');
      mockups.forEach(m => console.log(`   ✓ ${m.output}`));
      console.log('\nScreenshots are ready for Google Play Console!\n');
      console.log('Next steps:');
      console.log('1. Review screenshots in screenshots/ folder');
      console.log('2. Optional: Add device frames using mockuphone.com');
      console.log('3. Upload to Play Console (need 2-8 screenshots)');
      console.log('4. Create 2-5 more screenshots from real app (optional)\n');
    } else {
      console.log(`⚠️  Captured ${successCount} of ${mockups.length} screenshots\n`);
    }

  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Make sure mockup HTML files exist in mockups/ folder');
    console.error('- Try running: npm install puppeteer');
    console.error('- Check screenshot-guide.md for manual capture instructions\n');
  }
}

// Run the script
if (require.main === module) {
  captureScreenshots().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { captureScreenshots };
