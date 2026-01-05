const { pool } = require('../src/infrastructure/database/db');

async function createSchema() {
    try {
        console.log('Connecting to database...');

        // Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Checked/Created "users" table.');

        // Forms Table
        // Storing schema/definition as JSONB for flexibility
        await pool.query(`
            CREATE TABLE IF NOT EXISTS forms (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                definition JSONB NOT NULL,
                version INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Checked/Created "forms" table.');

        // Submissions Table
        // Linked to forms. Data stored as JSONB.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                form_id INTEGER REFERENCES forms(id),
                data JSONB NOT NULL,
                analysis JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Checked/Created "submissions" table.');

        // Audit Logs Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                user_id VARCHAR(50), 
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Checked/Created "audit_logs" table.');

    } catch (err) {
        console.error('Error creating schema:', err);
    } finally {
        await pool.end();
    }
}

createSchema();
