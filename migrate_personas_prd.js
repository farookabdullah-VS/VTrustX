const { query } = require('./server/src/infrastructure/database/db');
async function run() {
    try {
        console.log("Starting Persona PRD Migration...");
        // Add core metadata
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS persona_type VARCHAR(50) DEFAULT \'Customer\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS domain VARCHAR(50) DEFAULT \'CX\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS owner_id VARCHAR(50) DEFAULT \'system\'');

        // Add Quantification & Mapping
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS mapping_rules JSONB DEFAULT \'{}\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS live_metrics JSONB DEFAULT \'{"sat": 0, "loyalty": 0, "trust": 0, "effort": 0}\'');

        console.log('✅ Personas PRD Migration successful');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    }
}
run();
