const cron = require('node-cron');
const PersonaAnalyticsService = require('../services/PersonaAnalyticsService');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

/**
 * PersonaSyncJob
 *
 * Scheduled job that runs daily to sync persona data from survey responses.
 * Creates daily snapshots for all personas with auto_sync enabled.
 */
class PersonaSyncJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the scheduled job
   * Runs daily at 2:00 AM
   */
  start() {
    // Run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.execute();
    });

    logger.info('Persona sync job scheduled (daily at 2:00 AM)');
  }

  /**
   * Execute the sync job
   * Can be called manually or by the cron schedule
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Persona sync job already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    logger.info('Starting daily persona sync job');

    try {
      // Get all personas with auto_sync enabled
      const personas = await query(
        `SELECT id, name, tenant_id FROM cx_personas
         WHERE sync_config->>'auto_sync' = 'true'
         ORDER BY id`
      );

      logger.info(`Found ${personas.rows.length} personas to sync`);

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const persona of personas.rows) {
        try {
          const snapshot = await PersonaAnalyticsService.createDailySnapshot(persona.id);

          if (snapshot) {
            successCount++;
            logger.info(`Synced persona ${persona.id} (${persona.name})`, {
              personaId: persona.id,
              tenantId: persona.tenant_id,
              responseCount: snapshot.response_count
            });
          } else {
            skipCount++;
            logger.debug(`Skipped persona ${persona.id} (${persona.name}) - no responses today`, {
              personaId: persona.id,
              tenantId: persona.tenant_id
            });
          }
        } catch (error) {
          errorCount++;
          logger.error(`Failed to sync persona ${persona.id} (${persona.name})`, {
            personaId: persona.id,
            tenantId: persona.tenant_id,
            error: error.message,
            stack: error.stack
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Daily persona sync job completed', {
        totalPersonas: personas.rows.length,
        successCount,
        skipCount,
        errorCount,
        durationMs: duration,
        durationSeconds: (duration / 1000).toFixed(2)
      });

      // If there were errors, log them as a warning
      if (errorCount > 0) {
        logger.warn(`Persona sync completed with ${errorCount} errors out of ${personas.rows.length} personas`);
      }

    } catch (error) {
      logger.error('Persona sync job failed', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run sync immediately (for testing or manual trigger)
   * @returns {Promise<void>}
   */
  async runNow() {
    logger.info('Manual persona sync job triggered');
    await this.execute();
  }
}

module.exports = new PersonaSyncJob();
