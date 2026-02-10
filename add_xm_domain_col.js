const { query } = require('./server/src/infrastructure/database/db');

async function run() {
    try {
        console.log("Adding xm_domain and xm_program_id to forms table...");

        await query(`
            ALTER TABLE forms 
            ADD COLUMN IF NOT EXISTS xm_domain VARCHAR(10) DEFAULT 'CX',
            ADD COLUMN IF NOT EXISTS xm_program_id VARCHAR(50);
        `);

        console.log("Columns added successfully.");

        // Optionally update existing rows to default if needed, though DEFAULT 'CX' handles new ones.
        // Let's verify
        const res = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'forms';`);
        console.log("Current Columns:", res.rows.map(r => r.column_name));

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

run();
