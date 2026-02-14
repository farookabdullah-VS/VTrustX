/**
 * Social Listening Alert Management API
 *
 * Endpoints for managing alert rules and viewing triggered events
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const { query } = require('../../../infrastructure/database/db');
const AlertEngine = require('../../../services/AlertEngine');
const logger = require('../../../infrastructure/logger');

/**
 * @route   GET /api/v1/social-listening/alerts/rules
 * @desc    List all alert rules for tenant
 * @access  Private
 */
router.get('/rules', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { isActive } = req.query;

    let sql = 'SELECT * FROM sl_alerts WHERE tenant_id = $1';
    const params = [tenantId];

    if (isActive !== undefined) {
      sql += ' AND is_active = $2';
      params.push(isActive === 'true');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    res.json({
      success: true,
      rules: result.rows.map(r => ({
        ...r,
        conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions,
        actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions,
        platforms: typeof r.platforms === 'string' ? JSON.parse(r.platforms) : r.platforms
      }))
    });

  } catch (error) {
    logger.error('[Alerts API] Failed to list rules', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

/**
 * @route   POST /api/v1/social-listening/alerts/rules
 * @desc    Create new alert rule
 * @access  Private
 */
router.post('/rules', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      name,
      ruleType,
      conditions,
      actions,
      platforms,
      cooldownMinutes
    } = req.body;

    // Validate required fields
    if (!name || !ruleType || !conditions) {
      return res.status(400).json({ error: 'Missing required fields: name, ruleType, conditions' });
    }

    // Validate rule type
    const validRuleTypes = [
      'sentiment_threshold',
      'volume_spike',
      'keyword_match',
      'influencer_mention',
      'competitor_spike'
    ];

    if (!validRuleTypes.includes(ruleType)) {
      return res.status(400).json({ error: `Invalid rule type. Must be one of: ${validRuleTypes.join(', ')}` });
    }

    // Validate conditions based on rule type
    const validationError = validateRuleConditions(ruleType, conditions);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await query(
      `INSERT INTO sl_alerts (
        tenant_id, name, rule_type, conditions, actions, platforms,
        is_active, cooldown_minutes, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        tenantId,
        name,
        ruleType,
        JSON.stringify(conditions),
        JSON.stringify(actions || []),
        JSON.stringify(platforms || []),
        cooldownMinutes || 60,
        req.user.id
      ]
    );

    const rule = result.rows[0];

    logger.info('[Alerts API] Alert rule created', {
      ruleId: rule.id,
      ruleName: name,
      ruleType,
      tenantId
    });

    res.status(201).json({
      success: true,
      rule: {
        ...rule,
        conditions: typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions,
        actions: typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions,
        platforms: typeof rule.platforms === 'string' ? JSON.parse(rule.platforms) : rule.platforms
      }
    });

  } catch (error) {
    logger.error('[Alerts API] Failed to create rule', { error: error.message });
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

/**
 * @route   PUT /api/v1/social-listening/alerts/rules/:ruleId
 * @desc    Update alert rule
 * @access  Private
 */
router.put('/rules/:ruleId', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { ruleId } = req.params;
    const {
      name,
      conditions,
      actions,
      platforms,
      isActive,
      cooldownMinutes
    } = req.body;

    // Verify rule exists and belongs to tenant
    const existingResult = await query(
      'SELECT * FROM sl_alerts WHERE id = $1 AND tenant_id = $2',
      [ruleId, tenantId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    const existing = existingResult.rows[0];

    // Build update query
    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      params.push(name);
    }

    if (conditions !== undefined) {
      const validationError = validateRuleConditions(existing.rule_type, conditions);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      updates.push(`conditions = $${paramIdx++}`);
      params.push(JSON.stringify(conditions));
    }

    if (actions !== undefined) {
      updates.push(`actions = $${paramIdx++}`);
      params.push(JSON.stringify(actions));
    }

    if (platforms !== undefined) {
      updates.push(`platforms = $${paramIdx++}`);
      params.push(JSON.stringify(platforms));
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      params.push(isActive);
    }

    if (cooldownMinutes !== undefined) {
      updates.push(`cooldown_minutes = $${paramIdx++}`);
      params.push(cooldownMinutes);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) { // Only updated_at
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(ruleId, tenantId);

    const result = await query(
      `UPDATE sl_alerts
       SET ${updates.join(', ')}
       WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx++}
       RETURNING *`,
      params
    );

    const rule = result.rows[0];

    logger.info('[Alerts API] Alert rule updated', {
      ruleId: rule.id,
      tenantId
    });

    res.json({
      success: true,
      rule: {
        ...rule,
        conditions: typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions,
        actions: typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions,
        platforms: typeof rule.platforms === 'string' ? JSON.parse(rule.platforms) : rule.platforms
      }
    });

  } catch (error) {
    logger.error('[Alerts API] Failed to update rule', { error: error.message });
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

/**
 * @route   DELETE /api/v1/social-listening/alerts/rules/:ruleId
 * @desc    Delete alert rule
 * @access  Private
 */
router.delete('/rules/:ruleId', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { ruleId } = req.params;

    const result = await query(
      'DELETE FROM sl_alerts WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [ruleId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    logger.info('[Alerts API] Alert rule deleted', {
      ruleId,
      tenantId
    });

    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });

  } catch (error) {
    logger.error('[Alerts API] Failed to delete rule', { error: error.message });
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

/**
 * @route   GET /api/v1/social-listening/alerts/events
 * @desc    List triggered alert events
 * @access  Private
 */
router.get('/events', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { status, alertId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT e.*,
             a.name as alert_name,
             a.rule_type,
             m.content as mention_content,
             m.author_name,
             m.author_handle,
             m.platform,
             m.sentiment,
             m.published_at as mention_published_at
      FROM sl_alert_events e
      LEFT JOIN sl_alerts a ON e.alert_id = a.id
      LEFT JOIN sl_mentions m ON e.mention_id = m.id
      WHERE e.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (status) {
      sql += ` AND e.status = $${paramIdx++}`;
      params.push(status);
    }

    if (alertId) {
      sql += ` AND e.alert_id = $${paramIdx++}`;
      params.push(alertId);
    }

    sql += ` ORDER BY e.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM sl_alert_events WHERE tenant_id = $1';
    const countParams = [tenantId];
    let countIdx = 2;

    if (status) {
      countSql += ` AND status = $${countIdx++}`;
      countParams.push(status);
    }

    if (alertId) {
      countSql += ` AND alert_id = $${countIdx++}`;
      countParams.push(alertId);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      events: result.rows.map(e => ({
        ...e,
        event_data: typeof e.event_data === 'string' ? JSON.parse(e.event_data) : e.event_data
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('[Alerts API] Failed to list events', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch alert events' });
  }
});

/**
 * @route   PUT /api/v1/social-listening/alerts/events/:eventId
 * @desc    Update alert event status
 * @access  Private
 */
router.put('/events/:eventId', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { eventId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'actioned', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await query(
      `UPDATE sl_alert_events
       SET status = $1,
           actioned_by = $2,
           actioned_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [status, req.user.id, eventId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert event not found' });
    }

    const event = result.rows[0];

    logger.info('[Alerts API] Alert event updated', {
      eventId,
      status,
      tenantId
    });

    res.json({
      success: true,
      event: {
        ...event,
        event_data: typeof event.event_data === 'string' ? JSON.parse(event.event_data) : event.event_data
      }
    });

  } catch (error) {
    logger.error('[Alerts API] Failed to update event', { error: error.message });
    res.status(500).json({ error: 'Failed to update alert event' });
  }
});

/**
 * @route   POST /api/v1/social-listening/alerts/test/:ruleId
 * @desc    Test an alert rule manually
 * @access  Private
 */
router.post('/test/:ruleId', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { ruleId } = req.params;

    // Fetch rule
    const ruleResult = await query(
      'SELECT * FROM sl_alerts WHERE id = $1 AND tenant_id = $2',
      [ruleId, tenantId]
    );

    if (ruleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    const rule = ruleResult.rows[0];

    // Get a recent mention to test against
    const mentionResult = await query(
      `SELECT * FROM sl_mentions
       WHERE tenant_id = $1
       ORDER BY published_at DESC
       LIMIT 1`,
      [tenantId]
    );

    if (mentionResult.rows.length === 0) {
      return res.status(404).json({ error: 'No mentions found to test against' });
    }

    const mention = mentionResult.rows[0];

    // Test rule against mention
    const triggeredAlerts = await AlertEngine.checkMentionAgainstRules(mention);

    res.json({
      success: true,
      message: triggeredAlerts.length > 0 ? 'Rule would trigger for this mention' : 'Rule would not trigger for this mention',
      triggered: triggeredAlerts.length > 0,
      testMention: {
        id: mention.id,
        content: mention.content,
        platform: mention.platform,
        sentiment: mention.sentiment,
        authorHandle: mention.author_handle
      }
    });

  } catch (error) {
    logger.error('[Alerts API] Failed to test rule', { error: error.message });
    res.status(500).json({ error: 'Failed to test alert rule' });
  }
});

/**
 * @route   GET /api/v1/social-listening/alerts/stats
 * @desc    Get alert statistics
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Count rules by type
    const rulesByTypeResult = await query(
      `SELECT rule_type, COUNT(*) as count
       FROM sl_alerts
       WHERE tenant_id = $1
       GROUP BY rule_type`,
      [tenantId]
    );

    // Count events by status
    const eventsByStatusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM sl_alert_events
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId]
    );

    // Count events in last 24 hours
    const recentEventsResult = await query(
      `SELECT COUNT(*) as count
       FROM sl_alert_events
       WHERE tenant_id = $1
         AND created_at >= NOW() - INTERVAL '24 hours'`,
      [tenantId]
    );

    // Top triggering rules
    const topRulesResult = await query(
      `SELECT a.id, a.name, a.rule_type, a.trigger_count
       FROM sl_alerts a
       WHERE a.tenant_id = $1
       ORDER BY a.trigger_count DESC
       LIMIT 5`,
      [tenantId]
    );

    res.json({
      success: true,
      stats: {
        rulesByType: rulesByTypeResult.rows.reduce((acc, r) => {
          acc[r.rule_type] = parseInt(r.count);
          return acc;
        }, {}),
        eventsByStatus: eventsByStatusResult.rows.reduce((acc, r) => {
          acc[r.status] = parseInt(r.count);
          return acc;
        }, {}),
        eventsLast24Hours: parseInt(recentEventsResult.rows[0].count),
        topRules: topRulesResult.rows
      }
    });

  } catch (error) {
    logger.error('[Alerts API] Failed to get stats', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch alert statistics' });
  }
});

/**
 * Validate rule conditions based on rule type
 */
function validateRuleConditions(ruleType, conditions) {
  switch (ruleType) {
    case 'sentiment_threshold':
      if (!conditions.threshold || typeof conditions.threshold !== 'number') {
        return 'sentiment_threshold requires numeric threshold';
      }
      if (conditions.threshold < -1 || conditions.threshold > 1) {
        return 'threshold must be between -1.0 and 1.0';
      }
      if (!conditions.sentimentType || !['negative', 'any'].includes(conditions.sentimentType)) {
        return 'sentimentType must be "negative" or "any"';
      }
      break;

    case 'keyword_match':
      if (!conditions.keywords || !Array.isArray(conditions.keywords) || conditions.keywords.length === 0) {
        return 'keyword_match requires keywords array';
      }
      if (!conditions.matchType || !['any', 'all'].includes(conditions.matchType)) {
        return 'matchType must be "any" or "all"';
      }
      break;

    case 'influencer_mention':
      if (!conditions.minFollowers || typeof conditions.minFollowers !== 'number') {
        return 'influencer_mention requires numeric minFollowers';
      }
      break;

    case 'volume_spike':
      if (!conditions.timeWindow || typeof conditions.timeWindow !== 'number') {
        return 'volume_spike requires numeric timeWindow (minutes)';
      }
      if (!conditions.increasePercentage || typeof conditions.increasePercentage !== 'number') {
        return 'volume_spike requires numeric increasePercentage';
      }
      if (!conditions.minMentions || typeof conditions.minMentions !== 'number') {
        return 'volume_spike requires numeric minMentions';
      }
      break;

    case 'competitor_spike':
      if (!conditions.competitorId) {
        return 'competitor_spike requires competitorId';
      }
      break;

    default:
      return 'Invalid rule type';
  }

  return null; // Valid
}

module.exports = router;
