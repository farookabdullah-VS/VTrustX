const fs = require('fs');
const path = require('path');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

async function ensureBaseSchema() {
    try {
        logger.info('🚀 Ensuring base database schema (init.sql)...');

        // Locate init.sql relative to this script
        // Script is in /src/scripts/, init.sql is in /server/init.sql (root of server)
        // From /src/scripts, we go ../../
        const sqlPath = path.join(__dirname, '../../init.sql');

        if (!fs.existsSync(sqlPath)) {
            logger.error(`❌ init.sql not found at ${sqlPath}`);
            return;
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the entire SQL script
        // The pg driver supports multiple statements in a single query
        await query(sql);

        logger.info('✅ Base schema applied successfully');
    } catch (error) {
        logger.warn('⚠️  Base schema application finished with warning/error:', error.message);
    }
}

module.exports = ensureBaseSchema;
