/**
 * Social Listening AI Processing API Routes
 *
 * Endpoints for managing AI processing of mentions
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const SocialListeningAI = require('../../../services/ai/SocialListeningAI');
const socialListeningProcessor = require('../../../jobs/socialListeningProcessor');
const logger = require('../../../infrastructure/logger');

/**
 * @route   POST /api/v1/social-listening/ai/process-mention
 * @desc    Process a single mention with AI
 * @access  Private
 */
router.post('/process-mention', authenticate, async (req, res) => {
  try {
    const { mentionId } = req.body;
    const tenantId = req.user.tenant_id;

    if (!mentionId) {
      return res.status(400).json({ error: 'Mention ID is required' });
    }

    // Fetch mention
    const { query } = require('../../../infrastructure/database/db');
    const result = await query(
      'SELECT id, content, tenant_id FROM sl_mentions WHERE id = $1 AND tenant_id = $2',
      [mentionId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mention not found' });
    }

    // Process with AI
    const aiResult = await SocialListeningAI.processMention(result.rows[0]);

    logger.info('[AI API] Mention processed', {
      mentionId,
      tenantId,
      sentiment: aiResult.sentiment,
      intent: aiResult.intent
    });

    res.json({
      success: true,
      mentionId,
      aiAnalysis: aiResult
    });

  } catch (error) {
    logger.error('[AI API] Failed to process mention', { error: error.message });
    res.status(500).json({ error: 'Failed to process mention: ' + error.message });
  }
});

/**
 * @route   POST /api/v1/social-listening/ai/process-batch
 * @desc    Process unprocessed mentions for current tenant
 * @access  Private
 */
router.post('/process-batch', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { limit = 50 } = req.body;

    logger.info('[AI API] Processing batch for tenant', { tenantId, limit });

    const result = await SocialListeningAI.processUnprocessedMentions(tenantId, limit);

    res.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Processed ${result.processed} mentions${result.errors > 0 ? `, ${result.errors} failed` : ''}`
    });

  } catch (error) {
    logger.error('[AI API] Failed to process batch', { error: error.message });
    res.status(500).json({ error: 'Failed to process batch: ' + error.message });
  }
});

/**
 * @route   POST /api/v1/social-listening/ai/reprocess
 * @desc    Reprocess existing mentions (for AI model updates)
 * @access  Private
 */
router.post('/reprocess', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { platform, date_from, date_to } = req.body;

    logger.info('[AI API] Reprocessing mentions', {
      tenantId,
      platform,
      date_from,
      date_to
    });

    const result = await SocialListeningAI.reprocessMentions(tenantId, {
      platform,
      date_from,
      date_to
    });

    res.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Reprocessed ${result.processed} mentions${result.errors > 0 ? `, ${result.errors} failed` : ''}`
    });

  } catch (error) {
    logger.error('[AI API] Failed to reprocess', { error: error.message });
    res.status(500).json({ error: 'Failed to reprocess: ' + error.message });
  }
});

/**
 * @route   GET /api/v1/social-listening/ai/stats
 * @desc    Get AI processing statistics
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const stats = await SocialListeningAI.getProcessingStats(tenantId);

    res.json({
      success: true,
      stats: {
        totalMentions: parseInt(stats.total_mentions),
        processedMentions: parseInt(stats.processed_mentions),
        unprocessedMentions: parseInt(stats.unprocessed_mentions),
        positiveCount: parseInt(stats.positive_count),
        negativeCount: parseInt(stats.negative_count),
        neutralCount: parseInt(stats.neutral_count),
        avgSentimentScore: parseFloat(stats.avg_sentiment_score || 0).toFixed(3),
        uniqueIntents: parseInt(stats.unique_intents),
        uniqueLanguages: parseInt(stats.unique_languages)
      }
    });

  } catch (error) {
    logger.error('[AI API] Failed to get stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get stats: ' + error.message });
  }
});

/**
 * @route   GET /api/v1/social-listening/ai/processor-status
 * @desc    Get background processor status
 * @access  Private
 */
router.get('/processor-status', authenticate, async (req, res) => {
  try {
    const status = socialListeningProcessor.getStatus();
    const unprocessedCounts = await socialListeningProcessor.getUnprocessedCounts();

    res.json({
      success: true,
      processor: status,
      unprocessedByTenant: unprocessedCounts
    });

  } catch (error) {
    logger.error('[AI API] Failed to get processor status', { error: error.message });
    res.status(500).json({ error: 'Failed to get status: ' + error.message });
  }
});

/**
 * @route   POST /api/v1/social-listening/ai/trigger-processor
 * @desc    Manually trigger background processor for current tenant
 * @access  Private
 */
router.post('/trigger-processor', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { limit = 100 } = req.body;

    logger.info('[AI API] Manually triggering processor', { tenantId, limit });

    // Run processor in background (don't await)
    socialListeningProcessor.processTenant(tenantId, limit)
      .then(result => {
        logger.info('[AI API] Processor completed', { tenantId, ...result });
      })
      .catch(error => {
        logger.error('[AI API] Processor failed', { tenantId, error: error.message });
      });

    res.json({
      success: true,
      message: 'AI processor triggered. Check status endpoint for progress.'
    });

  } catch (error) {
    logger.error('[AI API] Failed to trigger processor', { error: error.message });
    res.status(500).json({ error: 'Failed to trigger processor: ' + error.message });
  }
});

module.exports = router;
