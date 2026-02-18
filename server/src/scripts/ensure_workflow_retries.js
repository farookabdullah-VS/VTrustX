
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

async function ensureWorkflowRetries() {
    try {
        logger.info('Checking workflow_executions table for retry columns...');

        // Check if next_retry_at exists
        const res = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'workflow_executions' AND column_name = 'next_retry_at'
        `);

        if (res.rows.length === 0) {
            logger.info('Adding next_retry_at column to workflow_executions...');
            await query(`
                ALTER TABLE workflow_executions 
                ADD COLUMN next_retry_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN retry_count INTEGER DEFAULT 0
            `);
            logger.info('Columns added successfully.');
        } else {
            logger.info('Columns already exist.');
        }

    } catch (err) {
        logger.error('Error ensuring workflow retries schema', { error: err.message });
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

if (require.main === module) {
    ensureWorkflowRetries();
}

module.exports = ensureWorkflowRetries;
