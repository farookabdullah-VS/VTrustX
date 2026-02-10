const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vtrustx_db',
    port: process.env.DB_PORT || 5432,
    host: process.env.DB_HOST || 'localhost',
};

if (process.env.INSTANCE_CONNECTION_NAME) {
    dbConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    delete dbConfig.port;
}

const pool = new Pool(dbConfig);

async function runQuery() {
    const queryOrFile = process.argv[2];
    if (!queryOrFile) {
        console.error('Usage: node query_db.js <sql_query_string_or_file_path>');
        process.exit(1);
    }

    let sql = queryOrFile;
    if (fs.existsSync(queryOrFile)) {
        sql = fs.readFileSync(queryOrFile, 'utf8');
    }

    const outputFile = process.argv[3];

    try {
        console.log('Running query...');
        const res = await pool.query(sql);
        const jsonOutput = JSON.stringify(res.rows, null, 2);

        if (outputFile) {
            fs.writeFileSync(outputFile, jsonOutput, 'utf8');
            console.log(`Output written to ${outputFile}`);
        } else {
            console.log(jsonOutput);
        }
        console.log(`Total rows: ${res.rowCount}`);
    } catch (err) {
        console.error('❌ Error executing query:', err);
    } finally {
        await pool.end();
    }
}

runQuery();
