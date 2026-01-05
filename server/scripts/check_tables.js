const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function check() {
    try {
        console.log("Checking form_contacts table...");
        const res = await pool.query("SELECT to_regclass('public.form_contacts')");
        console.log("form_contacts exists:", res.rows[0].to_regclass);

        console.log("Checking contacts table...");
        const res2 = await pool.query("SELECT to_regclass('public.contacts')");
        console.log("contacts exists:", res2.rows[0].to_regclass);

        // Check if there are any contacts
        if (res2.rows[0].to_regclass) {
            const res3 = await pool.query("SELECT COUNT(*) FROM contacts");
            console.log("Contact count:", res3.rows[0].count);
        }

    } catch (e) {
        console.error("Check Error:", e.message);
    } finally {
        await pool.end();
    }
}

check();
