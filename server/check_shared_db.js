const { pool } = require('./src/infrastructure/database/db');
const { v4: uuidv4 } = require('uuid');

async function check() {
    try {
        console.log("Checking shared_dashboards table...");
        const res = await pool.query("SELECT * FROM shared_dashboards LIMIT 1");
        console.log("Query success. Rows:", res.rows.length);

        console.log("Checking UUID generation...");
        const token = uuidv4();
        console.log("UUID generated:", token);

        console.log("Testing insert...");
        // valid form id needed.
        // Let's get a form.
        const formRes = await pool.query("SELECT id FROM forms LIMIT 1");
        if (formRes.rows.length > 0) {
            const formId = formRes.rows[0].id;
            console.log("Found form id:", formId);

            // Test the exact query we are using in the route
            const subRes = await pool.query(
                `SELECT id, form_id, data, created_at 
                 FROM submissions 
                 WHERE form_id = $1
                 ORDER BY created_at DESC LIMIT 5`,
                [formId]
            );
            console.log("Submissions found:", subRes.rows.length);
            if (subRes.rows.length > 0) {
                console.log("Sample Data:", JSON.stringify(subRes.rows[0].data).substring(0, 50) + "...");
            }
        } else {
            console.log("No forms found to test with.");
        }

    } catch (err) {
        console.error("Check failed:", err);
    } finally {
        await pool.end();
    }
}

check();
