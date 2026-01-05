const { query } = require('../src/infrastructure/database/db');

(async () => {
    try {
        console.log("Adding theme column to tenants table...");
        await query(`
            ALTER TABLE tenants 
            ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'
        `);
        console.log("Column added successfully.");
    } catch (e) {
        console.error("Error:", e.message);
    }
})();
