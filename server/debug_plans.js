const { query } = require('./src/infrastructure/database/db');

async function checkPlans() {
    try {
        console.log("Querying pricing_plans...");
        const res = await query('SELECT * FROM pricing_plans');
        console.log("Plans found:", res.rows.length);
        console.log(res.rows);
    } catch (e) {
        console.log("Query Error:", e.message);
    }
    process.exit(0);
}
checkPlans();
