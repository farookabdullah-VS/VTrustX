/**
 * Convert SVG files to PNG
 * Uses sharp library for high-quality conversion
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
  console.log('✓ Using sharp library for conversion\n');
} catch (error) {
  console.log('Installing sharp library...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install sharp', { stdio: 'inherit' });
    sharp = require('sharp');
    console.log('\n✓ Sharp installed successfully\n');
  } catch (installError) {
    console.error('❌ Failed to install sharp. Using alternative method...\n');
  }
}

async function convertWithSharp(inputSvg, outputPng, width, height) {
  try {
    await sharp(inputSvg)
      .resize(width, height)
      .png()
      .toFile(outputPng);

    const stats = fs.statSync(outputPng);
    console.log(`✓ ${path.basename(outputPng)}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log(`  Dimensions: ${width}x${height}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to convert ${path.basename(inputSvg)}`);
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

async function convertSvgToPng() {
  console.log('🎨 SVG to PNG Converter\n');
  console.log('========================\n');

  const conversions = [
    {
      input: 'app-icon.svg',
      output: 'app-icon.png',
      width: 512,
      height: 512,
      description: 'App Icon'
    },
    {
      input: 'feature-graphic.svg',
      output: 'feature-graphic.png',
      width: 1024,
      height: 500,
      description: 'Feature Graphic'
    }
  ];

  let successCount = 0;

  for (const conversion of conversions) {
    const inputPath = path.join(__dirname, conversion.input);
    const outputPath = path.join(__dirname, conversion.output);

    console.log(`Converting ${conversion.description}...`);

    if (!fs.existsSync(inputPath)) {
      console.error(`❌ Input file not found: ${conversion.input}\n`);
      continue;
    }

    if (sharp) {
      const success = await convertWithSharp(
        inputPath,
        outputPath,
        conversion.width,
        conversion.height
      );
      if (success) successCount++;
    } else {
      console.error('❌ Sharp library not available. Cannot convert.\n');
      console.log('Alternative options:');
      console.log('1. Install ImageMagick: https://imagemagick.org/');
      console.log('2. Use online converter: https://cloudconvert.com/svg-to-png');
      console.log('3. Install sharp manually: npm install sharp\n');
    }
  }

  console.log('========================\n');
  if (successCount === conversions.length) {
    console.log(`✅ All ${successCount} files converted successfully!\n`);
    console.log('Files created:');
    console.log('  ✓ app-icon.png (512x512)');
    console.log('  ✓ feature-graphic.png (1024x500)\n');
    console.log('📁 Location: client/store-assets/\n');
    console.log('Next steps:');
    console.log('  1. Review the PNG files');
    console.log('  2. Capture screenshots (see screenshot-guide.md)');
    console.log('  3. Upload to Google Play Console\n');
  } else {
    console.log(`⚠️  Converted ${successCount} of ${conversions.length} files\n`);
  }
}

// Run conversion
convertSvgToPng().catch(error => {
  console.error('❌ Conversion failed:', error.message);
  process.exit(1);
});
