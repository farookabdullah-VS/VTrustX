const { query } = require('../src/infrastructure/database/db');

async function fixFormsSchema() {
    console.log("Starting Forms Schema Migration...");

    const statements = [
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS request_by VARCHAR(100);",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS response_limit INTEGER;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS redirect_url TEXT;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS password VARCHAR(100);",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS allow_audio BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS allow_camera BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS allow_location BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS ai JSONB;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS enable_voice_agent BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE forms ADD COLUMN IF NOT EXISTS allowed_ips TEXT;"
    ];

    for (const sql of statements) {
        try {
            await query(sql);
            console.log(`Executed: ${sql}`);
        } catch (err) {
            console.error(`Error executing ${sql}:`, err.message);
        }
    }

    console.log("Migration completed.");
    process.exit(0);
}

fixFormsSchema();
