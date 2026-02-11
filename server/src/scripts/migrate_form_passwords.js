/**
 * Migration Script: Hash all existing plaintext form passwords with bcrypt.
 *
 * Usage: node src/scripts/migrate_form_passwords.js
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../../../.env') }); } catch (e) {}

const { query, pool } = require('../infrastructure/database/db');
const bcrypt = require('bcryptjs');

async function main() {
    console.log('=== Form Password Migration (plaintext → bcrypt) ===\n');

    try {
        const result = await query("SELECT id, password FROM forms WHERE password IS NOT NULL AND password != ''");
        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const row of result.rows) {
            // Skip if already hashed
            if (row.password.startsWith('$2a$') || row.password.startsWith('$2b$')) {
                skipped++;
                continue;
            }

            try {
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(row.password, salt);
                await query('UPDATE forms SET password = $1 WHERE id = $2', [hash, row.id]);
                migrated++;
            } catch (e) {
                console.error(`  Error hashing form id=${row.id}: ${e.message}`);
                errors++;
            }
        }

        console.log(`Total: ${result.rows.length}, Migrated: ${migrated}, Skipped (already hashed): ${skipped}, Errors: ${errors}`);
        console.log('\n=== Migration Complete ===');
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
