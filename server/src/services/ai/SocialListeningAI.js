/**
 * Social Listening AI Processor
 *
 * Main orchestrator for all AI services
 * Processes mentions through the complete AI pipeline:
 * 1. Sentiment Analysis
 * 2. Intent Classification
 * 3. Topic Extraction
 * 4. Entity Extraction
 * 5. Language Detection
 */

const SentimentAnalyzer = require('./SentimentAnalyzer');
const IntentClassifier = require('./IntentClassifier');
const TopicClusterer = require('./TopicClusterer');
const EntityExtractor = require('./EntityExtractor');
const LanguageDetector = require('./LanguageDetector');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

class SocialListeningAI {
  constructor() {
    this.services = {
      sentiment: SentimentAnalyzer,
      intent: IntentClassifier,
      topics: TopicClusterer,
      entities: EntityExtractor,
      language: LanguageDetector
    };
  }

  /**
   * Process a single mention through the full AI pipeline
   * @param {Object} mention - Mention object with { id, content, tenant_id }
   * @returns {Promise<Object>} AI analysis results
   */
  async processMention(mention) {
    const startTime = Date.now();

    try {
      if (!mention || !mention.content) {
        throw new Error('Invalid mention: content is required');
      }

      logger.info('[SocialListeningAI] Processing mention', {
        mentionId: mention.id,
        contentLength: mention.content.length
      });

      // Run all AI services in parallel for speed
      const [
        sentimentResult,
        intentResult,
        topicsResult,
        entitiesResult,
        languageResult
      ] = await Promise.all([
        this.services.sentiment.analyze(mention.content),
        this.services.intent.classify(mention.content),
        this.services.topics.extractTopics(mention.content),
        this.services.entities.extract(mention.content),
        this.services.language.detect(mention.content)
      ]);

      // Aggregate results
      const aiAnalysis = {
        // Sentiment
        sentiment: sentimentResult.sentiment,
        sentiment_score: sentimentResult.score,
        sentiment_confidence: sentimentResult.confidence,

        // Intent
        intent: intentResult.intent,
        intent_confidence: intentResult.confidence,
        sub_intents: intentResult.subIntents,

        // Topics
        topics: topicsResult.topics.map(t => t.name),
        keywords: topicsResult.keywords,
        themes: topicsResult.themes,

        // Entities
        entities: {
          people: entitiesResult.people,
          organizations: entitiesResult.organizations,
          locations: entitiesResult.locations,
          products: entitiesResult.products,
          hashtags: entitiesResult.hashtags,
          mentions: entitiesResult.mentions
        },

        // Language
        language: languageResult.language,
        language_confidence: languageResult.confidence,

        // Metadata
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      };

      // Update mention in database with AI results
      if (mention.id) {
        await this._updateMentionWithAI(mention.id, aiAnalysis);

        // Check alert rules after AI processing (async, non-blocking)
        this._checkAlertsForMention(mention, aiAnalysis).catch(err => {
          logger.error('[SocialListeningAI] Alert checking failed', {
            mentionId: mention.id,
            error: err.message
          });
        });
      }

      logger.info('[SocialListeningAI] Mention processed successfully', {
        mentionId: mention.id,
        processingTimeMs: aiAnalysis.processing_time_ms,
        sentiment: aiAnalysis.sentiment,
        intent: aiAnalysis.intent,
        language: aiAnalysis.language
      });

      return aiAnalysis;

    } catch (error) {
      logger.error('[SocialListeningAI] Processing failed', {
        mentionId: mention.id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Process multiple mentions in batch
   * @param {Array<Object>} mentions - Array of mention objects
   * @returns {Promise<Array<Object>>} Array of AI analysis results
   */
  async processMentionsBatch(mentions) {
    logger.info('[SocialListeningAI] Processing batch', { count: mentions.length });

    const results = [];
    const errors = [];

    for (const mention of mentions) {
      try {
        const result = await this.processMention(mention);
        results.push({ mentionId: mention.id, success: true, result });
      } catch (error) {
        errors.push({ mentionId: mention.id, success: false, error: error.message });
      }
    }

    logger.info('[SocialListeningAI] Batch processing complete', {
      total: mentions.length,
      successful: results.length,
      failed: errors.length
    });

    return { results, errors };
  }

  /**
   * Process all unprocessed mentions for a tenant
   * @param {number} tenantId - Tenant ID
   * @param {number} limit - Max number of mentions to process (default: 100)
   * @returns {Promise<Object>} Processing results
   */
  async processUnprocessedMentions(tenantId, limit = 100) {
    try {
      logger.info('[SocialListeningAI] Processing unprocessed mentions', { tenantId, limit });

      // Fetch unprocessed mentions
      const result = await query(
        `SELECT id, content, tenant_id, platform, author_name
         FROM sl_mentions
         WHERE tenant_id = $1
           AND (sentiment IS NULL OR intent IS NULL)
         ORDER BY published_at DESC
         LIMIT $2`,
        [tenantId, limit]
      );

      if (result.rows.length === 0) {
        logger.info('[SocialListeningAI] No unprocessed mentions found', { tenantId });
        return { processed: 0, errors: 0 };
      }

      // Process batch
      const batchResult = await this.processMentionsBatch(result.rows);

      return {
        processed: batchResult.results.length,
        errors: batchResult.errors.length,
        details: batchResult
      };

    } catch (error) {
      logger.error('[SocialListeningAI] Batch processing failed', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update mention with AI analysis results
   * @param {string} mentionId - Mention UUID
   * @param {Object} aiAnalysis - AI analysis results
   * @returns {Promise<void>}
   */
  async _updateMentionWithAI(mentionId, aiAnalysis) {
    try {
      await query(
        `UPDATE sl_mentions
         SET sentiment = $1,
             sentiment_score = $2,
             intent = $3,
             topics = $4,
             keywords = $5,
             entities = $6,
             language = $7,
             ai_processed_at = NOW(),
             updated_at = NOW()
         WHERE id = $8`,
        [
          aiAnalysis.sentiment,
          aiAnalysis.sentiment_score,
          aiAnalysis.intent,
          JSON.stringify(aiAnalysis.topics),
          JSON.stringify(aiAnalysis.keywords),
          JSON.stringify(aiAnalysis.entities),
          aiAnalysis.language,
          mentionId
        ]
      );

      logger.debug('[SocialListeningAI] Mention updated with AI results', { mentionId });

    } catch (error) {
      logger.error('[SocialListeningAI] Failed to update mention', {
        mentionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get processing statistics
   * @param {number} tenantId - Tenant ID
   * @returns {Promise<Object>} Statistics
   */
  async getProcessingStats(tenantId) {
    try {
      const result = await query(
        `SELECT
           COUNT(*) as total_mentions,
           COUNT(sentiment) as processed_mentions,
           COUNT(*) - COUNT(sentiment) as unprocessed_mentions,
           COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive_count,
           COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_count,
           COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral_count,
           AVG(sentiment_score) as avg_sentiment_score,
           COUNT(DISTINCT intent) as unique_intents,
           COUNT(DISTINCT language) as unique_languages
         FROM sl_mentions
         WHERE tenant_id = $1`,
        [tenantId]
      );

      return result.rows[0];

    } catch (error) {
      logger.error('[SocialListeningAI] Failed to get stats', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Reprocess mentions (useful after AI model updates)
   * @param {number} tenantId - Tenant ID
   * @param {Object} filters - Filters (platform, date range, etc.)
   * @returns {Promise<Object>} Reprocessing results
   */
  async reprocessMentions(tenantId, filters = {}) {
    try {
      logger.info('[SocialListeningAI] Reprocessing mentions', { tenantId, filters });

      let sql = 'SELECT id, content, tenant_id FROM sl_mentions WHERE tenant_id = $1';
      const params = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (filters.platform) {
        sql += ` AND platform = $${paramIndex}`;
        params.push(filters.platform);
        paramIndex++;
      }

      if (filters.date_from) {
        sql += ` AND published_at >= $${paramIndex}`;
        params.push(filters.date_from);
        paramIndex++;
      }

      if (filters.date_to) {
        sql += ` AND published_at <= $${paramIndex}`;
        params.push(filters.date_to);
        paramIndex++;
      }

      sql += ' ORDER BY published_at DESC LIMIT 1000'; // Safety limit

      const result = await query(sql, params);

      if (result.rows.length === 0) {
        return { processed: 0, errors: 0 };
      }

      // Process batch
      const batchResult = await this.processMentionsBatch(result.rows);

      logger.info('[SocialListeningAI] Reprocessing complete', {
        tenantId,
        processed: batchResult.results.length,
        errors: batchResult.errors.length
      });

      return {
        processed: batchResult.results.length,
        errors: batchResult.errors.length
      };

    } catch (error) {
      logger.error('[SocialListeningAI] Reprocessing failed', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check alert rules for a processed mention
   * @param {Object} mention - Original mention object
   * @param {Object} aiAnalysis - AI analysis results
   * @returns {Promise<void>}
   */
  async _checkAlertsForMention(mention, aiAnalysis) {
    try {
      // Fetch the full mention with AI analysis
      const mentionResult = await query(
        'SELECT * FROM sl_mentions WHERE id = $1',
        [mention.id]
      );

      if (mentionResult.rows.length === 0) {
        return;
      }

      const fullMention = mentionResult.rows[0];

      // Check alert rules
      const AlertEngine = require('../AlertEngine');
      const triggeredAlerts = await AlertEngine.checkMentionAgainstRules(fullMention);

      if (triggeredAlerts.length > 0) {
        logger.info('[SocialListeningAI] Alerts triggered for mention', {
          mentionId: mention.id,
          alertCount: triggeredAlerts.length
        });
      }

    } catch (error) {
      logger.error('[SocialListeningAI] Alert checking failed', {
        mentionId: mention.id,
        error: error.message
      });
      // Don't throw - alert checking should not block AI processing
    }
  }
}

module.exports = new SocialListeningAI();
