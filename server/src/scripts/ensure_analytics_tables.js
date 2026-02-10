const { query } = require('../infrastructure/database/db');

async function ensureAnalyticsTables() {
    try {
        console.log('Ensuring analytics tables exist...');

        // Teams Table
        await query(`
            CREATE TABLE IF NOT EXISTS teams (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                tenant_id VARCHAR(50)
            );
        `);
        console.log('Checked teams table.');

        // Tickets Table
        await query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                ticket_code VARCHAR(50) UNIQUE,
                title VARCHAR(255),
                status VARCHAR(50) DEFAULT 'open',
                priority VARCHAR(50) DEFAULT 'medium',
                assigned_user_id INTEGER,
                assigned_team_id INTEGER,
                respondent_name VARCHAR(255),
                source VARCHAR(50) DEFAULT 'survey',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tenant_id VARCHAR(50)
            );
        `);
        console.log('Checked tickets table.');

    } catch (err) {
        console.error('Error ensuring tables:', err);
    } finally {
        // Do not exit, just return
    }
}

module.exports = ensureAnalyticsTables;
