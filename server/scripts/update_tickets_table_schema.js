const { pool } = require('../src/infrastructure/database/db');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log("Starting migration: update_tickets_table_schema");

        await client.query('BEGIN');

        const columns = [
            'ADD COLUMN IF NOT EXISTS request_type VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS mode VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS level VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS impact VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS impact_details TEXT',
            'ADD COLUMN IF NOT EXISTS urgency VARCHAR(50)',
            'ADD COLUMN IF NOT EXISTS site VARCHAR(100)',
            'ADD COLUMN IF NOT EXISTS group_name VARCHAR(100)',
            'ADD COLUMN IF NOT EXISTS category VARCHAR(100)',
            'ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100)',
            'ADD COLUMN IF NOT EXISTS assets TEXT',
            'ADD COLUMN IF NOT EXISTS issue TEXT',
            'ADD COLUMN IF NOT EXISTS analysis TEXT',
            'ADD COLUMN IF NOT EXISTS solution TEXT',
            'ADD COLUMN IF NOT EXISTS due_by TIMESTAMP'
        ];

        const query = `ALTER TABLE tickets ${columns.join(', ')}`;

        console.log("Executing query:", query);
        await client.query(query);

        await client.query('COMMIT');
        console.log("Migration successful");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed", e);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
