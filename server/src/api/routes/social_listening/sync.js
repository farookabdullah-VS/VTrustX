/**
 * Data Sync API Routes
 *
 * Endpoints for managing data synchronization from social media platforms
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const DataSyncService = require('../../../services/DataSyncService');
const dataSyncScheduler = require('../../../jobs/dataSyncScheduler');
const ConnectorFactory = require('../../../services/connectors/ConnectorFactory');
const { query } = require('../../../infrastructure/database/db');
const logger = require('../../../infrastructure/logger');

/**
 * @route   POST /api/v1/social-listening/sync/source/:sourceId
 * @desc    Manually sync a specific source
 * @access  Private
 */
router.post('/source/:sourceId', authenticate, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const tenantId = req.user.tenant_id;

    // Verify source belongs to tenant
    const sourceCheck = await query(
      'SELECT id FROM sl_sources WHERE id = $1 AND tenant_id = $2',
      [sourceId, tenantId]
    );

    if (sourceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    logger.info('[Sync API] Manual source sync requested', {
      sourceId,
      tenantId,
      userId: req.user.id
    });

    // Trigger sync (run in background)
    DataSyncService.syncSource(sourceId)
      .then(result => {
        logger.info('[Sync API] Source sync completed', { sourceId, ...result });
      })
      .catch(error => {
        logger.error('[Sync API] Source sync failed', { sourceId, error: error.message });
      });

    res.json({
      success: true,
      message: 'Sync started. Check source status for progress.'
    });

  } catch (error) {
    logger.error('[Sync API] Failed to start source sync', { error: error.message });
    res.status(500).json({ error: 'Failed to start sync: ' + error.message });
  }
});

/**
 * @route   POST /api/v1/social-listening/sync/tenant
 * @desc    Sync all sources for current tenant
 * @access  Private
 */
router.post('/tenant', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    logger.info('[Sync API] Manual tenant sync requested', {
      tenantId,
      userId: req.user.id
    });

    // Trigger sync (run in background)
    DataSyncService.syncTenant(tenantId)
      .then(result => {
        logger.info('[Sync API] Tenant sync completed', { tenantId, ...result });
      })
      .catch(error => {
        logger.error('[Sync API] Tenant sync failed', { tenantId, error: error.message });
      });

    res.json({
      success: true,
      message: 'Tenant sync started. Check sources for progress.'
    });

  } catch (error) {
    logger.error('[Sync API] Failed to start tenant sync', { error: error.message });
    res.status(500).json({ error: 'Failed to start sync: ' + error.message });
  }
});

/**
 * @route   GET /api/v1/social-listening/sync/status/:sourceId
 * @desc    Get sync status for a source
 * @access  Private
 */
router.get('/status/:sourceId', authenticate, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const tenantId = req.user.tenant_id;

    // Verify source belongs to tenant
    const sourceResult = await query(
      `SELECT id, platform, status, last_sync_at, sync_interval_minutes,
              rate_limit_remaining, rate_limit_reset_at, error_message
       FROM sl_sources
       WHERE id = $1 AND tenant_id = $2`,
      [sourceId, tenantId]
    );

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const source = sourceResult.rows[0];
    const syncStatus = DataSyncService.getSyncStatus(sourceId);

    // Get mention count
    const mentionCount = await query(
      'SELECT COUNT(*) as count FROM sl_mentions WHERE source_id = $1',
      [sourceId]
    );

    res.json({
      success: true,
      source: {
        id: source.id,
        platform: source.platform,
        status: source.status,
        lastSyncAt: source.last_sync_at,
        syncIntervalMinutes: source.sync_interval_minutes,
        errorMessage: source.error_message
      },
      sync: syncStatus,
      rateLimit: {
        remaining: source.rate_limit_remaining,
        resetAt: source.rate_limit_reset_at
      },
      stats: {
        totalMentions: parseInt(mentionCount.rows[0].count)
      }
    });

  } catch (error) {
    logger.error('[Sync API] Failed to get sync status', { error: error.message });
    res.status(500).json({ error: 'Failed to get status: ' + error.message });
  }
});

/**
 * @route   GET /api/v1/social-listening/sync/scheduler-status
 * @desc    Get data sync scheduler status
 * @access  Private
 */
router.get('/scheduler-status', authenticate, async (req, res) => {
  try {
    const status = dataSyncScheduler.getStatus();

    res.json({
      success: true,
      scheduler: status
    });

  } catch (error) {
    logger.error('[Sync API] Failed to get scheduler status', { error: error.message });
    res.status(500).json({ error: 'Failed to get status: ' + error.message });
  }
});

/**
 * @route   GET /api/v1/social-listening/sync/platforms
 * @desc    Get list of supported platforms
 * @access  Private
 */
router.get('/platforms', authenticate, async (req, res) => {
  try {
    const platforms = ConnectorFactory.getSupportedPlatforms();

    res.json({
      success: true,
      platforms
    });

  } catch (error) {
    logger.error('[Sync API] Failed to get platforms', { error: error.message });
    res.status(500).json({ error: 'Failed to get platforms: ' + error.message });
  }
});

/**
 * @route   POST /api/v1/social-listening/sync/analytics
 * @desc    Manually trigger analytics computation (trend detection, influencer scoring, share-of-voice)
 * @access  Private
 */
