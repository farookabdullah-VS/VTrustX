require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ai_providers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        "apiKey" TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

// Note: Postgres is case-insensitive for column names unless quoted.
// "apiKey" and "isActive" are quoted to preserve camelCase to match the entity usage in the code,
// simplifying the repository logic which likely maps object keys 1:1 to columns.

async function run() {
    try {
        const client = await pool.connect();
        console.log('Connected to database...');

        await client.query(createTableQuery);
        console.log('AI Providers table created successfully.');

        client.release();
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await pool.end();
    }
}

run();
