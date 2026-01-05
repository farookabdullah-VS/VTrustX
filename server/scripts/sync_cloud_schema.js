
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const cloudPool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: '127.0.0.1',
    port: 15432, // Proxy
    database: 'vtrustx-db',
});

const SCHEMA_FILES = [
    'migration_tenant.sql',
    'add_email_templates.sql',
    'migration_email.sql',
    'migration_notifications.sql',
    'migration_workflow_v2.sql',
    'migration_sla.sql',
    'migration_kb.sql',
    'add_assignment_rules.sql',
    'add_customer360_schema.sql',
    'add_customer_extended_fields.sql',
    'add_customer_advanced_schema.sql',
    'add_customer_products.sql',
    'upgrade_customer360_schema_v2.sql',
    'add_journey_schema.sql',
    'add_master_data.sql',
    'migration_audit.sql',
    'add_tenant_features.sql'
];

async function runSchemaSync() {
    try {
        console.log('🔄 Syncing Cloud Schema with local scripts...');

        for (const file of SCHEMA_FILES) {
            const filePath = path.join(__dirname, file);
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Skipped missing file: ${file}`);
                continue;
            }

            console.log(`📄 Executing ${file}...`);
            const sql = fs.readFileSync(filePath, 'utf8');
            try {
                await cloudPool.query(sql);
                console.log(`   ✅ Success.`);
            } catch (err) {
                console.error(`   ❌ Error in ${file}:`, err.message);
                // Continue despite errors as some might be "relation already exists"
            }
        }

        console.log('✨ Schema Sync Complete.');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await cloudPool.end();
    }
}

runSchemaSync();
