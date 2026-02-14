/**
 * Social Listening Background Processor
 *
 * Cron job that processes unprocessed mentions with AI
 * Runs every 5 minutes to ensure timely analysis
 */

const cron = require('node-cron');
const SocialListeningAI = require('../services/ai/SocialListeningAI');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class SocialListeningProcessor {
  constructor() {
    this.isProcessing = false;
    this.cronJob = null;
    this.batchSize = 50; // Process 50 mentions per batch per tenant
  }

  /**
   * Start the background processor
   */
  start() {
    // Run every 5 minutes
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.processAllTenants();
    });

    logger.info('[SocialListeningProcessor] Background processor started (every 5 minutes)');

    // Run immediately on startup
    setTimeout(() => {
      this.processAllTenants();
    }, 10000); // Wait 10 seconds after startup
  }

  /**
   * Stop the background processor
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('[SocialListeningProcessor] Background processor stopped');
    }
  }

  /**
   * Process unprocessed mentions for all tenants
   */
  async processAllTenants() {
    if (this.isProcessing) {
      logger.debug('[SocialListeningProcessor] Already processing, skipping this cycle');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      logger.info('[SocialListeningProcessor] Starting processing cycle');

      // Get all tenants with unprocessed mentions
      const tenantsResult = await query(
        `SELECT DISTINCT tenant_id
         FROM sl_mentions
         WHERE sentiment IS NULL OR intent IS NULL
         LIMIT 100` // Max 100 tenants per cycle
      );

      if (tenantsResult.rows.length === 0) {
        logger.debug('[SocialListeningProcessor] No unprocessed mentions found');
        return;
      }

      logger.info('[SocialListeningProcessor] Found tenants with unprocessed mentions', {
        tenantCount: tenantsResult.rows.length
      });

      const results = {
        totalProcessed: 0,
        totalErrors: 0,
        tenantsProcessed: 0
      };

      // Process each tenant
      for (const { tenant_id } of tenantsResult.rows) {
        try {
          const result = await SocialListeningAI.processUnprocessedMentions(
            tenant_id,
            this.batchSize
          );

          results.totalProcessed += result.processed;
          results.totalErrors += result.errors;
          results.tenantsProcessed += 1;

          logger.debug('[SocialListeningProcessor] Tenant processed', {
            tenantId: tenant_id,
            processed: result.processed,
            errors: result.errors
          });

        } catch (error) {
          logger.error('[SocialListeningProcessor] Tenant processing failed', {
            tenantId: tenant_id,
            error: error.message
          });
        }
      }

      const processingTimeMs = Date.now() - startTime;

      logger.info('[SocialListeningProcessor] Processing cycle complete', {
        ...results,
        processingTimeMs
      });

      // Update processing statistics
      await this._updateProcessingStats(results);

    } catch (error) {
      logger.error('[SocialListeningProcessor] Processing cycle failed', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a specific tenant immediately
   * @param {number} tenantId - Tenant ID
   * @param {number} limit - Max mentions to process
   * @returns {Promise<Object>} Processing result
   */
  async processTenant(tenantId, limit = 100) {
    try {
      logger.info('[SocialListeningProcessor] Processing specific tenant', { tenantId, limit });

      const result = await SocialListeningAI.processUnprocessedMentions(tenantId, limit);

      logger.info('[SocialListeningProcessor] Tenant processing complete', {
        tenantId,
        ...result
      });

      return result;

    } catch (error) {
      logger.error('[SocialListeningProcessor] Tenant processing failed', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get processor status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      isRunning: this.cronJob !== null,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      schedule: '*/5 * * * *' // Every 5 minutes
    };
  }

  /**
   * Update processing statistics in a stats table (optional)
   * @param {Object} stats - Processing statistics
   */
  async _updateProcessingStats(stats) {
    try {
      // This could store stats in a dedicated table for monitoring
      // For now, just log it
      logger.debug('[SocialListeningProcessor] Stats updated', stats);
    } catch (error) {
      logger.error('[SocialListeningProcessor] Failed to update stats', {
        error: error.message
      });
    }
  }

  /**
   * Get unprocessed mention counts by tenant
   * @returns {Promise<Array>} Counts per tenant
   */
  async getUnprocessedCounts() {
    try {
      const result = await query(
        `SELECT tenant_id,
                COUNT(*) as unprocessed_count
         FROM sl_mentions
         WHERE sentiment IS NULL OR intent IS NULL
         GROUP BY tenant_id
         ORDER BY unprocessed_count DESC
         LIMIT 100`
      );

      return result.rows;

    } catch (error) {
      logger.error('[SocialListeningProcessor] Failed to get counts', {
        error: error.message
      });
      return [];
    }
  }
}

// Export singleton instance
const processor = new SocialListeningProcessor();
module.exports = processor;
