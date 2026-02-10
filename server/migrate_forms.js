const { query } = require('./src/infrastructure/database/db');
require('dotenv').config();

async function run() {
    console.log("Checking forms table schema...");

    const columns = [
        { name: 'ai_enabled', type: "BOOLEAN DEFAULT FALSE" },
        { name: 'ai', type: "JSONB DEFAULT '{}'" },
        { name: 'enable_voice_agent', type: "BOOLEAN DEFAULT FALSE" },
        { name: 'allowed_ips', type: "TEXT" },
        { name: 'request_by', type: "VARCHAR(255)" },
        { name: 'approved_by', type: "VARCHAR(255)" },
        { name: 'status', type: "VARCHAR(50) DEFAULT 'draft'" },
        { name: 'start_date', type: "TIMESTAMP" },
        { name: 'end_date', type: "TIMESTAMP" },
        { name: 'response_limit', type: "INTEGER" },
        { name: 'redirect_url', type: "VARCHAR(255)" },
        { name: 'password', type: "VARCHAR(255)" },
        { name: 'allow_audio', type: "BOOLEAN DEFAULT FALSE" },
        { name: 'allow_camera', type: "BOOLEAN DEFAULT FALSE" },
        { name: 'allow_location', type: "BOOLEAN DEFAULT FALSE" },
        { name: 'is_active', type: "BOOLEAN DEFAULT TRUE" }
    ];

    for (const col of columns) {
        try {
            const res = await query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'forms' AND column_name = $1
            `, [col.name]);

            if (res.rows.length === 0) {
                console.log(`Adding missing column: ${col.name}`);
                await query(`ALTER TABLE forms ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`Column exists: ${col.name}`);
            }
        } catch (e) {
            console.error(`Error checking/adding ${col.name}:`, e.message);
        }
    }
    console.log("Forms table schema update complete.");
    process.exit(0);
}

run();
