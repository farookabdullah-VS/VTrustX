const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const sql = `
CREATE TABLE IF NOT EXISTS customer_relationships (
    id SERIAL PRIMARY KEY,
    customer_id_from UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_id_to UUID REFERENCES customers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50), -- 'spouse', 'child', 'parent', 'employer', 'colleague'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id_from, customer_id_to)
);
`;

async function run() {
    try {
        console.log('Creating customer_relationships table...');
        await pool.query(sql);
        console.log('Success!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}

run();
