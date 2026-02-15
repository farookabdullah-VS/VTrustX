/**
 * Automated Screenshot Capture Script
 *
 * This script automates taking screenshots of your Android app
 * using ADB commands and Android emulator.
 *
 * Prerequisites:
 * - Android SDK installed
 * - Emulator running
 * - App installed on emulator
 *
 * Usage:
 *   node capture-screenshots.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, 'screenshots'),
  packageName: 'com.vtrustx.app',
  screenshotDelay: 2000, // Wait 2s between screenshots
  screens: [
    { name: '01-dashboard', activity: '.MainActivity', description: 'Dashboard view' },
    { name: '02-surveys', description: 'Survey list' },
    { name: '03-create-survey', description: 'Survey builder' },
    { name: '04-distribution', description: 'Multi-channel distribution' },
    { name: '05-analytics', description: 'Analytics dashboard' },
    { name: '06-responses', description: 'Response tracking' },
    { name: '07-reports', description: 'Reports view' },
    { name: '08-settings', description: 'Settings/Profile' }
  ]
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkAdb() {
  try {
    await execAsync('adb version');
    console.log('✓ ADB is available');
    return true;
  } catch (error) {
    console.error('✗ ADB not found. Please install Android SDK.');
    return false;
  }
}

async function checkDevice() {
  try {
    const { stdout } = await execAsync('adb devices');
    const devices = stdout.split('\n').filter(line => line.includes('\tdevice'));

    if (devices.length === 0) {
      console.error('✗ No device/emulator connected');
      console.log('  Start emulator or connect device via USB');
      return false;
    }

    console.log(`✓ Found ${devices.length} device(s)`);
    return true;
  } catch (error) {
    console.error('✗ Failed to check devices:', error.message);
    return false;
  }
}

async function checkAppInstalled() {
  try {
    const { stdout } = await execAsync(`adb shell pm list packages | grep ${CONFIG.packageName}`);

    if (stdout.includes(CONFIG.packageName)) {
      console.log('✓ App is installed');
      return true;
    } else {
      console.error(`✗ App ${CONFIG.packageName} not installed`);
      console.log('  Install with: adb install path/to/app.apk');
      return false;
    }
  } catch (error) {
    console.error('✗ App not installed');
    return false;
  }
}

async function launchApp() {
  try {
    console.log('Launching app...');
    await execAsync(`adb shell monkey -p ${CONFIG.packageName} -c android.intent.category.LAUNCHER 1`);
    await sleep(3000); // Wait for app to start
    console.log('✓ App launched');
    return true;
  } catch (error) {
    console.error('✗ Failed to launch app:', error.message);
    return false;
  }
}

async function takeScreenshot(name) {
  try {
    const remotePath = `/sdcard/${name}.png`;
    const localPath = path.join(CONFIG.outputDir, `${name}.png`);

    // Take screenshot on device
    await execAsync(`adb shell screencap -p ${remotePath}`);

    // Pull to local
    await execAsync(`adb pull ${remotePath} "${localPath}"`);

    // Delete from device
    await execAsync(`adb shell rm ${remotePath}`);

    console.log(`✓ Screenshot saved: ${name}.png`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to capture ${name}:`, error.message);
    return false;
  }
}

async function resizeScreenshot(filename) {
  try {
    const inputPath = path.join(CONFIG.outputDir, filename);
    const outputPath = path.join(CONFIG.outputDir, filename.replace('.png', '_1080x1920.png'));

    // Try ImageMagick first
    try {
      await execAsync(`magick "${inputPath}" -resize 1080x1920 "${outputPath}"`);
      console.log(`✓ Resized: ${filename}`);
      return true;
    } catch (magickError) {
      console.log(`  ImageMagick not found, keeping original size`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Failed to resize ${filename}:`, error.message);
    return false;
  }
}

async function tapScreen(x, y) {
  try {
    await execAsync(`adb shell input tap ${x} ${y}`);
    await sleep(1000);
    return true;
  } catch (error) {
    console.error('Failed to tap:', error.message);
    return false;
  }
}

async function swipeScreen(x1, y1, x2, y2) {
  try {
    await execAsync(`adb shell input swipe ${x1} ${y1} ${x2} ${y2} 300`);
    await sleep(1000);
    return true;
  } catch (error) {
    console.error('Failed to swipe:', error.message);
    return false;
  }
}

// Main screenshot capture flow
async function captureScreenshots() {
  console.log('\n📸 Android Screenshot Capture Tool\n');
  console.log('=================================\n');

  // Pre-flight checks
  console.log('Running pre-flight checks...\n');

  if (!await checkAdb()) return;
  if (!await checkDevice()) return;
  if (!await checkAppInstalled()) return;

  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`✓ Created output directory: ${CONFIG.outputDir}\n`);
  }

  // Launch app
  if (!await launchApp()) return;

  console.log('\n📸 Starting screenshot capture...\n');
  console.log('⚠️  Manual navigation required for each screen');
  console.log('⚠️  Press ENTER after navigating to each screen\n');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  // Capture each screen
  for (const screen of CONFIG.screens) {
    console.log(`\n📋 Screen ${screen.name}: ${screen.description}`);
    await question('   Navigate to this screen, then press ENTER to capture... ');

    await sleep(CONFIG.screenshotDelay);
    await takeScreenshot(screen.name);
  }

  rl.close();

  console.log('\n✅ Screenshot capture complete!\n');
  console.log(`📁 Screenshots saved to: ${CONFIG.outputDir}\n`);

  // Optional: Resize screenshots
  console.log('🔄 Checking for ImageMagick to resize screenshots...\n');

  const files = fs.readdirSync(CONFIG.outputDir).filter(f => f.endsWith('.png') && !f.includes('_1080x1920'));

  for (const file of files) {
    await resizeScreenshot(file);
  }

  console.log('\n✨ All done! Your screenshots are ready for Play Store.\n');
  console.log('Next steps:');
  console.log('1. Review screenshots in:', CONFIG.outputDir);
  console.log('2. Optional: Add device frames using https://mockuphone.com');
  console.log('3. Upload to Google Play Console\n');
}

// Automated screenshot capture (experimental)
async function captureScreenshotsAutomated() {
  console.log('\n🤖 Automated Screenshot Capture (Experimental)\n');
  console.log('==============================================\n');

  // This requires knowing the exact UI coordinates
  // You'll need to customize these tap coordinates for your app

  const navigationSteps = [
    { name: '01-dashboard', action: 'initial' },
    { name: '02-surveys', action: () => tapScreen(100, 500) }, // Tap "Surveys" menu
    { name: '03-create-survey', action: () => tapScreen(900, 1800) }, // Tap FAB
    { name: '04-distribution', action: () => tapScreen(200, 300) }, // Back, then distribution
    // ... add more navigation steps
  ];

  console.log('⚠️  Automated capture requires custom navigation coordinates');
  console.log('⚠️  Use manual mode for now: node capture-screenshots.js\n');
}

// Run the script
if (require.main === module) {
  captureScreenshots().catch(error => {
    console.error('\n❌ Screenshot capture failed:', error.message);
    process.exit(1);
  });
}

module.exports = { captureScreenshots, takeScreenshot };
