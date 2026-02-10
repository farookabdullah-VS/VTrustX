const db = require('../infrastructure/database/db');

async function migrate() {
    console.log("Adding columns to quotas table...");
    try {
        await db.query(`
            ALTER TABLE quotas 
            ADD COLUMN IF NOT EXISTS label TEXT,
            ADD COLUMN IF NOT EXISTS current_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS criteria JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'reject',
            ADD COLUMN IF NOT EXISTS reset_period TEXT DEFAULT 'never',
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        `);
        console.log("Columns added successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    }
}

migrate().then(() => process.exit());
