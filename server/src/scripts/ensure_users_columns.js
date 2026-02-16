const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

module.exports = async function ensureUsersColumns() {
    try {
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
        `);
        logger.debug('Users table columns checked/updated');
    } catch (err) {
        logger.error('Failed to ensure users columns', { error: err.message });
        throw err;
    }
};
