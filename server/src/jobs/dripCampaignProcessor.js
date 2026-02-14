/**
 * Drip Campaign Processor - Cron Job
 *
 * Runs every 5 minutes to process pending campaign steps
 * - Finds enrollments ready for next step
 * - Sends scheduled messages
 * - Updates enrollment status
 * - Handles completion and stop conditions
 */

const cron = require('node-cron');
const DripCampaignService = require('../services/DripCampaignService');
const logger = require('../infrastructure/logger');

// Process pending steps every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    try {
        logger.info('[DripCampaignProcessor] Starting scheduled processing');

        const result = await DripCampaignService.processPendingSteps();

        logger.info('[DripCampaignProcessor] Processing complete', {
            processed: result.processed,
            failed: result.failed,
            total: result.total
        });
    } catch (error) {
        logger.error('[DripCampaignProcessor] Processing failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

logger.info('[DripCampaignProcessor] Cron job initialized (runs every 5 minutes)');

module.exports = {};
