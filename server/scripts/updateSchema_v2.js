const { pool } = require('../src/infrastructure/database/db');

async function updateSchema() {
    try {
        console.log('Updating schema...');

        // Forms: Add is_published
        await pool.query(`
            ALTER TABLE forms 
            ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
        `);
        console.log('Updated "forms" table.');

        // Submissions: Add form_version and metadata
        await pool.query(`
            ALTER TABLE submissions 
            ADD COLUMN IF NOT EXISTS form_version INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS metadata JSONB;
        `);
        console.log('Updated "submissions" table.');

    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await pool.end();
    }
}

updateSchema();
