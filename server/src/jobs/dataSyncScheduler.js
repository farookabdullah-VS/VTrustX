/**
 * Data Sync Scheduler
 *
 * Cron job that syncs social media data at regular intervals
 * Runs every 15 minutes to fetch new mentions from connected sources
 */

const cron = require('node-cron');
const DataSyncService = require('../services/DataSyncService');
const logger = require('../infrastructure/logger');

class DataSyncScheduler {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    // Run every 15 minutes
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      await this.runSync();
    });

    logger.info('[DataSyncScheduler] Scheduler started (every 15 minutes)');

    // Run immediately on startup (after 30 seconds)
    setTimeout(() => {
      this.runSync();
    }, 30000);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('[DataSyncScheduler] Scheduler stopped');
    }
  }

  /**
   * Run sync cycle
   */
  async runSync() {
    if (this.isRunning) {
      logger.debug('[DataSyncScheduler] Sync already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('[DataSyncScheduler] Starting sync cycle');

      const result = await DataSyncService.syncDueSources();

      const duration = Date.now() - startTime;

      logger.info('[DataSyncScheduler] Sync cycle complete', {
        ...result,
        durationMs: duration
      });

    } catch (error) {
      logger.error('[DataSyncScheduler] Sync cycle failed', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Status
   */
  getStatus() {
    return {
      running: this.cronJob !== null,
      syncing: this.isRunning,
      schedule: '*/15 * * * *', // Every 15 minutes
      activeSyncs: DataSyncService.getActiveSyncs()
    };
  }
}

// Export singleton instance
const scheduler = new DataSyncScheduler();
module.exports = scheduler;
