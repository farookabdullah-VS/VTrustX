const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkSubmissions() {
    try {
        console.log('Checking submissions in Cloud DB...');
        const res = await pool.query('SELECT * FROM submissions');
        console.log(`Found ${res.rows.length} submissions.`);
        res.rows.forEach(row => {
            console.log(`- ID: ${row.id}, FormID: ${row.form_id}, CreatedAt: ${row.created_at}`);
            console.log(`  Data:`, row.data);
        });

        const formRes = await pool.query('SELECT * FROM forms');
        console.log(`Found ${formRes.rows.length} forms.`);
        formRes.rows.forEach(row => {
            console.log(`- ID: ${row.id}, Title: ${row.title}, Slug: ${row.slug}`);
        });

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkSubmissions();
