/**
 * Data Sync Service
 *
 * Orchestrates syncing data from social media platforms
 * Manages sync schedules and coordinates with platform connectors
 */

const { query } = require('../infrastructure/database/db');
const ConnectorFactory = require('./connectors/ConnectorFactory');
const SocialListeningAI = require('./ai/SocialListeningAI');
const logger = require('../infrastructure/logger');

class DataSyncService {
  constructor() {
    this.activeSyncs = new Map(); // Track active sync operations
  }

  /**
   * Sync a specific source
   * @param {string} sourceId - Source UUID
   * @returns {Promise<Object>} Sync result
   */
  async syncSource(sourceId) {
    // Check if already syncing
    if (this.activeSyncs.has(sourceId)) {
      logger.warn('[DataSync] Source already syncing', { sourceId });
      return { success: false, message: 'Sync already in progress' };
    }

    this.activeSyncs.set(sourceId, { startedAt: new Date() });

    try {
      logger.info('[DataSync] Starting source sync', { sourceId });

      // Fetch source from database
      const sourceResult = await query(
        `SELECT id, tenant_id, platform, name, connection_type, config, status,
                last_sync_at, sync_interval_minutes
         FROM sl_sources
         WHERE id = $1`,
        [sourceId]
      );

      if (sourceResult.rows.length === 0) {
        throw new Error('Source not found');
      }

      const source = sourceResult.rows[0];

      // Check if platform is supported
      if (!ConnectorFactory.isSupported(source.platform)) {
        throw new Error(`Platform ${source.platform} not yet supported`);
      }

      // Create connector
      const config = typeof source.config === 'string' ? JSON.parse(source.config) : source.config;
      const connector = ConnectorFactory.create(source.platform, {
        sourceId: source.id,
        tenantId: source.tenant_id,
        credentials: config.credentials || {},
        searchParams: config.searchParams || {}
      });

      // Test connection first
      const testResult = await connector.testConnection();
      if (!testResult.success) {
        await connector.updateSourceStatus('error', testResult.message);
        throw new Error(`Connection test failed: ${testResult.message}`);
      }

      // Load max mentions limit from settings
      const settingsResult = await query("SELECT value FROM settings WHERE key = 'sl_max_mentions_per_sync'");
      const maxMentions = settingsResult.rows.length > 0
        ? parseInt(settingsResult.rows[0].value) || 100
        : 100;

      // Determine since parameter (fetch mentions since last sync)
      const fetchOptions = {
        limit: maxMentions
      };

      if (source.last_sync_at) {
        fetchOptions.since = new Date(source.last_sync_at);
      } else {
        // First sync - fetch last 7 days
        fetchOptions.since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      logger.info('[DataSync] Fetching mentions', {
        sourceId,
        platform: source.platform,
        since: fetchOptions.since
      });

      // Fetch mentions
      const mentions = await connector.fetchMentions(fetchOptions);

      logger.info('[DataSync] Mentions fetched', {
        sourceId,
        count: mentions.length
      });

      // Save mentions to database
      const saveResult = await connector.saveMentions(mentions);

      logger.info('[DataSync] Mentions saved', {
        sourceId,
        ...saveResult
      });

      // Update source status
      await connector.updateSourceStatus('connected');

      // Trigger AI processing for new mentions (async)
      if (saveResult.saved > 0) {
        this.triggerAIProcessing(source.tenant_id, saveResult.saved);
      }

      const syncResult = {
        success: true,
        sourceId,
        platform: source.platform,
        mentionsFetched: mentions.length,
        mentionsSaved: saveResult.saved,
        duplicates: saveResult.duplicates,
        errors: saveResult.errors,
        syncedAt: new Date()
      };

      logger.info('[DataSync] Source sync complete', syncResult);

      return syncResult;

    } catch (error) {
      logger.error('[DataSync] Source sync failed', {
        sourceId,
        error: error.message,
        stack: error.stack
      });

      // Try to update source status to error
      try {
        await query(
          'UPDATE sl_sources SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
          ['error', error.message, sourceId]
        );
      } catch (updateError) {
        logger.error('[DataSync] Failed to update source error status', { sourceId });
      }

      return {
        success: false,
        sourceId,
        error: error.message
      };

    } finally {
      this.activeSyncs.delete(sourceId);
    }
  }

  /**
   * Sync all sources for a tenant
   * @param {number} tenantId - Tenant ID
   * @returns {Promise<Object>} Sync results
   */
  async syncTenant(tenantId) {
    try {
      logger.info('[DataSync] Starting tenant sync', { tenantId });

      // Fetch all sources for tenant
      const sourcesResult = await query(
        `SELECT id FROM sl_sources
         WHERE tenant_id = $1 AND status != 'error'
         ORDER BY last_sync_at ASC NULLS FIRST`,
        [tenantId]
      );

      const sources = sourcesResult.rows;

      if (sources.length === 0) {
        return {
          success: true,
          tenantId,
          sourcesSynced: 0,
          message: 'No sources to sync'
        };
      }

      // Sync each source
      const results = [];
      for (const source of sources) {
        const result = await this.syncSource(source.id);
        results.push(result);
      }

      const summary = {
        success: true,
        tenantId,
        sourcesSynced: results.filter(r => r.success).length,
        sourcesFailed: results.filter(r => !r.success).length,
        totalMentionsFetched: results.reduce((sum, r) => sum + (r.mentionsFetched || 0), 0),
        totalMentionsSaved: results.reduce((sum, r) => sum + (r.mentionsSaved || 0), 0),
        results
      };

      logger.info('[DataSync] Tenant sync complete', summary);

      return summary;

    } catch (error) {
      logger.error('[DataSync] Tenant sync failed', {
        tenantId,
        error: error.message
      });

      return {
        success: false,
        tenantId,
        error: error.message
      };
    }
  }

  /**
   * Sync all sources that are due for sync
   * @returns {Promise<Object>} Sync results
   */
  async syncDueSources() {
    try {
      logger.info('[DataSync] Starting scheduled sync');

      // Load tenant settings for auto-sync configuration
      const settingsResult = await query('SELECT key, value FROM settings');
      const settings = {};
      settingsResult.rows.forEach(row => {
        settings[row.key] = row.value;
      });

      // Check if auto-sync is enabled globally
      if (settings.sl_auto_sync_enabled === 'false') {
        logger.debug('[DataSync] Auto-sync disabled in settings, skipping');
        return {
          success: true,
          sourcesSynced: 0,
          message: 'Auto-sync disabled'
        };
      }

      // Get platform filter from settings
      const enabledPlatforms = settings.sl_sync_platforms
        ? settings.sl_sync_platforms.split(',').filter(Boolean)
        : null; // null = all platforms

      // Find sources due for sync
      let queryStr = `SELECT id, tenant_id, platform, name, sync_interval_minutes, last_sync_at
         FROM sl_sources
         WHERE status = 'connected'`;

      // Add platform filter if specified
      if (enabledPlatforms && enabledPlatforms.length > 0) {
        queryStr += ` AND platform = ANY($1)`;
      }

      queryStr += ` AND (
             last_sync_at IS NULL
             OR last_sync_at < NOW() - (sync_interval_minutes || ' minutes')::INTERVAL
           )
         ORDER BY last_sync_at ASC NULLS FIRST
         LIMIT 50`; // Safety limit

      const queryParams = enabledPlatforms && enabledPlatforms.length > 0
        ? [enabledPlatforms]
        : [];

      const sourcesResult = await query(queryStr, queryParams);
      const sources = sourcesResult.rows;

      if (sources.length === 0) {
        logger.debug('[DataSync] No sources due for sync');
        return {
          success: true,
          sourcesSynced: 0,
          message: 'No sources due for sync'
        };
      }

      logger.info('[DataSync] Found sources due for sync', { count: sources.length });

      // Sync each source
      const results = [];
      for (const source of sources) {
        const result = await this.syncSource(source.id);
        results.push(result);
      }

      const summary = {
        success: true,
        sourcesSynced: results.filter(r => r.success).length,
        sourcesFailed: results.filter(r => !r.success).length,
        totalMentionsFetched: results.reduce((sum, r) => sum + (r.mentionsFetched || 0), 0),
        totalMentionsSaved: results.reduce((sum, r) => sum + (r.mentionsSaved || 0), 0),
        syncedAt: new Date()
      };

      logger.info('[DataSync] Scheduled sync complete', summary);

      return summary;

    } catch (error) {
      logger.error('[DataSync] Scheduled sync failed', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trigger AI processing for new mentions (async, non-blocking)
   * @param {number} tenantId - Tenant ID
   * @param {number} count - Number of new mentions
   */
  triggerAIProcessing(tenantId, count) {
    logger.info('[DataSync] Triggering AI processing', { tenantId, count });

    // Run AI processing in background (don't await)
    SocialListeningAI.processUnprocessedMentions(tenantId, count)
      .then(result => {
        logger.info('[DataSync] AI processing completed', {
          tenantId,
          ...result
        });
      })
      .catch(error => {
        logger.error('[DataSync] AI processing failed', {
          tenantId,
          error: error.message
        });
      });
  }

  /**
   * Get sync status for a source
   * @param {string} sourceId - Source UUID
   * @returns {Object} Sync status
   */
  getSyncStatus(sourceId) {
    if (this.activeSyncs.has(sourceId)) {
      const sync = this.activeSyncs.get(sourceId);
      return {
        syncing: true,
        startedAt: sync.startedAt,
        duration: Date.now() - sync.startedAt.getTime()
      };
    }

    return { syncing: false };
  }

  /**
   * Get all active syncs
   * @returns {Array<Object>} Active syncs
   */
  getActiveSyncs() {
    return Array.from(this.activeSyncs.entries()).map(([sourceId, sync]) => ({
      sourceId,
      startedAt: sync.startedAt,
      duration: Date.now() - sync.startedAt.getTime()
    }));
  }
}

// Export singleton instance
module.exports = new DataSyncService();
