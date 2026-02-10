const db = require('../infrastructure/database/db');

module.exports = async function ensureQuotasTable() {
    console.log("[Schema] Ensuring quotas table columns...");
    try {
        // Ensure table exists first (rudimentary check)
        await db.query(`
            CREATE TABLE IF NOT EXISTS quotas (
                id SERIAL PRIMARY KEY,
                form_id INTEGER,
                limit_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add columns
        await db.query(`
            ALTER TABLE quotas 
            ADD COLUMN IF NOT EXISTS label TEXT,
            ADD COLUMN IF NOT EXISTS current_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS criteria JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'reject',
            ADD COLUMN IF NOT EXISTS action_data JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS reset_period TEXT DEFAULT 'never',
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;
        `);
        console.log("[Schema] Quotas table ready.");
    } catch (err) {
        console.error("[Schema] Quotas migration failed:", err);
    }
};
