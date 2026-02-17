'use strict';

const cron = require('node-cron');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const DataSyncService = require('../services/DataSyncService');

let task = null;
let isRunning = false;
let lastRunAt = null;
let lastRunResult = null;

const dataSyncScheduler = {
    /**
     * Start the cron job.
     * Runs every 15 minutes and syncs all tenants that have active sources.
     */
    start() {
        if (task) {
            logger.warn('[DataSyncScheduler] Already started');
            return;
        }

        // Run immediately on startup (next tick), then every 15 minutes
        task = cron.schedule('*/15 * * * *', async () => {
            await _runSync();
        }, {
            timezone: 'UTC'
        });

        logger.info('[DataSyncScheduler] Started — runs every 15 minutes');
    },

    /**
     * Stop the cron job.
     */
    stop() {
        if (task) {
            task.stop();
            task = null;
            logger.info('[DataSyncScheduler] Stopped');
        }
    },

    /**
     * Return the current scheduler state.
     * Called synchronously by sync.js routes.
     *
     * @returns {{ active, isRunning, lastRunAt, lastRunResult }}
     */
    getStatus() {
        return {
            active: task !== null,
            isRunning,
            lastRunAt,
            lastRunResult
        };
    }
};

// ---------------------------------------------------------------------------

async function _runSync() {
    if (isRunning) {
        logger.warn('[DataSyncScheduler] Previous run still active — skipping this cycle');
        return;
    }

    isRunning = true;
    const startedAt = new Date();

    try {
        logger.info('[DataSyncScheduler] Starting scheduled sync cycle');

        // Fetch all tenants that have at least one non-paused/disconnected source
        const result = await query(
            `SELECT DISTINCT tenant_id
             FROM sl_sources
             WHERE status NOT IN ('paused', 'disconnected')`
        );
        const tenants = result.rows;

        if (tenants.length === 0) {
            logger.info('[DataSyncScheduler] No active sources found, nothing to sync');
            lastRunResult = { tenantsProcessed: 0, totalMentionsSaved: 0 };
            lastRunAt = startedAt;
            isRunning = false;
            return;
        }

        let tenantsProcessed = 0;
        let tenantsFailed = 0;
        let totalMentionsSaved = 0;

        for (const { tenant_id } of tenants) {
            try {
                const res = await DataSyncService.syncTenant(tenant_id);
                totalMentionsSaved += res.totalMentionsSaved || 0;
                tenantsProcessed++;
            } catch (err) {
                tenantsFailed++;
                logger.error('[DataSyncScheduler] Tenant sync failed', {
                    tenant_id,
                    error: err.message
                });
            }
        }

        const durationMs = Date.now() - startedAt.getTime();
        lastRunResult = {
            tenantsProcessed,
            tenantsFailed,
            totalMentionsSaved,
            durationMs
        };
        lastRunAt = startedAt;

        logger.info('[DataSyncScheduler] Sync cycle complete', lastRunResult);

    } catch (err) {
        logger.error('[DataSyncScheduler] Sync cycle error', { error: err.message });
        lastRunResult = { error: err.message };
        lastRunAt = startedAt;
    } finally {
        isRunning = false;
    }
}

module.exports = dataSyncScheduler;
