const { query } = require('./server/src/infrastructure/database/db');

async function checkSubmissions() {
    try {
        const result = await query("SELECT * FROM submissions LIMIT 5");
        console.log("Submissions found:", result.rows.length);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error("Error checking submissions:", err);
    } finally {
        process.exit();
    }
}

checkSubmissions();
