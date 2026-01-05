const { query } = require('../src/infrastructure/database/db');

async function cleanupDuplicates() {
    try {
        console.log('Cleaning up duplicate contact records...');

        // Delete duplicates ensuring only the latest one remains
        const sql = `
            DELETE FROM customer_contacts a USING customer_contacts b
            WHERE a.id < b.id
            AND a.customer_id = b.customer_id
            AND a.type = b.type;
        `;

        const res = await query(sql);
        console.log(`Deleted ${res.rowCount} duplicate contact records.`);

        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Error cleaning up duplicates:', err);
    } finally {
        process.exit();
    }
}

cleanupDuplicates();
