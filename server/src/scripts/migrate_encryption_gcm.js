/**
 * Migration Script: Re-encrypt all stored secrets from CBC to AES-256-GCM.
 *
 * IMPORTANT: Back up the database before running this script!
 * Usage: node src/scripts/migrate_encryption_gcm.js
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../../../.env') }); } catch (e) {}

const { query, pool } = require('../infrastructure/database/db');
const { decrypt, decryptCBC, encryptGCM } = require('../infrastructure/security/encryption');

const GCM_PREFIX = 'gcm:';

async function migrateTable(tableName, column) {
    console.log(`\nMigrating ${tableName}.${column}...`);

    const result = await query(`SELECT id, ${column} FROM ${tableName} WHERE ${column} IS NOT NULL`);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of result.rows) {
        const value = row[column];

        // Skip if already GCM-encrypted
        if (value.startsWith(GCM_PREFIX)) {
            skipped++;
            continue;
        }

        try {
            // Decrypt using auto-detect (CBC or plaintext)
            const plaintext = decrypt(value);

            // Re-encrypt using GCM
            const gcmEncrypted = encryptGCM(plaintext);

            await query(`UPDATE ${tableName} SET ${column} = $1 WHERE id = $2`, [gcmEncrypted, row.id]);
            migrated++;
        } catch (e) {
            console.error(`  Error migrating ${tableName} id=${row.id}: ${e.message}`);
            errors++;
        }
    }

    console.log(`  Total: ${result.rows.length}, Migrated: ${migrated}, Skipped (already GCM): ${skipped}, Errors: ${errors}`);
}

async function main() {
    console.log('=== AES-256-GCM Encryption Migration ===');
    console.log('WARNING: Ensure you have a database backup before proceeding!\n');

    try {
        // Migrate ai_providers.api_key
        try {
            await migrateTable('ai_providers', 'api_key');
        } catch (e) {
            console.log(`  Skipping ai_providers: ${e.message}`);
        }

        // Migrate integrations.api_key
        try {
            await migrateTable('integrations', 'api_key');
        } catch (e) {
            console.log(`  Skipping integrations: ${e.message}`);
        }

        console.log('\n=== Migration Complete ===');
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
