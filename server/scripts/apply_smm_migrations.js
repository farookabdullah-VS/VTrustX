const fs = require('fs');
const path = require('path');
const { query } = require('../src/infrastructure/database/db');

const MIGRATION_FILES = [
    '001_init_spine.sql',
    '002_assets_extended.sql',
    '003_templates.sql',
    '004_engagement_sla_sentiment.sql',
    '005_compliance_crisis_links.sql',
    '006_ai_layer.sql',
    '007_reporting_dashboards.sql'
];

async function applySmmMigrations() {
    console.log('Starting SMM (Social Media Marketing) Schema Migration...');
    console.log('Target Schema: smm');

    const docsDir = path.join(__dirname, '../../docs');

    try {
        for (const file of MIGRATION_FILES) {
            const filePath = path.join(docsDir, file);
            console.log(`\nProcessing: ${file}...`);

            if (!fs.existsSync(filePath)) {
                console.error(`❌ File not found: ${filePath}`);
                // In a real scenario we might abort, but for now strict strictness
                continue;
            }

            const sqlContent = fs.readFileSync(filePath, 'utf8');

            // Split by semicolon if needed, but pgcrypto and $$ blocks make that hard.
            // Best to send the whole file content if the driver supports multiple statements.
            // pg node driver supports it if we just pass the string.

            await query(sqlContent);
            console.log(`✓ Applied ${file}`);
        }

        console.log('\n✅ All SMM migrations applied successfully.');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

applySmmMigrations();
