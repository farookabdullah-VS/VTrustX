const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/infrastructure/database/db');

const createPersonasTable = async () => {
    try {
        console.log('Creating cx_personas table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS cx_personas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        description TEXT,
        attributes JSONB NOT NULL DEFAULT '{}',
        tenant_id VARCHAR(50), 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Successfully created cx_personas table.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        // We don't close the pool here because it might be shared, but for a script it's fine.
        // However, if db.js exports a singleton pool that doesn't expose .end(), we might hang.
        // Let's assume we can just exit.
        process.exit(0);
    }
};

createPersonasTable();
