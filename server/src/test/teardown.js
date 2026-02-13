const { gracefulShutdown } = require('../infrastructure/database/db');
const { closeAllCaches } = require('../infrastructure/cache');
const logger = require('../infrastructure/logger');

/**
 * Global teardown for Jest tests
 * Closes all database and cache connections to prevent open handles
 */
module.exports = async () => {
  try {
    logger.info('Jest global teardown: Closing connections...');

    // Close cache connections
    await closeAllCaches();
    logger.debug('Cache connections closed');

    // Close database pool
    await gracefulShutdown();
    logger.debug('Database pool closed');

    logger.info('Jest global teardown: Complete');
  } catch (error) {
    logger.error('Error during Jest teardown', { error: error.message });
    // Don't throw - allow tests to finish even if cleanup fails
  }
};
