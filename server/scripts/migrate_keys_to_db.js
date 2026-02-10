const { query } = require('../src/infrastructure/database/db');

async function migrateKeys() {
    try {
        console.log("Migrating ENV keys to Database...");

        // 1. Google/Gemini
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            console.log("Found GEMINI_API_KEY in ENV. Inserting...");
            // Update Existing
            await query("UPDATE ai_providers SET api_key = $1 WHERE provider = 'gemini' OR provider = 'google'", [geminiKey]);
            // Insert New if not exists
            const res = await query("SELECT 1 FROM ai_providers WHERE provider = 'gemini' OR provider = 'google'");
            if (res.rows.length === 0) {
                await query("INSERT INTO ai_providers (name, provider, api_key, is_active) VALUES ('Gemini Pro', 'gemini', $1, true)", [geminiKey]);
            }
        }

        // 2. Groq
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            console.log("Found GROQ_API_KEY in ENV. Inserting...");
            await query("UPDATE ai_providers SET api_key = $1 WHERE provider = 'groq'", [groqKey]);
            const res = await query("SELECT 1 FROM ai_providers WHERE provider = 'groq'");
            if (res.rows.length === 0) {
                await query("INSERT INTO ai_providers (name, provider, api_key, is_active) VALUES ('Groq Whisper', 'groq', $1, true)", [groqKey]);
            }
        }

        console.log("Migration Complete.");
        process.exit(0);
    } catch (e) {
        console.error("Migration Error:", e);
        process.exit(1);
    }
}

migrateKeys();
