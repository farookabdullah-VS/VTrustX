const { query } = require('./src/infrastructure/database/db');

async function addCreatedByColumn() {
    try {
        console.log("Checking 'forms' table for 'created_by' column...");

        // Check if column exists
        const checkRes = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='forms' AND column_name='created_by';
        `);

        if (checkRes.rows.length === 0) {
            console.log("Column 'created_by' does not exist. Adding it...");
            await query(`ALTER TABLE forms ADD COLUMN created_by VARCHAR(255);`);
            console.log("Column added successfully.");
        } else {
            console.log("Column 'created_by' already exists.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
}

addCreatedByColumn();