router.post('/analytics', authenticate, async (req, res) => {
  try {
    let slAnalyticsJob;
    try {
      slAnalyticsJob = require('../../../jobs/socialListeningAnalyticsJob');
    } catch (e) {
      return res.status(503).json({ error: 'Analytics job not available' });
    }

    logger.info('[Sync API] Manual analytics computation triggered', {
      tenantId: req.user.tenant_id,
      userId: req.user.id
    });

    // Run in background — respond immediately
    slAnalyticsJob.runNow()
      .then(result => {
        logger.info('[Sync API] Analytics computation completed', result);
      })
      .catch(err => {
        logger.error('[Sync API] Analytics computation failed', { error: err.message });
      });

    res.json({
      success: true,
      message: 'Analytics computation started. Results will be available shortly.'
    });

  } catch (error) {
    logger.error('[Sync API] Failed to trigger analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to trigger analytics: ' + error.message });
  }
});

/**
 * @route   GET /api/v1/social-listening/sync/analytics-status
 * @desc    Get analytics job status
 * @access  Private
 */
router.get('/analytics-status', authenticate, async (req, res) => {
  try {
    let slAnalyticsJob;
    try {
      slAnalyticsJob = require('../../../jobs/socialListeningAnalyticsJob');
    } catch (e) {
      return res.json({ success: true, available: false });
    }

    res.json({
      success: true,
      available: true,
      ...slAnalyticsJob.getStatus()
    });

  } catch (error) {
    logger.error('[Sync API] Failed to get analytics status', { error: error.message });
    res.status(500).json({ error: 'Failed to get analytics status: ' + error.message });
  }
});

/**
 * @route   POST /api/v1/social-listening/sync/generate-mock-data
 * @desc    Generate mock mentions for testing (DEVELOPMENT ONLY)
 * @access  Private
 */
router.post('/generate-mock-data', authenticate, async (req, res) => {
  try {
    const { sourceId, count = 10 } = req.body;
    const tenantId = req.user.tenant_id;

    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Mock data generation not allowed in production' });
    }

    if (!sourceId) {
      return res.status(400).json({ error: 'sourceId is required' });
    }

    // Verify source
    const sourceCheck = await query(
      'SELECT id, platform FROM sl_sources WHERE id = $1 AND tenant_id = $2',
      [sourceId, tenantId]
    );

    if (sourceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const source = sourceCheck.rows[0];

    logger.info('[Sync API] Generating mock data', {
      sourceId,
      count,
      tenantId
    });

    // Generate mock mentions
    const mockMentions = generateMockMentions(source, tenantId, Math.min(count, 50));

    // Save to database
    let saved = 0;
    for (const mention of mockMentions) {
      try {
        await query(
          `INSERT INTO sl_mentions (
            tenant_id, source_id, platform, external_id, url, content,
            author_name, author_handle, author_followers, published_at,
            likes_count, comments_count, shares_count, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            mention.tenant_id, mention.source_id, mention.platform, mention.external_id,
            mention.url, mention.content, mention.author_name, mention.author_handle,
            mention.author_followers, mention.published_at, mention.likes_count,
            mention.comments_count, mention.shares_count, mention.status
          ]
        );
        saved++;
      } catch (err) {
        // Skip duplicates
        if (!err.message.includes('duplicate')) {
          logger.error('[Sync API] Failed to save mock mention', { error: err.message });
        }
      }
    }

    logger.info('[Sync API] Mock data generated', { saved });

    res.json({
      success: true,
      generated: mockMentions.length,
      saved,
      message: `Generated ${saved} mock mentions`
    });

  } catch (error) {
    logger.error('[Sync API] Failed to generate mock data', { error: error.message });
    res.status(500).json({ error: 'Failed to generate mock data: ' + error.message });
  }
});

/**
 * Generate mock mentions for testing
 */
function generateMockMentions(source, tenantId, count) {
  const sentiments = [
    { type: 'positive', templates: [
      'I love {brand}! Best product ever! 😍',
      '{brand} is amazing! Highly recommend it to everyone.',
      'Just tried {brand} and I\'m blown away. Fantastic!',
      'Great experience with {brand}. Customer service was excellent! 👍',
      'Been using {brand} for a month now. Absolutely love it!'
    ]},
    { type: 'negative', templates: [
      '{brand} is terrible. Very disappointed. 😠',
      'I hate {brand}. Worst experience ever.',
      'Don\'t waste your money on {brand}. It\'s broken.',
      '{brand} customer support is useless. Still waiting for help.',
      'Frustrated with {brand}. Nothing works as expected. 👎'
    ]},
    { type: 'neutral', templates: [
      'Has anyone tried {brand}? What do you think?',
      'Looking for reviews of {brand}. Any recommendations?',
      'How does {brand} compare to competitors?',
      'What are the main features of {brand}?',
      'Is {brand} worth the price?'
    ]}
  ];

  const authors = [
    'John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emily Brown', 'David Lee',
    'Lisa Garcia', 'Tom Anderson', 'Jennifer Martinez', 'Chris Taylor', 'Amanda White'
  ];

  const mentions = [];
  const brand = 'YourBrand'; // Placeholder

  for (let i = 0; i < count; i++) {
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const template = sentiment.templates[Math.floor(Math.random() * sentiment.templates.length)];
    const content = template.replace('{brand}', brand);
    const author = authors[Math.floor(Math.random() * authors.length)];
    const authorHandle = author.toLowerCase().replace(' ', '');

    // Random date within last 7 days
    const daysAgo = Math.floor(Math.random() * 7);
    const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    mentions.push({
      tenant_id: tenantId,
      source_id: source.id,
      platform: source.platform,
      external_id: `mock-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
      url: `https://${source.platform}.com/status/mock-${i}`,
      content,
      author_name: author,
      author_handle: authorHandle,
      author_followers: Math.floor(Math.random() * 10000),
      published_at: publishedAt,
      likes_count: Math.floor(Math.random() * 100),
      comments_count: Math.floor(Math.random() * 50),
      shares_count: Math.floor(Math.random() * 20),
      status: 'new'
    });
  }

  return mentions;
}

module.exports = router;
