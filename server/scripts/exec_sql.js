const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the .env file in the server root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vtrustx_db',
    port: process.env.DB_PORT || 5432,
    host: process.env.DB_HOST || 'localhost',
};

// Handle Cloud SQL connection if applicable
if (process.env.INSTANCE_CONNECTION_NAME) {
    dbConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    delete dbConfig.port;
}

const pool = new Pool(dbConfig);

async function runSqlFile() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: node exec_sql.js <absolute_path_to_sql_file>');
        process.exit(1);
    }

    try {
        console.log(`Reading SQL file: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        console.log('Executing SQL...');

        await pool.query(sql);

        console.log('✅ SQL executed successfully.');
    } catch (err) {
        console.error('❌ Error executing SQL:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runSqlFile();
