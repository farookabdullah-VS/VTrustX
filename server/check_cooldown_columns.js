const { query } = require('./src/infrastructure/database/db');

async function checkCooldownColumns() {
    try {
        // Check if cooldown columns exist in forms table
        const res = await query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'forms'
            AND column_name IN ('cooldown_enabled', 'cooldown_period', 'cooldown_type')
            ORDER BY column_name;
        `);

        if (res.rows.length === 0) {
            console.log('❌ Cooldown columns NOT found in forms table');
            console.log('→ Need to run migration: 1771320000000_survey-cooldown.js');
        } else {
            console.log('✅ Cooldown columns found in forms table:');
            console.log(JSON.stringify(res.rows, null, 2));
        }
    } catch (e) {
        console.error('Error checking cooldown columns:', e.message);
    } finally {
        process.exit();
    }
}

checkCooldownColumns();
