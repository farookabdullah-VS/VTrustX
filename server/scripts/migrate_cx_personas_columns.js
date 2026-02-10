const { query } = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log('Migrating cx_personas table...');

        // Add photo_url
        await query(`
            ALTER TABLE cx_personas 
            ADD COLUMN IF NOT EXISTS photo_url TEXT;
        `);
        console.log('Added photo_url column.');

        // Add layout_config
        await query(`
            ALTER TABLE cx_personas 
            ADD COLUMN IF NOT EXISTS layout_config JSONB;
        `);
        console.log('Added layout_config column.');

        // Verify
        const res = await query(`
             SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'cx_personas';
        `);
        console.log('Current columns:', res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
