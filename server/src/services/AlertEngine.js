/**
 * Social Listening Alert Engine
 *
 * Monitors mentions and triggers alerts based on configured rules
 * Supports multiple alert types:
 * - sentiment_threshold: Alert when sentiment drops below threshold
 * - volume_spike: Alert when mention volume increases significantly
 * - keyword_match: Alert when specific keywords appear
 * - influencer_mention: Alert when high-follower accounts mention brand
 * - competitor_spike: Alert when competitor mentions increase
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class AlertEngine {
  constructor() {
    this.lastVolumeCheck = new Map(); // Track volume baselines per tenant
  }

  /**
   * Check a single mention against all active alert rules
   * @param {Object} mention - Mention object
   * @returns {Promise<Array>} Triggered alert events
   */
  async checkMentionAgainstRules(mention) {
    try {
      // Fetch active alert rules for this tenant
      const rulesResult = await query(
        `SELECT * FROM sl_alerts
         WHERE tenant_id = $1 AND is_active = true`,
        [mention.tenant_id]
      );

      const triggeredAlerts = [];

      for (const rule of rulesResult.rows) {
        // Check if rule applies to this platform
        const platforms = Array.isArray(rule.platforms) ? rule.platforms : JSON.parse(rule.platforms || '[]');
        if (platforms.length > 0 && !platforms.includes(mention.platform)) {
          continue;
        }

        // Check cooldown period
        if (rule.last_triggered_at) {
          const cooldownMs = rule.cooldown_minutes * 60 * 1000;
          const timeSinceLastTrigger = Date.now() - new Date(rule.last_triggered_at).getTime();
          if (timeSinceLastTrigger < cooldownMs) {
            continue; // Still in cooldown
          }
        }

        // Check rule type
        let shouldTrigger = false;
        let eventData = {};

        switch (rule.rule_type) {
          case 'sentiment_threshold':
            shouldTrigger = this.checkSentimentThreshold(mention, rule.conditions);
            if (shouldTrigger) {
              eventData = {
                sentiment: mention.sentiment,
                sentimentScore: mention.sentiment_score,
                threshold: rule.conditions.threshold
              };
            }
            break;

          case 'keyword_match':
            shouldTrigger = this.checkKeywordMatch(mention, rule.conditions);
            if (shouldTrigger) {
              eventData = {
                matchedKeywords: this.getMatchedKeywords(mention, rule.conditions)
              };
            }
            break;

          case 'influencer_mention':
            shouldTrigger = this.checkInfluencerMention(mention, rule.conditions);
            if (shouldTrigger) {
              eventData = {
                authorHandle: mention.author_handle,
                followers: mention.author_followers,
                verified: mention.author_verified
              };
            }
            break;

          case 'volume_spike':
            // Volume spikes are checked separately (not per mention)
            break;

          case 'competitor_spike':
            // Competitor spikes are checked separately
            break;

          default:
            logger.warn('[AlertEngine] Unknown rule type', { ruleType: rule.rule_type });
        }

        if (shouldTrigger) {
          const alertEvent = await this.triggerAlert(rule, mention, eventData);
          triggeredAlerts.push(alertEvent);
        }
      }

      return triggeredAlerts;

    } catch (error) {
      logger.error('[AlertEngine] Failed to check mention against rules', {
        mentionId: mention.id,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check sentiment threshold rule
   */
  checkSentimentThreshold(mention, conditions) {
    const { threshold, sentimentType } = conditions;

    // threshold: -1.0 to 1.0
    // sentimentType: 'negative' (alert on negative) or 'any' (alert on extreme values)

    if (!mention.sentiment_score) return false;

    if (sentimentType === 'negative') {
      return mention.sentiment_score < threshold;
    }

    if (sentimentType === 'any') {
      return Math.abs(mention.sentiment_score) > Math.abs(threshold);
    }

    return false;
  }

  /**
   * Check keyword match rule
   */
  checkKeywordMatch(mention, conditions) {
    const { keywords, matchType } = conditions;
    // keywords: array of strings
    // matchType: 'any' or 'all'

    if (!keywords || keywords.length === 0) return false;
    if (!mention.content) return false;

    const contentLower = mention.content.toLowerCase();

    if (matchType === 'all') {
      return keywords.every(kw => contentLower.includes(kw.toLowerCase()));
    }

    // Default: 'any'
    return keywords.some(kw => contentLower.includes(kw.toLowerCase()));
  }

  /**
   * Get matched keywords for event data
   */
  getMatchedKeywords(mention, conditions) {
    const { keywords } = conditions;
    if (!keywords || !mention.content) return [];

    const contentLower = mention.content.toLowerCase();
    return keywords.filter(kw => contentLower.includes(kw.toLowerCase()));
  }

  /**
   * Check influencer mention rule
   */
  checkInfluencerMention(mention, conditions) {
    const { minFollowers, requireVerified } = conditions;

    if (minFollowers && mention.author_followers < minFollowers) {
      return false;
    }

    if (requireVerified && !mention.author_verified) {
      return false;
    }

    return true;
  }

  /**
   * Trigger an alert and execute actions
   */
  async triggerAlert(rule, mention, eventData) {
    try {
      // Create alert event
      const eventResult = await query(
        `INSERT INTO sl_alert_events (
          tenant_id, alert_id, mention_id, event_type, event_data, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [
          rule.tenant_id,
          rule.id,
          mention.id,
          rule.rule_type,
          JSON.stringify(eventData),
          'pending'
        ]
      );

      const alertEvent = eventResult.rows[0];

      // Update rule: increment trigger count and set last_triggered_at
      await query(
        `UPDATE sl_alerts
         SET trigger_count = trigger_count + 1,
             last_triggered_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [rule.id]
      );

      // Execute actions
      await this.executeActions(rule, mention, alertEvent);

      logger.info('[AlertEngine] Alert triggered', {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.rule_type,
        mentionId: mention.id,
        eventId: alertEvent.id
      });

      return alertEvent;

    } catch (error) {
      logger.error('[AlertEngine] Failed to trigger alert', {
        ruleId: rule.id,
        mentionId: mention.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute actions for triggered alert
   */
  async executeActions(rule, mention, alertEvent) {
    const actions = Array.isArray(rule.actions) ? rule.actions : JSON.parse(rule.actions || '[]');

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'notification':
            await this.sendNotification(rule, mention, alertEvent, action.config);
            break;

          case 'email':
            await this.sendEmailAlert(rule, mention, alertEvent, action.config);
            break;

          case 'ctl_alert':
            await this.createCTLAlert(rule, mention, alertEvent);
            break;

          case 'ticket':
            await this.createTicket(rule, mention, alertEvent, action.config);
            break;

          case 'webhook':
            await this.callWebhook(rule, mention, alertEvent, action.config);
            break;

          default:
            logger.warn('[AlertEngine] Unknown action type', { actionType: action.type });
        }
      } catch (error) {
        logger.error('[AlertEngine] Action execution failed', {
          actionType: action.type,
          ruleId: rule.id,
          mentionId: mention.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Send in-app notification
   */
  async sendNotification(rule, mention, alertEvent, config) {
    try {
      const notificationService = require('./notificationService');

      const message = `New social listening alert: ${rule.name}`;
      const details = `${mention.author_name} (@${mention.author_handle}) on ${mention.platform}: "${mention.content.substring(0, 100)}..."`;

      await notificationService.create({
        tenantId: rule.tenant_id,
        userId: config.userId || rule.created_by,
        title: message,
        message: details,
        type: 'alert',
        link: `/social-listening?mention=${mention.id}`,
        metadata: {
          alertId: rule.id,
          mentionId: mention.id,
          eventId: alertEvent.id
        }
      });

      logger.info('[AlertEngine] Notification sent', {
        ruleId: rule.id,
        mentionId: mention.id
      });

    } catch (error) {
      logger.error('[AlertEngine] Notification failed', {
        error: error.message
      });
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(rule, mention, alertEvent, config) {
    try {
      const emailService = require('./emailService');

      const subject = `Social Listening Alert: ${rule.name}`;
      const body = `
        <h2>Social Listening Alert</h2>
        <p><strong>Rule:</strong> ${rule.name}</p>
        <p><strong>Type:</strong> ${rule.rule_type}</p>
        <p><strong>Platform:</strong> ${mention.platform}</p>
        <p><strong>Author:</strong> ${mention.author_name} (@${mention.author_handle})</p>
        <p><strong>Followers:</strong> ${mention.author_followers}</p>
        <p><strong>Sentiment:</strong> ${mention.sentiment} (${mention.sentiment_score})</p>
        <p><strong>Content:</strong></p>
        <blockquote>${mention.content}</blockquote>
        <p><a href="${mention.content_url}">View on ${mention.platform}</a></p>
      `;

      await emailService.sendEmail({
        to: config.recipients || [config.email],
        subject,
        html: body,
        tenantId: rule.tenant_id
      });

      logger.info('[AlertEngine] Email alert sent', {
        ruleId: rule.id,
        mentionId: mention.id
      });

    } catch (error) {
      logger.error('[AlertEngine] Email alert failed', {
        error: error.message
      });
    }
  }

  /**
   * Create CTL alert for unified tracking
   */
  async createCTLAlert(rule, mention, alertEvent) {
    try {
      // Determine alert level based on sentiment and rule type
      let alertLevel = 'medium';
      if (mention.sentiment === 'negative' && mention.sentiment_score < -0.7) {
        alertLevel = 'critical';
      } else if (mention.sentiment === 'negative' && mention.sentiment_score < -0.4) {
        alertLevel = 'high';
      } else if (rule.rule_type === 'influencer_mention') {
        alertLevel = 'high';
      }

      await query(
        `INSERT INTO ctl_alerts (
          tenant_id, alert_level, score_value, score_type, sentiment,
          mention_id, source_channel, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', NOW())`,
        [
          rule.tenant_id,
          alertLevel,
          mention.sentiment_score,
          'sentiment',
          mention.sentiment,
          mention.id,
          mention.platform
        ]
      );

      logger.info('[AlertEngine] CTL alert created', {
        ruleId: rule.id,
        mentionId: mention.id,
        alertLevel
      });

    } catch (error) {
      logger.error('[AlertEngine] CTL alert creation failed', {
        error: error.message
      });
    }
  }

  /**
   * Create ticket directly
   */
  async createTicket(rule, mention, alertEvent, config) {
    try {
      const ticketCode = 'SL-' + Math.floor(100000 + Math.random() * 900000);
      const subject = config.subject || `Social Listening: ${rule.name}`;
      const description = `
Alert: ${rule.name}
Platform: ${mention.platform}
Author: ${mention.author_name} (@${mention.author_handle})
Followers: ${mention.author_followers}
Sentiment: ${mention.sentiment} (${mention.sentiment_score})

Content:
${mention.content}

URL: ${mention.content_url}
      `.trim();

      const ticketResult = await query(
        `INSERT INTO tickets (
          ticket_code, subject, description, priority, status, channel,
          tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'new', 'social', $5, NOW(), NOW())
        RETURNING id, ticket_code`,
        [
          ticketCode,
          subject,
          description,
          config.priority || 'medium',
          rule.tenant_id
        ]
      );

      const ticket = ticketResult.rows[0];

      logger.info('[AlertEngine] Ticket created', {
        ruleId: rule.id,
        mentionId: mention.id,
        ticketId: ticket.id,
        ticketCode: ticket.ticket_code
      });

    } catch (error) {
      logger.error('[AlertEngine] Ticket creation failed', {
        error: error.message
      });
    }
  }

  /**
   * Call external webhook
   */
  async callWebhook(rule, mention, alertEvent, config) {
    try {
      const axios = require('axios');

      const payload = {
        alert: {
          id: alertEvent.id,
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.rule_type
        },
        mention: {
          id: mention.id,
          platform: mention.platform,
          authorName: mention.author_name,
          authorHandle: mention.author_handle,
          followers: mention.author_followers,
          content: mention.content,
          url: mention.content_url,
          sentiment: mention.sentiment,
          sentimentScore: mention.sentiment_score,
          publishedAt: mention.published_at
        },
        timestamp: new Date().toISOString()
      };

      await axios.post(config.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-VTrustX-Event': 'social_listening_alert',
          ...(config.headers || {})
        },
        timeout: 5000
      });

      logger.info('[AlertEngine] Webhook called', {
        ruleId: rule.id,
        mentionId: mention.id,
        url: config.url
      });

    } catch (error) {
      logger.error('[AlertEngine] Webhook call failed', {
        url: config.url,
        error: error.message
      });
    }
  }

  /**
   * Check for volume spikes across all tenants
   * Called periodically by background processor
   */
  async checkVolumeSpikes() {
    try {
      // Get all active volume spike rules
      const rulesResult = await query(
        `SELECT * FROM sl_alerts
         WHERE rule_type = 'volume_spike' AND is_active = true`
      );

      for (const rule of rulesResult.rows) {
        await this.checkVolumeSpikeForRule(rule);
      }

    } catch (error) {
      logger.error('[AlertEngine] Volume spike check failed', {
        error: error.message
      });
    }
  }

  /**
   * Check volume spike for specific rule
   */
  async checkVolumeSpikeForRule(rule) {
    try {
      const { timeWindow, increasePercentage, minMentions } = rule.conditions;
      // timeWindow: e.g., 60 (minutes)
      // increasePercentage: e.g., 50 (50% increase)
      // minMentions: e.g., 10 (minimum mentions in current window)

      // Get mention count in current window
      const currentWindowResult = await query(
        `SELECT COUNT(*) as count
         FROM sl_mentions
         WHERE tenant_id = $1
           AND published_at >= NOW() - INTERVAL '${timeWindow} minutes'`,
        [rule.tenant_id]
      );

      const currentCount = parseInt(currentWindowResult.rows[0].count);

      // Get mention count in previous window (same duration, preceding current)
      const previousWindowResult = await query(
        `SELECT COUNT(*) as count
         FROM sl_mentions
         WHERE tenant_id = $1
           AND published_at >= NOW() - INTERVAL '${timeWindow * 2} minutes'
           AND published_at < NOW() - INTERVAL '${timeWindow} minutes'`,
        [rule.tenant_id]
      );

      const previousCount = parseInt(previousWindowResult.rows[0].count);

      // Check if spike conditions met
      if (currentCount < minMentions) {
        return; // Not enough mentions to be significant
      }

      if (previousCount === 0) {
        // Can't calculate percentage increase from zero, but significant spike
        if (currentCount >= minMentions) {
          await this.triggerVolumeSpikeAlert(rule, currentCount, previousCount, null);
        }
        return;
      }

      const increasePercent = ((currentCount - previousCount) / previousCount) * 100;

      if (increasePercent >= increasePercentage) {
        await this.triggerVolumeSpikeAlert(rule, currentCount, previousCount, increasePercent);
      }

    } catch (error) {
      logger.error('[AlertEngine] Volume spike check failed for rule', {
        ruleId: rule.id,
        error: error.message
      });
    }
  }

  /**
   * Trigger volume spike alert
   */
  async triggerVolumeSpikeAlert(rule, currentCount, previousCount, increasePercent) {
    try {
      const eventData = {
        currentCount,
        previousCount,
        increasePercent,
        timeWindow: rule.conditions.timeWindow
      };

      // Create alert event (no specific mention)
      const eventResult = await query(
        `INSERT INTO sl_alert_events (
          tenant_id, alert_id, mention_id, event_type, event_data, status, created_at
        ) VALUES ($1, $2, NULL, 'volume_spike', $3, 'pending', NOW())
        RETURNING *`,
        [rule.tenant_id, rule.id, JSON.stringify(eventData)]
      );

      const alertEvent = eventResult.rows[0];

      // Update rule
      await query(
        `UPDATE sl_alerts
         SET trigger_count = trigger_count + 1,
             last_triggered_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [rule.id]
      );

      logger.info('[AlertEngine] Volume spike alert triggered', {
        ruleId: rule.id,
        currentCount,
        previousCount,
        increasePercent
      });

      // Execute actions (without mention context)
      const actions = Array.isArray(rule.actions) ? rule.actions : JSON.parse(rule.actions || '[]');
      for (const action of actions) {
        if (action.type === 'notification') {
          await this.sendVolumeSpikeNotification(rule, eventData, action.config);
        } else if (action.type === 'email') {
          await this.sendVolumeSpikeEmail(rule, eventData, action.config);
        }
      }

    } catch (error) {
      logger.error('[AlertEngine] Volume spike alert trigger failed', {
        ruleId: rule.id,
        error: error.message
      });
    }
  }

  /**
   * Send volume spike notification
   */
  async sendVolumeSpikeNotification(rule, eventData, config) {
    try {
      const notificationService = require('./notificationService');

      const message = `Volume spike detected: ${rule.name}`;
      const details = eventData.increasePercent
        ? `Mentions increased ${Math.round(eventData.increasePercent)}% (${eventData.previousCount} → ${eventData.currentCount})`
        : `Significant activity: ${eventData.currentCount} mentions in last ${eventData.timeWindow} minutes`;

      await notificationService.create({
        tenantId: rule.tenant_id,
        userId: config.userId || rule.created_by,
        title: message,
        message: details,
        type: 'alert',
        link: '/social-listening',
        metadata: {
          alertId: rule.id,
          eventData
        }
      });

    } catch (error) {
      logger.error('[AlertEngine] Volume spike notification failed', {
        error: error.message
      });
    }
  }

  /**
   * Send volume spike email
   */
  async sendVolumeSpikeEmail(rule, eventData, config) {
    try {
      const emailService = require('./emailService');

      const subject = `Volume Spike Alert: ${rule.name}`;
      const body = `
        <h2>Volume Spike Detected</h2>
        <p><strong>Rule:</strong> ${rule.name}</p>
        <p><strong>Time Window:</strong> ${eventData.timeWindow} minutes</p>
        <p><strong>Previous Period:</strong> ${eventData.previousCount} mentions</p>
        <p><strong>Current Period:</strong> ${eventData.currentCount} mentions</p>
        ${eventData.increasePercent ? `<p><strong>Increase:</strong> ${Math.round(eventData.increasePercent)}%</p>` : ''}
        <p><a href="https://app.vtrustx.com/social-listening">View Dashboard</a></p>
      `;

      await emailService.sendEmail({
        to: config.recipients || [config.email],
        subject,
        html: body,
        tenantId: rule.tenant_id
      });

    } catch (error) {
      logger.error('[AlertEngine] Volume spike email failed', {
        error: error.message
      });
    }
  }
}

// Export singleton instance
module.exports = new AlertEngine();
