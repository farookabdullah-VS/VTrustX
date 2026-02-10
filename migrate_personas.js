const { query } = require('./server/src/infrastructure/database/db');
async function run() {
    try {
        console.log("Starting Persona Migration...");
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'Draft\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT \'{}\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT \'#bef264\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT \'portrait\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS cjm_links JSONB DEFAULT \'[]\'');
        console.log('✅ Personas table migrated successfully');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    }
}
run();
