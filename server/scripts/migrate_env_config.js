const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'vtrustx_db',
});

const KEYS_TO_MIGRATE = [
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'OPENAI_API_KEY',
    'GROQ_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'USE_ANDROID_GATEWAY',
    'USE_MOCK_CALLS',
    'PUBLIC_URL',
    'CORE_SERVICE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'MICROSOFT_CLIENT_ID',
    'MICROSOFT_CLIENT_SECRET',
    'AI_PROVIDER'
];

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [key, ...parts] = trimmed.split('=');
        if (key && parts.length > 0) {
            env[key.trim()] = parts.join('=').trim().replace(/^["']|["']$/g, ''); // Remove quotes
        }
    });
    return env;
}

async function migrate() {
    try {
        console.log("Migrating Environment Variables to DB Settings...");

        const serverEnv = parseEnvFile(path.join(__dirname, '../.env'));
        const aiEnv = parseEnvFile(path.join(__dirname, '../../ai-service/.env'));

        // Merge, AI Service takes precedence for shared keys (like AI_PROVIDER)
        const combined = { ...serverEnv, ...aiEnv };

        for (const key of KEYS_TO_MIGRATE) {
            const value = combined[key];
            if (value) {
                console.log(`Migrating ${key}...`);
                await pool.query(`
                    INSERT INTO settings (key, value, updated_at) 
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (key) 
                    DO UPDATE SET value = $2, updated_at = NOW()
                `, [key.toLowerCase(), value]); // Lowercase key for consistency with existing settings structure? 
                // Wait, existing settings use snake_case (e.g. voice_agent_provider).
                // But these are ENV vars. I should probably keep them as is OR potentiall map them.
                // However, SystemSettings.jsx and settings.js handle arbitrary keys.
                // Keeping them consistent with ENV names makes it easier to map back.
                // BUT, settings usually use lowercase. 
                // I will use lowercase for keys to match the 'settings' table convention seen in settings.js
                // actually settings.js lines 112 just reads key=value.
                // 'voice_agent_provider' is lowercase.
                // I will normalize to lowercase for keys: 'gemini_api_key', 'twilio_account_sid', etc.
            } else {
                console.log(`Skipping ${key} (Not found)`);
            }
        }

        console.log("Migration complete.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
    }
}

migrate();
