/**
 * Test script for Figma Theme Import
 *
 * Tests the Figma theme import functionality with a sample file.
 * Requires a valid Figma access token.
 */

const FigmaThemeImporter = require('./src/services/FigmaThemeImporter');

async function testFigmaImport() {
    console.log('🧪 Testing Figma Theme Importer\n');
    console.log('='.repeat(60) + '\n');

    // ========== CONFIGURATION ==========
    // TODO: Update these with your actual values
    const FIGMA_ACCESS_TOKEN = process.env.FIGMA_TOKEN || 'YOUR_TOKEN_HERE';
    const FIGMA_FILE_URL = process.env.FIGMA_FILE_URL || 'https://www.figma.com/file/ABC123/YourFile';

    // ===================================

    try {
        // Step 1: Validate token
        console.log('1️⃣  Validating Figma access token...');
        const validation = await FigmaThemeImporter.validateToken(FIGMA_ACCESS_TOKEN);

        if (!validation.valid) {
            console.log('   ❌ Token validation failed');
            console.log('   Error:', validation.error);
            console.log('\n💡 How to fix:');
            console.log('   1. Go to https://www.figma.com/settings');
            console.log('   2. Create a Personal Access Token');
            console.log('   3. Set FIGMA_TOKEN environment variable or update this file\n');
            process.exit(1);
        }

        console.log('   ✅ Token is valid');
        console.log(`   User: ${validation.user.handle} (${validation.user.email})\n`);

        // Step 2: Extract file key
        console.log('2️⃣  Extracting file key from URL...');
        const fileKey = FigmaThemeImporter.extractFileKeyFromUrl(FIGMA_FILE_URL);

        if (!fileKey) {
            console.log('   ❌ Invalid Figma URL format');
            console.log('   Expected: https://www.figma.com/file/{fileKey}/{fileName}\n');
            process.exit(1);
        }

        console.log(`   ✅ File key: ${fileKey}\n`);

        // Step 3: Import theme
        console.log('3️⃣  Importing theme from Figma...');
        const importer = new FigmaThemeImporter(FIGMA_ACCESS_TOKEN);
        const result = await importer.importTheme(fileKey);

        if (!result.success) {
            console.log('   ❌ Import failed');
            console.log('   Error:', result.error);
            process.exit(1);
        }

        console.log('   ✅ Import successful!\n');

        // Step 4: Display metadata
        console.log('4️⃣  Import Metadata:');
        console.log(`   File Name: ${result.metadata.fileName}`);
        console.log(`   Last Modified: ${new Date(result.metadata.lastModified).toLocaleString()}`);
        console.log(`   Version: ${result.metadata.version}`);
        console.log(`   Imported At: ${new Date(result.metadata.importedAt).toLocaleString()}\n`);

        // Step 5: Display imported theme
        console.log('5️⃣  Imported Theme:\n');

        // Colors
        console.log('   🎨 Colors:');
        const colorKeys = Object.keys(result.theme).filter(key => key.toLowerCase().includes('color'));
        colorKeys.forEach(key => {
            const value = result.theme[key];
            console.log(`      ${key.padEnd(20)} : ${value}`);
        });
        console.log();

        // Typography
        console.log('   🔤 Typography:');
        const typographyKeys = ['headingFont', 'bodyFont', 'fontSize', 'headingWeight', 'bodyWeight', 'lineHeight', 'letterSpacing'];
        typographyKeys.forEach(key => {
            if (result.theme[key]) {
                console.log(`      ${key.padEnd(20)} : ${result.theme[key]}`);
            }
        });
        console.log();

        // Other properties
        console.log('   📐 Other Properties:');
        const otherKeys = Object.keys(result.theme).filter(
            key => !key.toLowerCase().includes('color') &&
                   !typographyKeys.includes(key)
        );
        otherKeys.forEach(key => {
            console.log(`      ${key.padEnd(20)} : ${result.theme[key]}`);
        });
        console.log();

        // Step 6: Summary
        console.log('='.repeat(60));
        console.log('✅ Figma theme import test completed successfully!\n');
        console.log('📋 Summary:');
        console.log(`   Total properties imported: ${Object.keys(result.theme).length}`);
        console.log(`   Colors: ${colorKeys.length}`);
        console.log(`   Typography: ${typographyKeys.filter(k => result.theme[k]).length}`);
        console.log(`   Other: ${otherKeys.length}\n`);

        console.log('🚀 Integration is ready to use!');
        console.log('   Access via: Theme Settings → Import from Figma button\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run test
console.log('\n📝 Configuration:');
console.log('   Set environment variables for testing:');
console.log('   - FIGMA_TOKEN=your_token_here');
console.log('   - FIGMA_FILE_URL=https://www.figma.com/file/ABC123/YourFile\n');
console.log('   Or edit this file directly (lines 12-13)\n');

if (process.argv.includes('--help')) {
    console.log('Usage:');
    console.log('   node test_figma_import.js');
    console.log('   FIGMA_TOKEN=xxx FIGMA_FILE_URL=xxx node test_figma_import.js\n');
    process.exit(0);
}

testFigmaImport();
