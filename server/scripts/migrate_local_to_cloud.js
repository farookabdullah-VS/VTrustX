
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Configuration
const TABLE_ORDER = [
    'tenants', // Will fail if missing local
    'users',
    'roles',
    'teams',
    'lov_countries',
    'lov_cities',
    'customer_contacts',
    'customers',
    'customer_identities',
    'forms',
    'form_contacts',
    'submissions',
    'integrations',
    'settings',
    'email_templates',
    'tickets',
    'ticket_messages',
    'sla_policies',
    'audit_logs',
    'cx_personas',
    'ai_providers',
    'notifications',
];

const localPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'vtrustx_db',
});

const cloudPool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: '127.0.0.1',
    port: 15432,
    database: 'vtrustx-db',
});

async function migrateTable(tableName) {
    console.log(`\n📦 Migrating table: ${tableName}`);

    // 1. Fetch data from Local
    try {
        console.log(`   Local Query: SELECT * FROM "${tableName}"`);
        const res = await localPool.query(`SELECT * FROM "${tableName}"`);
        const rows = res.rows;

        if (rows.length === 0) {
            console.log(`   No data to migrate.`);
            return;
        }
        console.log(`   Found ${rows.length} rows.`);

        // 2. Insert into Cloud
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
            const columns = Object.keys(row).map(k => `"${k}"`);
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            let conflictClause = 'ON CONFLICT (id) DO NOTHING';
            if (tableName === 'settings') {
                conflictClause = 'ON CONFLICT (key) DO NOTHING';
            }

            const queryText = `
                INSERT INTO "${tableName}" (${columns.join(', ')}) 
                VALUES (${placeholders})
                ${conflictClause}
            `;

            try {
                await cloudPool.query(queryText, values);
                successCount++;
            } catch (err) {
                if (err.code === '23505') {
                    // duplicate
                } else {
                    console.error(`   Insert Error [${tableName} ID:${row.id}]:`, err.message);
                    errorCount++;
                }
            }
        }
        console.log(`   ✅ Migrated ${successCount}/${rows.length} rows.`);

    } catch (err) {
        console.error(`   ❌ Failed to process table ${tableName}:`, err.message);
        // Do not throw, check next table?
    }
}

async function runMigration() {
    try {
        console.log('🚀 Starting Data Migration');
        for (const table of TABLE_ORDER) {
            await migrateTable(table);
        }
        console.log('\n✨ Database Migration Completed!');
    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await localPool.end();
        await cloudPool.end();
    }
}

runMigration();
