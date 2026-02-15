/**
 * Crisis Detection Engine
 *
 * AI-powered early warning system for brand crises
 * Detects potential PR crises before they escalate
 */

const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

class CrisisDetector {
  constructor() {
    // Crisis severity thresholds
    this.thresholds = {
      volume: {
        warning: 2.0,  // 200% increase
        critical: 5.0   // 500% increase
      },
      sentiment: {
        warning: -0.3,   // Average sentiment below -0.3
        critical: -0.6   // Average sentiment below -0.6
      },
      negativeMentions: {
        warning: 10,     // 10+ negative mentions in hour
        critical: 50     // 50+ negative mentions in hour
      },
      influencerInvolvement: {
        warning: 5000,   // Influencer with 5k+ followers
        critical: 50000  // Influencer with 50k+ followers
      }
    };

    // Crisis types
    this.crisisTypes = {
      PR_NEGATIVE: 'pr_negative',
      PRODUCT_ISSUE: 'product_issue',
      SERVICE_OUTAGE: 'service_outage',
      SECURITY_BREACH: 'security_breach',
      LEGAL_ISSUE: 'legal_issue',
      EXECUTIVE_CONTROVERSY: 'executive_controversy',
      VIRAL_NEGATIVE: 'viral_negative'
    };
  }

