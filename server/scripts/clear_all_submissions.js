const { pool } = require('../src/infrastructure/database/db');

async function clearAllSubmissions() {
    try {
        console.log('Connecting to database...');

        // precise count before
        const countRes = await pool.query('SELECT COUNT(*) FROM submissions');
        console.log(`Current submission count: ${countRes.rows[0].count}`);

        if (parseInt(countRes.rows[0].count) === 0) {
            console.log('No submissions to delete.');
            return;
        }

        console.log('Deleting ALL submissions...');
        // TRUNCATE is faster and resets sequences optionally, but DELETE is safer for cascades if needed. 
        // Using DELETE to be safe with standard SQL.
        await pool.query('DELETE FROM submissions');

        console.log('✅ All submissions have been deleted successfully.');

    } catch (err) {
        console.error('❌ Error clearing submissions:', err.message);
    } finally {
        await pool.end();
    }
}

clearAllSubmissions();
