
require('./server/node_modules/dotenv').config({ path: './server/.env' });
const { query } = require('./server/src/infrastructure/database/db');

async function createCJMSchema() {
    try {
        console.log("Creating CJM schema...");

        await query(`
            CREATE TABLE IF NOT EXISTS cjm_maps (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("CJM Maps table created.");
        process.exit(0);
    } catch (e) {
        console.error("Error creating schema:", e);
        process.exit(1);
    }
}

createCJMSchema();
