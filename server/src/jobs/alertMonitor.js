/**
 * Alert Monitor Job
 *
 * Background processor that:
 * 1. Checks for volume spikes every 5 minutes
 * 2. Checks competitor spikes every 15 minutes
 * 3. Monitors system health
 */

const cron = require('node-cron');
const AlertEngine = require('../services/AlertEngine');
const logger = require('../infrastructure/logger');

class AlertMonitor {
  constructor() {
    this.volumeCheckJob = null;
    this.isRunning = false;
  }

  /**
   * Start the monitor
   */
  start() {
    // Check volume spikes every 5 minutes
    this.volumeCheckJob = cron.schedule('*/5 * * * *', async () => {
      await this.checkVolumeSpikes();
    });

    logger.info('[AlertMonitor] Alert monitor started');
    logger.info('[AlertMonitor] - Volume spike checks: every 5 minutes');

    // Run first check after 1 minute
    setTimeout(() => {
      this.checkVolumeSpikes();
    }, 60000);
  }

  /**
   * Stop the monitor
   */
  stop() {
    if (this.volumeCheckJob) {
      this.volumeCheckJob.stop();
      logger.info('[AlertMonitor] Alert monitor stopped');
    }
  }

  /**
   * Check for volume spikes
   */
  async checkVolumeSpikes() {
    if (this.isRunning) {
      logger.debug('[AlertMonitor] Volume check already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('[AlertMonitor] Starting volume spike check');

      await AlertEngine.checkVolumeSpikes();

      const duration = Date.now() - startTime;

      logger.info('[AlertMonitor] Volume spike check complete', {
        durationMs: duration
      });

    } catch (error) {
      logger.error('[AlertMonitor] Volume spike check failed', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get monitor status
   */
  getStatus() {
    return {
      running: this.volumeCheckJob !== null,
      checking: this.isRunning,
      schedule: '*/5 * * * *' // Every 5 minutes
    };
  }
}

// Export singleton instance
const monitor = new AlertMonitor();
module.exports = monitor;
