/**
 * Migration Script: Encrypt existing plaintext integration API keys.
 *
 * Usage: node src/scripts/migrate_encrypt_integration_keys.js
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../../../.env') }); } catch (e) {}

const { query, pool } = require('../infrastructure/database/db');
const { encrypt } = require('../infrastructure/security/encryption');

const GCM_PREFIX = 'gcm:';

async function main() {
    console.log('=== Integration API Key Encryption Migration ===\n');

    try {
        const result = await query("SELECT id, api_key FROM integrations WHERE api_key IS NOT NULL AND api_key != ''");
        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const row of result.rows) {
            // Skip if already encrypted (GCM or CBC format: contains colons with hex)
            if (row.api_key.startsWith(GCM_PREFIX) || /^[0-9a-f]{24,}:/.test(row.api_key)) {
                skipped++;
                continue;
            }

            try {
                const encrypted = encrypt(row.api_key);
                await query('UPDATE integrations SET api_key = $1 WHERE id = $2', [encrypted, row.id]);
                migrated++;
            } catch (e) {
                console.error(`  Error encrypting integration id=${row.id}: ${e.message}`);
                errors++;
            }
        }

        console.log(`Total: ${result.rows.length}, Migrated: ${migrated}, Skipped (already encrypted): ${skipped}, Errors: ${errors}`);
        console.log('\n=== Migration Complete ===');
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