  /**
   * Analyze current brand mentions for crisis indicators
   * @param {number} tenantId - Tenant ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Crisis analysis result
   */
  async analyzeCrisisRisk(tenantId, options = {}) {
    try {
      const timeWindow = options.timeWindow || 60; // minutes
      const compareWindow = options.compareWindow || 1440; // 24 hours for baseline

      logger.info('[CrisisDetector] Analyzing crisis risk', { tenantId, timeWindow });

      // Get current period metrics
      const currentMetrics = await this._getCurrentMetrics(tenantId, timeWindow);

      // Get baseline metrics for comparison
      const baselineMetrics = await this._getBaselineMetrics(tenantId, compareWindow);

      // Calculate anomaly scores
      const volumeAnomaly = this._calculateVolumeAnomaly(currentMetrics, baselineMetrics);
      const sentimentAnomaly = this._calculateSentimentAnomaly(currentMetrics);
      const influencerRisk = this._calculateInfluencerRisk(currentMetrics);
      const velocityScore = this._calculateVelocityScore(tenantId, timeWindow);

      // Calculate overall crisis score (0-100)
      const crisisScore = await this._calculateCrisisScore({
        volumeAnomaly,
        sentimentAnomaly,
        influencerRisk,
        velocityScore,
        currentMetrics
      });

      // Determine crisis level
      const crisisLevel = this._determineCrisisLevel(crisisScore);

      // Detect crisis type
      const crisisType = await this._detectCrisisType(tenantId, currentMetrics);

      // Generate recommended actions
      const recommendedActions = this._generateRecommendedActions(crisisScore, crisisType, crisisLevel);

      // Get top concerning mentions
      const concerningMentions = await this._getConcerningMentions(tenantId, timeWindow);

      const result = {
        crisisScore,
        crisisLevel,
        crisisType,
        indicators: {
          volumeAnomaly: {
            score: volumeAnomaly,
            current: currentMetrics.mentionCount,
            baseline: baselineMetrics.avgMentionCount,
            percentageChange: ((currentMetrics.mentionCount - baselineMetrics.avgMentionCount) / baselineMetrics.avgMentionCount * 100).toFixed(1)
          },
          sentimentAnomaly: {
            score: sentimentAnomaly,
            current: currentMetrics.avgSentiment,
            trend: currentMetrics.avgSentiment < -0.3 ? 'declining' : currentMetrics.avgSentiment > 0.3 ? 'improving' : 'neutral'
          },
          influencerRisk: {
            score: influencerRisk,
            influencerCount: currentMetrics.influencerMentions || 0
          },
          velocityScore: {
            score: velocityScore,
            description: velocityScore > 80 ? 'Rapid acceleration' : velocityScore > 50 ? 'Increasing momentum' : 'Normal'
          }
        },
        metrics: {
          negativeMentionRate: currentMetrics.negativeMentionRate,
          totalMentions: currentMetrics.mentionCount,
          avgEngagement: currentMetrics.avgEngagement,
          timeWindow: `${timeWindow} minutes`
        },
        recommendedActions,
        concerningMentions: concerningMentions.slice(0, 5), // Top 5
        timestamp: new Date().toISOString(),
        shouldAlert: crisisLevel !== 'normal'
      };

      // If crisis detected, log event
      if (crisisLevel !== 'normal') {
        await this._logCrisisEvent(tenantId, result);
      }

      logger.info('[CrisisDetector] Analysis complete', {
        tenantId,
        crisisScore,
        crisisLevel,
        shouldAlert: result.shouldAlert
      });

      return result;

    } catch (error) {
      logger.error('[CrisisDetector] Analysis failed', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get metrics for current time window
   */
  async _getCurrentMetrics(tenantId, timeWindowMinutes) {
    const result = await query(
      `SELECT
         COUNT(*) as mention_count,
         AVG(CASE
           WHEN sentiment_score IS NOT NULL THEN sentiment_score
           ELSE 0
         END) as avg_sentiment,
         COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_count,
         COUNT(CASE WHEN sentiment = 'negative' THEN 1 END)::float / NULLIF(COUNT(*), 0) as negative_mention_rate,
         AVG(engagement_count) as avg_engagement,
         COUNT(CASE WHEN reach_estimate > 5000 THEN 1 END) as influencer_mentions
       FROM sl_mentions
       WHERE tenant_id = $1
         AND published_at >= NOW() - INTERVAL '${timeWindowMinutes} minutes'`,
      [tenantId]
    );

    return {
      mentionCount: parseInt(result.rows[0].mention_count) || 0,
      avgSentiment: parseFloat(result.rows[0].avg_sentiment) || 0,
      negativeCount: parseInt(result.rows[0].negative_count) || 0,
      negativeMentionRate: parseFloat(result.rows[0].negative_mention_rate) || 0,
      avgEngagement: parseFloat(result.rows[0].avg_engagement) || 0,
      influencerMentions: parseInt(result.rows[0].influencer_mentions) || 0
    };
  }

  /**
   * Get baseline metrics for comparison
   */
  async _getBaselineMetrics(tenantId, compareWindowMinutes) {
    const result = await query(
      `SELECT
         AVG(hourly_count) as avg_mention_count,
         AVG(hourly_sentiment) as avg_sentiment
       FROM (
         SELECT
           date_trunc('hour', published_at) as hour,
           COUNT(*) as hourly_count,
           AVG(sentiment_score) as hourly_sentiment
         FROM sl_mentions
         WHERE tenant_id = $1
           AND published_at >= NOW() - INTERVAL '${compareWindowMinutes} minutes'
           AND published_at < NOW() - INTERVAL '60 minutes'
         GROUP BY date_trunc('hour', published_at)
       ) hourly_data`,
      [tenantId]
    );

    return {
      avgMentionCount: parseFloat(result.rows[0].avg_mention_count) || 1, // Avoid divide by zero
      avgSentiment: parseFloat(result.rows[0].avg_sentiment) || 0
    };
  }

  /**
   * Calculate volume anomaly score (0-100)
   */
  _calculateVolumeAnomaly(current, baseline) {
    if (baseline.avgMentionCount === 0) return 0;

    const ratio = current.mentionCount / baseline.avgMentionCount;

    if (ratio >= this.thresholds.volume.critical) {
      return 100;
    } else if (ratio >= this.thresholds.volume.warning) {
      // Scale between 50-100
      return 50 + ((ratio - this.thresholds.volume.warning) / (this.thresholds.volume.critical - this.thresholds.volume.warning)) * 50;
    } else if (ratio > 1.0) {
      // Scale between 0-50
      return (ratio - 1.0) / (this.thresholds.volume.warning - 1.0) * 50;
    }

    return 0;
  }

  /**
   * Calculate sentiment anomaly score (0-100)
   */
  _calculateSentimentAnomaly(current) {
    const sentiment = current.avgSentiment;

    if (sentiment <= this.thresholds.sentiment.critical) {
      return 100;
    } else if (sentiment <= this.thresholds.sentiment.warning) {
      // Scale between 50-100
      return 50 + (Math.abs(sentiment - this.thresholds.sentiment.warning) / Math.abs(this.thresholds.sentiment.critical - this.thresholds.sentiment.warning)) * 50;
    } else if (sentiment < 0) {
      // Scale between 0-50
      return Math.abs(sentiment / this.thresholds.sentiment.warning) * 50;
    }

    return 0;
  }

  /**
   * Calculate influencer risk score (0-100)
   */
  _calculateInfluencerRisk(current) {
    if (current.influencerMentions === 0) return 0;

    // High influencer involvement + negative sentiment = high risk
    const influencerFactor = Math.min(current.influencerMentions / 10, 1) * 50;
    const sentimentFactor = current.negativeMentionRate * 50;

    return influencerFactor + sentimentFactor;
  }

  /**
   * Calculate velocity score - how fast is this growing? (0-100)
   */
  async _calculateVelocityScore(tenantId, timeWindow) {
    try {
      // Compare last 15 mins vs previous 15 mins
      const recent = await query(
        `SELECT COUNT(*) as count
         FROM sl_mentions
         WHERE tenant_id = $1
           AND published_at >= NOW() - INTERVAL '15 minutes'`,
        [tenantId]
      );

      const previous = await query(
        `SELECT COUNT(*) as count
         FROM sl_mentions
         WHERE tenant_id = $1
           AND published_at >= NOW() - INTERVAL '30 minutes'
           AND published_at < NOW() - INTERVAL '15 minutes'`,
        [tenantId]
      );

      const recentCount = parseInt(recent.rows[0].count) || 0;
      const previousCount = parseInt(previous.rows[0].count) || 1; // Avoid divide by zero

      const acceleration = (recentCount - previousCount) / previousCount;

      // Map acceleration to 0-100 scale
      if (acceleration > 2.0) return 100;
      if (acceleration > 1.0) return 70 + (acceleration - 1.0) * 30;
      if (acceleration > 0) return acceleration * 70;
      return 0;

    } catch (error) {
      logger.error('[CrisisDetector] Velocity calculation failed', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate overall crisis score (0-100)
   */
  async _calculateCrisisScore(indicators) {
    // Weighted average of all indicators
    const weights = {
      volumeAnomaly: 0.30,
      sentimentAnomaly: 0.35,
      influencerRisk: 0.20,
      velocityScore: 0.15
    };

    const score =
      (indicators.volumeAnomaly * weights.volumeAnomaly) +
      (indicators.sentimentAnomaly * weights.sentimentAnomaly) +
      (indicators.influencerRisk * weights.influencerRisk) +
      (indicators.velocityScore * weights.velocityScore);

    return Math.round(score);
  }

  /**
   * Determine crisis level based on score
   */
  _determineCrisisLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'elevated';
    if (score >= 20) return 'watch';
    return 'normal';
  }

  /**
   * Detect type of crisis based on keywords and patterns
   */
  async _detectCrisisType(tenantId, metrics) {
    try {
      // Analyze recent negative mentions for keywords
      const result = await query(
        `SELECT content, keywords, topics
         FROM sl_mentions
         WHERE tenant_id = $1
           AND sentiment = 'negative'
           AND published_at >= NOW() - INTERVAL '60 minutes'
         LIMIT 50`,
        [tenantId]
      );

      const allText = result.rows.map(r => r.content?.toLowerCase() || '').join(' ');
      const allKeywords = result.rows.flatMap(r => r.keywords || []).map(k => k.toLowerCase());

      // Crisis keyword patterns
      const patterns = {
        [this.crisisTypes.PRODUCT_ISSUE]: ['defect', 'broken', 'faulty', 'recall', 'dangerous', 'unsafe'],
        [this.crisisTypes.SERVICE_OUTAGE]: ['down', 'outage', 'not working', 'offline', 'cant access', 'error'],
        [this.crisisTypes.SECURITY_BREACH]: ['hack', 'breach', 'leaked', 'compromised', 'stolen data', 'security'],
        [this.crisisTypes.LEGAL_ISSUE]: ['lawsuit', 'legal', 'court', 'sued', 'investigation', 'fraud'],
        [this.crisisTypes.EXECUTIVE_CONTROVERSY]: ['ceo', 'executive', 'scandal', 'resign', 'fired', 'controversy'],
        [this.crisisTypes.VIRAL_NEGATIVE]: ['cancel', 'boycott', 'unacceptable', 'disgusting', 'outrage']
      };

      // Find best matching crisis type
      let bestMatch = this.crisisTypes.PR_NEGATIVE;
      let maxScore = 0;

      for (const [type, keywords] of Object.entries(patterns)) {
        const score = keywords.filter(kw =>
          allText.includes(kw) || allKeywords.some(k => k.includes(kw))
        ).length;

        if (score > maxScore) {
          maxScore = score;
          bestMatch = type;
        }
      }

      return bestMatch;

    } catch (error) {
      logger.error('[CrisisDetector] Crisis type detection failed', { error: error.message });
      return this.crisisTypes.PR_NEGATIVE;
    }
  }

  /**
   * Generate recommended actions based on crisis analysis
   */
  _generateRecommendedActions(score, type, level) {
    const actions = [];

    // Universal actions for any crisis
    if (level !== 'normal') {
      actions.push({
        priority: 1,
        action: 'Notify crisis response team immediately',
        type: 'alert'
      });
    }

    // Score-based actions
    if (score >= 80) {
      actions.push({
        priority: 1,
        action: 'Prepare official statement for public release',
        type: 'communication'
      });
      actions.push({
        priority: 1,
        action: 'Schedule emergency leadership meeting',
        type: 'internal'
      });
    } else if (score >= 60) {
      actions.push({
        priority: 2,
        action: 'Draft holding statement for potential use',
        type: 'communication'
      });
      actions.push({
        priority: 2,
        action: 'Alert PR and legal teams',
        type: 'internal'
      });
    } else if (score >= 40) {
      actions.push({
        priority: 3,
        action: 'Monitor situation closely for next 2 hours',
        type: 'monitoring'
      });
      actions.push({
        priority: 3,
        action: 'Identify key influencers to engage',
        type: 'engagement'
      });
    }

    // Type-specific actions
    const typeActions = {
      [this.crisisTypes.PRODUCT_ISSUE]: [
        { priority: 1, action: 'Contact product team for investigation', type: 'internal' },
        { priority: 2, action: 'Prepare customer communication plan', type: 'communication' }
      ],
      [this.crisisTypes.SERVICE_OUTAGE]: [
        { priority: 1, action: 'Update status page with incident details', type: 'communication' },
        { priority: 1, action: 'Coordinate with engineering team', type: 'internal' }
      ],
      [this.crisisTypes.SECURITY_BREACH]: [
        { priority: 1, action: 'Activate security incident response plan', type: 'internal' },
        { priority: 1, action: 'Consult legal team before any communication', type: 'legal' }
      ],
      [this.crisisTypes.LEGAL_ISSUE]: [
        { priority: 1, action: 'Engage legal counsel immediately', type: 'legal' },
        { priority: 1, action: 'Limit public statements until legal review', type: 'communication' }
      ],
      [this.crisisTypes.VIRAL_NEGATIVE]: [
        { priority: 1, action: 'Identify and respond to top influencers first', type: 'engagement' },
        { priority: 2, action: 'Consider targeted paid response campaign', type: 'marketing' }
      ]
    };

    if (typeActions[type]) {
      actions.push(...typeActions[type]);
    }

    // Sort by priority
    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get most concerning mentions
   */
  async _getConcerningMentions(tenantId, timeWindow) {
    const result = await query(
      `SELECT id, content, author_name, platform, sentiment_score,
              reach_estimate, engagement_count, published_at, url
       FROM sl_mentions
       WHERE tenant_id = $1
         AND published_at >= NOW() - INTERVAL '${timeWindow} minutes'
         AND sentiment = 'negative'
       ORDER BY
         CASE
           WHEN reach_estimate > 10000 THEN reach_estimate * 10
           ELSE reach_estimate
         END DESC,
         engagement_count DESC,
         sentiment_score ASC
       LIMIT 10`,
      [tenantId]
    );

    return result.rows;
  }

  /**
   * Log crisis event to database
   */
  async _logCrisisEvent(tenantId, analysis) {
    try {
      await query(
        `INSERT INTO sl_crisis_events
         (tenant_id, severity_score, crisis_type, crisis_level, indicators, recommended_actions, mention_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tenantId,
          analysis.crisisScore,
          analysis.crisisType,
          analysis.crisisLevel,
          JSON.stringify(analysis.indicators),
          JSON.stringify(analysis.recommendedActions),
          analysis.metrics.totalMentions
        ]
      );

      logger.info('[CrisisDetector] Crisis event logged', {
        tenantId,
        crisisLevel: analysis.crisisLevel,
        crisisScore: analysis.crisisScore
      });

    } catch (error) {
      logger.error('[CrisisDetector] Failed to log crisis event', {
        tenantId,
        error: error.message
      });
      // Don't throw - logging failure shouldn't break crisis detection
    }
  }

  /**
   * Get crisis history for tenant
   */
  async getCrisisHistory(tenantId, days = 30) {
    const result = await query(
      `SELECT *
       FROM sl_crisis_events
       WHERE tenant_id = $1
         AND created_at >= NOW() - INTERVAL '${days} days'
       ORDER BY created_at DESC`,
      [tenantId]
    );

    return result.rows;
  }
}

module.exports = new CrisisDetector();
