const { query } = require('../src/infrastructure/database/db');

async function archivePersonas() {
    try {
        console.log("Archiving Personas...");
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const archiveName = `cx_personas_archive_${timestamp}`;

        // Check if table exists
        const check = await query("SELECT to_regclass('public.cx_personas')");
        if (!check.rows[0].to_regclass) {
            console.log("Table 'cx_personas' does not exist. Nothing to archive.");
            process.exit(0);
        }

        // Rename
        console.log(`Renaming 'cx_personas' to '${archiveName}'...`);
        await query(`ALTER TABLE cx_personas RENAME TO ${archiveName}`);

        // Recreate empty table (clone structure)
        console.log("Recreating empty 'cx_personas' table...");
        await query(`CREATE TABLE cx_personas (LIKE ${archiveName} INCLUDING ALL)`);

        // If ID column is a sequence, we might need to handle it. 
        // INCLUDING ALL handles indexes and defaults.
        // However, if ID is SERIAL, the sequence is shared?
        // If we want a CLEAN slate, we should probably reset the sequence if it's reused.
        // But (LIKE ... INCLUDING ALL) typically copies column definitions. 
        // Serial columns depend on a sequence. Renaming the table DOES NOT rename the sequence usually.
        // So the new table will point to the SAME sequence.
        // This is fine, new IDs will just continue incrementing or we can reset it.
        // Let's safe-guard by creating a NEW sequence for the new table if needed?
        // Actually, if we just want "empty table", reusing sequence is acceptable.

        console.log("Archive complete.");
    } catch (e) {
        console.error("Archive Failed:", e);
    }
    process.exit(0);
}
archivePersonas();
