const cron = require('node-cron');
const ABTestService = require('../services/ABTestService');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

/**
 * A/B Test Auto-Winner Detection Monitor
 *
 * Cron job that checks running experiments every 5 minutes
 * and automatically declares winners when statistical significance is achieved.
 *
 * Schedule: Every 5 minutes (cron: "* /5 * * * *" without the space)
 *
 * Enable/Disable: Set ENABLE_AB_AUTO_WINNER=false to disable
 */

// Check running experiments every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    try {
        logger.info('[ABTestMonitor] Starting auto-winner check');

        // Get all running experiments
        const result = await query(
            'SELECT id, tenant_id, name FROM ab_experiments WHERE status = $1',
            ['running']
        );

        const experiments = result.rows;

        if (experiments.length === 0) {
            logger.debug('[ABTestMonitor] No running experiments found');
            return;
        }

        logger.info(`[ABTestMonitor] Checking ${experiments.length} running experiments`);

        let winnersFound = 0;
        let errorsCount = 0;

        // Check each experiment for winner
        for (const exp of experiments) {
            try {
                const checkResult = await ABTestService.checkAndStopExperiment(exp.id);

                if (checkResult.shouldStop) {
                    winnersFound++;
                    logger.info('[ABTestMonitor] Winner declared', {
                        experimentId: exp.id,
                        experimentName: exp.name,
                        tenantId: exp.tenant_id,
                        winner: checkResult.winner,
                        reason: checkResult.reason
                    });
                } else {
                    logger.debug('[ABTestMonitor] No winner yet', {
                        experimentId: exp.id,
                        experimentName: exp.name,
                        reason: checkResult.reason
                    });
                }
            } catch (error) {
                errorsCount++;
                logger.error('[ABTestMonitor] Failed to check experiment', {
                    experimentId: exp.id,
                    experimentName: exp.name,
                    error: error.message,
                    stack: error.stack
                });
            }
        }

        logger.info('[ABTestMonitor] Auto-winner check completed', {
            total: experiments.length,
            winnersFound,
            errorsCount
        });
    } catch (error) {
        logger.error('[ABTestMonitor] Cron job failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

logger.info('[ABTestMonitor] Auto-winner detection cron job started (every 5 minutes)');

module.exports = {};
