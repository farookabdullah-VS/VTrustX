#!/usr/bin/env node

/**
 * Quick Install Script for Export Module
 * This script automates the installation and setup of the export module
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('   VTrustX Export Module - Quick Installation Script');
console.log('═══════════════════════════════════════════════════════════\n');

const steps = [
    {
        name: 'Installing NPM Dependencies',
        action: () => {
            console.log('📦 Installing required packages...\n');
            const packages = [
                'exceljs',
                'json2csv',
                'pptxgenjs',
                'docx',
                'chartjs-node-canvas',
                'chart.js',
                'archiver'
            ];

            try {
                execSync(`npm install ${packages.join(' ')}`, {
                    stdio: 'inherit',
                    cwd: path.join(__dirname, '..')
                });
                console.log('✅ Dependencies installed successfully\n');
                return true;
            } catch (error) {
                console.error('❌ Failed to install dependencies:', error.message);
                return false;
            }
        }
    },
    {
        name: 'Creating Exports Directory',
        action: () => {
            console.log('📁 Creating exports directory...\n');
            const exportsDir = path.join(__dirname, '..', 'exports');

            try {
                if (!fs.existsSync(exportsDir)) {
                    fs.mkdirSync(exportsDir, { recursive: true });
                    console.log('✅ Exports directory created\n');
                } else {
                    console.log('ℹ️  Exports directory already exists\n');
                }
                return true;
            } catch (error) {
                console.error('❌ Failed to create exports directory:', error.message);
                return false;
            }
        }
    },
    {
        name: 'Updating .gitignore',
        action: () => {
            console.log('📝 Updating .gitignore...\n');
            const gitignorePath = path.join(__dirname, '..', '..', '.gitignore');

            try {
                const exportPatterns = [
                    '\n# Export Module',
                    'exports/',
                    '*.xlsx',
                    '*.csv',
                    '*.pptx',
                    '*.docx',
                    '*.sav',
                    '*.sps'
                ].join('\n');

                if (fs.existsSync(gitignorePath)) {
                    const content = fs.readFileSync(gitignorePath, 'utf8');
                    if (!content.includes('# Export Module')) {
                        fs.appendFileSync(gitignorePath, exportPatterns + '\n');
                        console.log('✅ .gitignore updated\n');
                    } else {
                        console.log('ℹ️  .gitignore already configured\n');
                    }
                } else {
                    fs.writeFileSync(gitignorePath, exportPatterns + '\n');
                    console.log('✅ .gitignore created\n');
                }
                return true;
            } catch (error) {
                console.error('⚠️  Could not update .gitignore:', error.message);
                return true; // Non-critical, continue anyway
            }
        }
    },
    {
        name: 'Running Database Migration',
        action: () => {
            console.log('🗄️  Running database migration...\n');

            try {
                execSync('node scripts/create_export_jobs_table.js', {
                    stdio: 'inherit',
                    cwd: path.join(__dirname, '..')
                });
                console.log('✅ Database migration completed\n');
                return true;
            } catch (error) {
                console.error('❌ Database migration failed:', error.message);
                console.log('ℹ️  You may need to run this manually later\n');
                return false;
            }
        }
    },
    {
        name: 'Verifying Installation',
        action: () => {
            console.log('🔍 Verifying installation...\n');

            const checks = [
                { name: 'ExportService.js', path: path.join(__dirname, '..', 'src', 'services', 'export', 'ExportService.js') },
                { name: 'exports.js routes', path: path.join(__dirname, '..', 'src', 'api', 'routes', 'exports.js') },
                { name: 'ExportModal.jsx', path: path.join(__dirname, '..', '..', 'client', 'src', 'components', 'ExportModal.jsx') }
            ];

            let allPresent = true;

            checks.forEach(check => {
                if (fs.existsSync(check.path)) {
                    console.log(`  ✅ ${check.name}`);
                } else {
                    console.log(`  ❌ ${check.name} - NOT FOUND`);
                    allPresent = false;
                }
            });

            console.log('');
            return allPresent;
        }
    }
];

// Run all steps
let allSuccess = true;
steps.forEach((step, index) => {
    console.log(`\n[${index + 1}/${steps.length}] ${step.name}`);
    console.log('─'.repeat(60));

    const success = step.action();
    if (!success) allSuccess = false;
});

// Final summary
console.log('\n═══════════════════════════════════════════════════════════');
if (allSuccess) {
    console.log('   ✅ INSTALLATION COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📋 Next Steps:\n');
    console.log('1. Register the export routes in your server/src/index.js:');
    console.log('   const exportsRouter = require(\'./api/routes/exports\');');
    console.log('   app.use(\'/api/exports\', exportsRouter);\n');

    console.log('2. Import ExportModal in your React components:');
    console.log('   import ExportModal from \'./components/ExportModal\';\n');

    console.log('3. Review the documentation:');
    console.log('   - docs/EXPORT_MODULE_README.md');
    console.log('   - docs/EXPORT_MODULE_INTEGRATION.md\n');

    console.log('4. Restart your server to apply changes\n');

} else {
    console.log('   ⚠️  INSTALLATION COMPLETED WITH WARNINGS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Some steps failed. Please review the errors above and:');
    console.log('1. Check the installation logs');
    console.log('2. Verify database connectivity');
    console.log('3. Run failed steps manually\n');

    console.log('For help, see: docs/EXPORT_MODULE_INTEGRATION.md\n');
}

console.log('═══════════════════════════════════════════════════════════\n');
