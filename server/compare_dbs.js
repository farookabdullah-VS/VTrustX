const { Pool } = require('pg');
require('dotenv').config();

async function compare() {
    const configUnderscore = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: 15432,
        database: 'vtrustx_db'
    };

    const configHyphen = {
        ...configUnderscore,
        database: 'vtrustx-db'
    };

    console.log("Checking vtrustx_db...");
    try {
        const pool1 = new Pool(configUnderscore);
        const res1 = await pool1.query("SELECT count(*) FROM users");
        console.log(`vtrustx_db Users: ${res1.rows[0].count}`);
        await pool1.end();
    } catch (e) { console.log("vtrustx_db Error:", e.message); }

    console.log("Checking vtrustx-db...");
    try {
        const pool2 = new Pool(configHyphen);
        const res2 = await pool2.query("SELECT count(*) FROM users");
        console.log(`vtrustx-db Users: ${res2.rows[0].count}`);
        await pool2.end();
    } catch (e) { console.log("vtrustx-db Error:", e.message); }

    process.exit(0);
}
compare();
