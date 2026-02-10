const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vtrustx_db',
    port: process.env.DB_PORT || 5432,
};

if (process.env.INSTANCE_CONNECTION_NAME) {
    dbConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    delete dbConfig.port;
} else {
    dbConfig.host = process.env.DB_HOST || 'localhost';
}

const pool = new Pool(dbConfig);

async function initDb() {
    try {
        const sqlPath = path.join(__dirname, '..', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Reading init.sql from:', sqlPath);
        console.log('Running SQL commands...');

        await pool.query(sql);

        console.log('✅ Database initialized successfully! Tables created if they didn\'t exist.');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    } finally {
        await pool.end();
    }
}

initDb();
