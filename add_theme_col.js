require('./server/node_modules/dotenv').config({ path: '.env' });
const { query } = require('./server/src/infrastructure/database/db');

async function addThemeColumn() {
    try {
        console.log("Adding 'theme' column to 'tenants' table (JSONB)...");
        await query(`
            ALTER TABLE tenants 
            ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}';
        `);
        console.log("Column added successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Error adding column:", e);
        process.exit(1);
    }
}

addThemeColumn();
