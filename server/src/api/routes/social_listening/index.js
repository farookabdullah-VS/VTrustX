/**
 * Social Listening Module - API Routes
 *
 * ~30 endpoints organized by resource:
 * - Sources: Connect/manage platform sources
 * - Queries: What to listen for
 * - Mentions: Core mention data
 * - Analytics: KPIs and trends
 * - Influencers: Top influencers
 * - Competitors: Competitive benchmarking
 * - Alerts: Alert rules and events
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const authenticate = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const logger = require('../../../infrastructure/logger');
const {
    createSourceSchema,
    updateSourceSchema,
    createQuerySchema,
    updateQuerySchema,
    updateMentionSchema,
    createResponseSchema,
    createCompetitorSchema,
    updateCompetitorSchema,
    createAlertSchema,
    updateAlertSchema
} = require('../../schemas/social_listening.schemas');

// ============================================================================
// SOURCES - Connect/manage platform sources
// ============================================================================

/**
 * GET /api/v1/social-listening/sources
 * List all connected sources for tenant
 */
router.get('/sources', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(
            `SELECT id, tenant_id, platform, name, connection_type, config, status,
                    last_sync_at, sync_interval_minutes, error_message,
                    rate_limit_remaining, rate_limit_reset_at, created_at
             FROM sl_sources
             WHERE tenant_id = $1
             ORDER BY created_at DESC`,
            [tenantId]
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch sources', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch sources' });
    }
});

/**
 * POST /api/v1/social-listening/sources
 * Connect new platform source
 */
router.post('/sources', authenticate, validate(createSourceSchema), async (req, res) => {
    try {
        const { platform, name, connection_type, credentials, config, sync_interval_minutes } = req.body;
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;

        // TODO: Encrypt credentials before storing
        const result = await query(
            `INSERT INTO sl_sources (tenant_id, platform, name, connection_type, credentials, config, sync_interval_minutes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [tenantId, platform, name, connection_type, credentials, config || {}, sync_interval_minutes || 15, userId]
        );

        logger.info('[SocialListening] Source created', { sourceId: result.rows[0].id, platform });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to create source', { error: error.message });
        res.status(500).json({ error: 'Failed to create source' });
    }
});

/**
 * PUT /api/v1/social-listening/sources/:id
 * Update source configuration
 */
router.put('/sources/:id', authenticate, validate(updateSourceSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, config, status, sync_interval_minutes } = req.body;
        const tenantId = req.user.tenant_id;

        const updates = [];
        const values = [tenantId, id];
        let paramIndex = 3;

        if (name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (config) {
            updates.push(`config = $${paramIndex++}`);
            values.push(config);
        }
        if (status) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }
        if (sync_interval_minutes) {
            updates.push(`sync_interval_minutes = $${paramIndex++}`);
            values.push(sync_interval_minutes);
        }

        updates.push(`updated_at = NOW()`);

        const result = await query(
            `UPDATE sl_sources
             SET ${updates.join(', ')}
             WHERE tenant_id = $1 AND id = $2
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Source not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to update source', { error: error.message });
        res.status(500).json({ error: 'Failed to update source' });
    }
});

/**
 * DELETE /api/v1/social-listening/sources/:id
 * Disconnect source
 */
router.delete('/sources/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            'DELETE FROM sl_sources WHERE tenant_id = $1 AND id = $2 RETURNING id',
            [tenantId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Source not found' });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('[SocialListening] Failed to delete source', { error: error.message });
        res.status(500).json({ error: 'Failed to delete source' });
    }
});

/**
 * POST /api/v1/social-listening/sources/:id/test
 * Test source connection
 */
router.post('/sources/:id/test', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        // TODO: Implement connector test
        // For now, return mock success
        res.json({
            success: true,
            message: 'Connection test successful',
            quota: {
                remaining: 1500,
                limit: 2000,
                resetAt: new Date(Date.now() + 3600000).toISOString()
            }
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to test source', { error: error.message });
        res.status(500).json({ error: 'Failed to test source' });
    }
});

/**
 * POST /api/v1/social-listening/sources/:id/sync
 * Trigger manual sync
 */
router.post('/sources/:id/sync', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        // Update last_sync_at
        await query(
            'UPDATE sl_sources SET last_sync_at = NOW() WHERE tenant_id = $1 AND id = $2',
            [tenantId, id]
        );

        // TODO: Trigger actual ingestion
        logger.info('[SocialListening] Manual sync triggered', { sourceId: id });

        res.json({
            message: 'Sync started',
            startedAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to trigger sync', { error: error.message });
        res.status(500).json({ error: 'Failed to trigger sync' });
    }
});

// ============================================================================
// QUERIES - Keywords/brands to listen for
// ============================================================================

/**
 * GET /api/v1/social-listening/queries
 * List listening queries
 */
router.get('/queries', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(
            `SELECT id, tenant_id, name, keywords, excluded_keywords, languages, platforms, is_active, created_at
             FROM sl_queries
             WHERE tenant_id = $1
             ORDER BY created_at DESC`,
            [tenantId]
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch queries', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch queries' });
    }
});

/**
 * POST /api/v1/social-listening/queries
 * Create new query
 */
router.post('/queries', authenticate, validate(createQuerySchema), async (req, res) => {
    try {
        const { name, keywords, excluded_keywords, languages, platforms } = req.body;
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;

        const result = await query(
            `INSERT INTO sl_queries (tenant_id, name, keywords, excluded_keywords, languages, platforms, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [tenantId, name, keywords || [], excluded_keywords || [], languages || [], platforms || [], userId]
        );

        logger.info('[SocialListening] Query created', { queryId: result.rows[0].id });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to create query', { error: error.message });
        res.status(500).json({ error: 'Failed to create query' });
    }
});

/**
 * PUT /api/v1/social-listening/queries/:id
 * Update query
 */
router.put('/queries/:id', authenticate, validate(updateQuerySchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, keywords, excluded_keywords, languages, platforms, is_active } = req.body;
        const tenantId = req.user.tenant_id;

        const updates = [];
        const values = [tenantId, id];
        let paramIndex = 3;

        if (name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (keywords) {
            updates.push(`keywords = $${paramIndex++}`);
            values.push(keywords);
        }
        if (excluded_keywords) {
            updates.push(`excluded_keywords = $${paramIndex++}`);
            values.push(excluded_keywords);
        }
        if (languages) {
            updates.push(`languages = $${paramIndex++}`);
            values.push(languages);
        }
        if (platforms) {
            updates.push(`platforms = $${paramIndex++}`);
            values.push(platforms);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }

        updates.push(`updated_at = NOW()`);

        const result = await query(
            `UPDATE sl_queries
             SET ${updates.join(', ')}
             WHERE tenant_id = $1 AND id = $2
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Query not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to update query', { error: error.message });
        res.status(500).json({ error: 'Failed to update query' });
    }
});

/**
 * DELETE /api/v1/social-listening/queries/:id
 * Delete query
 */
router.delete('/queries/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            'DELETE FROM sl_queries WHERE tenant_id = $1 AND id = $2 RETURNING id',
            [tenantId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Query not found' });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('[SocialListening] Failed to delete query', { error: error.message });
        res.status(500).json({ error: 'Failed to delete query' });
    }
});

// ============================================================================
// MENTIONS - Core mention data
// ============================================================================

/**
 * GET /api/v1/social-listening/mentions
 * List mentions (paginated, filterable)
 */
router.get('/mentions', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const {
            platform,
            sentiment,
            intent,
            topic,
            status,
            date_from,
            date_to,
            limit = 50,
            offset = 0
        } = req.query;

        const conditions = ['tenant_id = $1'];
        const values = [tenantId];
        let paramIndex = 2;

        if (platform) {
            conditions.push(`platform = $${paramIndex++}`);
            values.push(platform);
        }
        if (sentiment) {
            conditions.push(`sentiment = $${paramIndex++}`);
            values.push(sentiment);
        }
        if (intent) {
            conditions.push(`intent = $${paramIndex++}`);
            values.push(intent);
        }
        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            values.push(status);
        }
        if (topic) {
            conditions.push(`topics @> $${paramIndex++}::jsonb`);
            values.push(JSON.stringify([topic]));
        }
        if (date_from) {
            conditions.push(`published_at >= $${paramIndex++}`);
            values.push(date_from);
        }
        if (date_to) {
            conditions.push(`published_at <= $${paramIndex++}`);
            values.push(date_to);
        }

        values.push(limit, offset);

        const result = await query(
            `SELECT id, platform, external_id, author_name, author_handle, author_avatar_url,
                    author_followers, author_verified, content, content_url, media_urls,
                    post_type, sentiment, sentiment_score, intent, topics, entities,
                    language, likes, shares, comments, reach, engagement_score,
                    status, assigned_to, published_at, ingested_at
             FROM sl_mentions
             WHERE ${conditions.join(' AND ')}
             ORDER BY published_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            values
        );

        // Get total count for pagination
        const countResult = await query(
            `SELECT COUNT(*) as total FROM sl_mentions WHERE ${conditions.join(' AND ')}`,
            values.slice(0, values.length - 2)
        );

        res.json({
            mentions: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch mentions', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch mentions' });
    }
});

/**
 * GET /api/v1/social-listening/mentions/:id
 * Get single mention with thread
 */
router.get('/mentions/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            'SELECT * FROM sl_mentions WHERE tenant_id = $1 AND id = $2',
            [tenantId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mention not found' });
        }

        const mention = result.rows[0];

        // Get thread (parent and children)
        const threadResult = await query(
            `SELECT * FROM sl_mentions
             WHERE tenant_id = $1 AND (id = $2 OR parent_id = $2 OR id = $3)
             ORDER BY published_at ASC`,
            [tenantId, mention.parent_id || id, mention.parent_id || id]
        );

        res.json({
            mention,
            thread: threadResult.rows
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch mention', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch mention' });
    }
});

/**
 * PUT /api/v1/social-listening/mentions/:id
 * Update mention status/assignment
 */
router.put('/mentions/:id', authenticate, validate(updateMentionSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assigned_to } = req.body;
        const tenantId = req.user.tenant_id;

        const updates = [];
        const values = [tenantId, id];
        let paramIndex = 3;

        if (status) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }
        if (assigned_to !== undefined) {
            updates.push(`assigned_to = $${paramIndex++}`);
            values.push(assigned_to);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await query(
            `UPDATE sl_mentions
             SET ${updates.join(', ')}
             WHERE tenant_id = $1 AND id = $2
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mention not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to update mention', { error: error.message });
        res.status(500).json({ error: 'Failed to update mention' });
    }
});

/**
 * POST /api/v1/social-listening/mentions/:id/respond
 * Draft/send reply to mention
 */
router.post('/mentions/:id/respond', authenticate, validate(createResponseSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { response_text, response_type, send_immediately } = req.body;
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;

        // Verify mention exists
        const mentionResult = await query(
            'SELECT id FROM sl_mentions WHERE tenant_id = $1 AND id = $2',
            [tenantId, id]
        );

        if (mentionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Mention not found' });
        }

        const status = send_immediately ? 'sent' : 'draft';
        const sent_at = send_immediately ? new Date() : null;

        const result = await query(
            `INSERT INTO sl_mention_responses (tenant_id, mention_id, response_text, response_type, status, sent_at, sent_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [tenantId, id, response_text, response_type || 'manual', status, sent_at, userId]
        );

        // TODO: If send_immediately, call platform API to post reply

        logger.info('[SocialListening] Response created', { responseId: result.rows[0].id, status });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to create response', { error: error.message });
        res.status(500).json({ error: 'Failed to create response' });
    }
});

/**
 * POST /api/v1/social-listening/mentions/import
 * CSV bulk import
 */
router.post('/mentions/import', authenticate, async (req, res) => {
    try {
        const { mentions } = req.body; // Array of mention objects
        const tenantId = req.user.tenant_id;

        if (!Array.isArray(mentions) || mentions.length === 0) {
            return res.status(400).json({ error: 'Invalid mentions array' });
        }

        let imported = 0;
        let skipped = 0;

        for (const mention of mentions) {
            try {
                // Insert with ON CONFLICT DO NOTHING to handle duplicates
                const result = await query(
                    `INSERT INTO sl_mentions (
                        tenant_id, platform, external_id, author_name, author_handle,
                        content, content_url, post_type, published_at, ingested_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                    ON CONFLICT (tenant_id, platform, external_id) DO NOTHING
                    RETURNING id`,
                    [
                        tenantId,
                        mention.platform,
                        mention.external_id,
                        mention.author_name,
                        mention.author_handle,
                        mention.content,
                        mention.content_url,
                        mention.post_type || 'post',
                        mention.published_at
                    ]
                );

                if (result.rows.length > 0) {
                    imported++;
                } else {
                    skipped++;
                }
            } catch (err) {
                logger.error('[SocialListening] Failed to import mention', { error: err.message });
                skipped++;
            }
        }

        res.json({
            imported,
            skipped,
            total: mentions.length
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to import mentions', { error: error.message });
        res.status(500).json({ error: 'Failed to import mentions' });
    }
});

// ============================================================================
// ANALYTICS - KPIs and trends
// ============================================================================

/**
 * GET /api/v1/social-listening/analytics/overview
 * KPI metrics
 */
router.get('/analytics/overview', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { date_from, date_to } = req.query;

        const conditions = ['tenant_id = $1'];
        const values = [tenantId];
        let paramIndex = 2;

        if (date_from) {
            conditions.push(`published_at >= $${paramIndex++}`);
            values.push(date_from);
        }
        if (date_to) {
            conditions.push(`published_at <= $${paramIndex++}`);
            values.push(date_to);
        }

        const whereClause = conditions.join(' AND ');

        // Total mentions
        const totalResult = await query(
            `SELECT COUNT(*) as total FROM sl_mentions WHERE ${whereClause}`,
            values
        );

        // Average sentiment
        const sentimentResult = await query(
            `SELECT AVG(sentiment_score) as avg_sentiment FROM sl_mentions WHERE ${whereClause} AND sentiment_score IS NOT NULL`,
            values
        );

        // By platform
        const platformResult = await query(
            `SELECT platform, COUNT(*) as count FROM sl_mentions WHERE ${whereClause} GROUP BY platform ORDER BY count DESC`,
            values
        );

        // By intent
        const intentResult = await query(
            `SELECT intent, COUNT(*) as count FROM sl_mentions WHERE ${whereClause} GROUP BY intent ORDER BY count DESC`,
            values
        );

        // By sentiment
        const sentimentBreakdownResult = await query(
            `SELECT sentiment, COUNT(*) as count FROM sl_mentions WHERE ${whereClause} GROUP BY sentiment`,
            values
        );

        res.json({
            total_mentions: parseInt(totalResult.rows[0].total),
            avg_sentiment: parseFloat(sentimentResult.rows[0].avg_sentiment) || 0,
            by_platform: platformResult.rows,
            by_intent: intentResult.rows,
            by_sentiment: sentimentBreakdownResult.rows
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch overview', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
});

/**
 * GET /api/v1/social-listening/analytics/sentiment-trend
 * Sentiment over time (line chart data)
 */
router.get('/analytics/sentiment-trend', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { date_from, date_to, interval = 'day' } = req.query;

        const dateFormat = interval === 'hour' ? 'YYYY-MM-DD HH24:00:00' :
                          interval === 'day' ? 'YYYY-MM-DD' :
                          'YYYY-MM';

        const result = await query(
            `SELECT
                TO_CHAR(published_at, $3) as period,
                AVG(sentiment_score) as avg_sentiment,
                COUNT(*) as mention_count
             FROM sl_mentions
             WHERE tenant_id = $1 AND published_at BETWEEN $4 AND $5 AND sentiment_score IS NOT NULL
             GROUP BY period
             ORDER BY period ASC`,
            [tenantId, dateFormat, date_from || '1970-01-01', date_to || '2099-12-31']
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch sentiment trend', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch sentiment trend' });
    }
});

/**
 * GET /api/v1/social-listening/analytics/volume-trend
 * Volume over time by platform (stacked area)
 */
router.get('/analytics/volume-trend', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { date_from, date_to, interval = 'day' } = req.query;

        const dateFormat = interval === 'hour' ? 'YYYY-MM-DD HH24:00:00' :
                          interval === 'day' ? 'YYYY-MM-DD' :
                          'YYYY-MM';

        const result = await query(
            `SELECT
                TO_CHAR(published_at, $2) as period,
                platform,
                COUNT(*) as count
             FROM sl_mentions
             WHERE tenant_id = $1 AND published_at BETWEEN $3 AND $4
             GROUP BY period, platform
             ORDER BY period ASC, platform`,
            [tenantId, dateFormat, date_from || '1970-01-01', date_to || '2099-12-31']
        );

        // Reshape for frontend (period → {twitter: X, facebook: Y})
        const reshaped = {};
        result.rows.forEach(row => {
            if (!reshaped[row.period]) {
                reshaped[row.period] = { period: row.period };
            }
            reshaped[row.period][row.platform] = parseInt(row.count);
        });

        res.json(Object.values(reshaped));
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch volume trend', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch volume trend' });
    }
});

/**
 * GET /api/v1/social-listening/analytics/topics
 * Topic distribution with counts + sentiment
 */
router.get('/analytics/topics', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(
            `SELECT id, name, mention_count, avg_sentiment, is_trending, trend_direction, trend_change_pct
             FROM sl_topics
             WHERE tenant_id = $1
             ORDER BY mention_count DESC
             LIMIT 50`,
            [tenantId]
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch topics', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch topics' });
    }
});

/**
 * GET /api/v1/social-listening/analytics/geo
 * Geographic distribution
 */
router.get('/analytics/geo', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(
            `SELECT
                geo_country,
                geo_region,
                geo_city,
                COUNT(*) as mention_count,
                AVG(sentiment_score) as avg_sentiment
             FROM sl_mentions
             WHERE tenant_id = $1 AND geo_country IS NOT NULL
             GROUP BY geo_country, geo_region, geo_city
             ORDER BY mention_count DESC
             LIMIT 100`,
            [tenantId]
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch geo data', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch geo data' });
    }
});

/**
 * GET /api/v1/social-listening/analytics/share-of-voice
 * Brand vs competitors SOV
 */
router.get('/analytics/share-of-voice', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        // Get own mentions
        const ownResult = await query(
            `SELECT COUNT(*) as count FROM sl_mentions WHERE tenant_id = $1`,
            [tenantId]
        );
        const ownCount = parseInt(ownResult.rows[0].count);

        // Get competitor mentions
        const competitorsResult = await query(
            `SELECT id, name, mention_count FROM sl_competitors WHERE tenant_id = $1`,
            [tenantId]
        );

        const totalMentions = ownCount + competitorsResult.rows.reduce((sum, c) => sum + c.mention_count, 0);

        const shareOfVoice = {
            own: {
                name: 'Your Brand',
                mentions: ownCount,
                share: totalMentions > 0 ? (ownCount / totalMentions * 100).toFixed(2) : 0
            },
            competitors: competitorsResult.rows.map(c => ({
                id: c.id,
                name: c.name,
                mentions: c.mention_count,
                share: totalMentions > 0 ? (c.mention_count / totalMentions * 100).toFixed(2) : 0
            }))
        };

        res.json(shareOfVoice);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch share of voice', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch share of voice' });
    }
});

/**
 * GET /api/v1/social-listening/analytics/campaign-impact
 * Link SMM campaigns to listening data
 */
router.get('/analytics/campaign-impact', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { campaign_id } = req.query;

        // TODO: Implement campaign hashtag/keyword matching
        // For now, return mock data
        res.json({
            campaign_id,
            mentions_generated: 150,
            engagement_rate: 4.2,
            sentiment_improvement: 12.5,
            top_hashtags: ['#RayiX', '#CX', '#CustomerExperience']
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch campaign impact', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch campaign impact' });
    }
});

// ============================================================================
// INFLUENCERS - Top influencers
// ============================================================================

/**
 * GET /api/v1/social-listening/influencers
 * List top influencers (sorted by influence_score)
 */
router.get('/influencers', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { platform, limit = 50 } = req.query;

        const conditions = ['tenant_id = $1'];
        const values = [tenantId];
        let paramIndex = 2;

        if (platform) {
            conditions.push(`platform = $${paramIndex++}`);
            values.push(platform);
        }

        values.push(limit);

        const result = await query(
            `SELECT id, platform, handle, display_name, avatar_url, follower_count,
                    mention_count, avg_sentiment, influence_score, reach_estimate,
                    is_verified, last_mention_at, profile_url
             FROM sl_influencers
             WHERE ${conditions.join(' AND ')}
             ORDER BY influence_score DESC
             LIMIT $${paramIndex}`,
            values
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch influencers', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch influencers' });
    }
});

/**
 * GET /api/v1/social-listening/influencers/:id
 * Influencer detail + mention history
 */
router.get('/influencers/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const influencerResult = await query(
            'SELECT * FROM sl_influencers WHERE tenant_id = $1 AND id = $2',
            [tenantId, id]
        );

        if (influencerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Influencer not found' });
        }

        const influencer = influencerResult.rows[0];

        // Get their mentions
        const mentionsResult = await query(
            `SELECT id, content, sentiment, sentiment_score, likes, shares, comments, published_at
             FROM sl_mentions
             WHERE tenant_id = $1 AND author_handle = $2
             ORDER BY published_at DESC
             LIMIT 20`,
            [tenantId, influencer.handle]
        );

        res.json({
            ...influencer,
            mentions: mentionsResult.rows
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch influencer', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch influencer' });
    }
});

// ============================================================================
// COMPETITORS - Competitive benchmarking
// ============================================================================

/**
 * GET /api/v1/social-listening/competitors
 * List competitors
 */
router.get('/competitors', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(
            `SELECT id, name, keywords, logo_url, mention_count, avg_sentiment, share_of_voice, created_at
             FROM sl_competitors
             WHERE tenant_id = $1
             ORDER BY mention_count DESC`,
            [tenantId]
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch competitors', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch competitors' });
    }
});

/**
 * POST /api/v1/social-listening/competitors
 * Add competitor
 */
router.post('/competitors', authenticate, validate(createCompetitorSchema), async (req, res) => {
    try {
        const { name, keywords, logo_url } = req.body;
        const tenantId = req.user.tenant_id;

        const result = await query(
            `INSERT INTO sl_competitors (tenant_id, name, keywords, logo_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [tenantId, name, keywords || [], logo_url]
        );

        logger.info('[SocialListening] Competitor added', { competitorId: result.rows[0].id });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to add competitor', { error: error.message });
        res.status(500).json({ error: 'Failed to add competitor' });
    }
});

/**
 * PUT /api/v1/social-listening/competitors/:id
 * Update competitor
 */
router.put('/competitors/:id', authenticate, validate(updateCompetitorSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, keywords, logo_url } = req.body;
        const tenantId = req.user.tenant_id;

        const updates = [];
        const values = [tenantId, id];
        let paramIndex = 3;

        if (name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (keywords) {
            updates.push(`keywords = $${paramIndex++}`);
            values.push(keywords);
        }
        if (logo_url) {
            updates.push(`logo_url = $${paramIndex++}`);
            values.push(logo_url);
        }

        updates.push(`updated_at = NOW()`);

        const result = await query(
            `UPDATE sl_competitors
             SET ${updates.join(', ')}
             WHERE tenant_id = $1 AND id = $2
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Competitor not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to update competitor', { error: error.message });
        res.status(500).json({ error: 'Failed to update competitor' });
    }
});

/**
 * DELETE /api/v1/social-listening/competitors/:id
 * Remove competitor
 */
router.delete('/competitors/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            'DELETE FROM sl_competitors WHERE tenant_id = $1 AND id = $2 RETURNING id',
            [tenantId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Competitor not found' });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('[SocialListening] Failed to delete competitor', { error: error.message });
        res.status(500).json({ error: 'Failed to delete competitor' });
    }
});

/**
 * GET /api/v1/social-listening/competitors/benchmarks
 * Competitive benchmarks
 */
router.get('/competitors/benchmarks', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        // Get own metrics
        const ownResult = await query(
            `SELECT
                COUNT(*) as mention_count,
                AVG(sentiment_score) as avg_sentiment,
                AVG(engagement_score) as avg_engagement
             FROM sl_mentions
             WHERE tenant_id = $1`,
            [tenantId]
        );

        // Get competitors metrics
        const competitorsResult = await query(
            `SELECT name, mention_count, avg_sentiment FROM sl_competitors WHERE tenant_id = $1`,
            [tenantId]
        );

        res.json({
            own: {
                name: 'Your Brand',
                mention_count: parseInt(ownResult.rows[0].mention_count),
                avg_sentiment: parseFloat(ownResult.rows[0].avg_sentiment) || 0,
                avg_engagement: parseFloat(ownResult.rows[0].avg_engagement) || 0
            },
            competitors: competitorsResult.rows
        });
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch benchmarks', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch benchmarks' });
    }
});

// ============================================================================
// ALERTS - Alert rules and events
// ============================================================================

/**
 * GET /api/v1/social-listening/alerts
 * List alert rules
 */
router.get('/alerts', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const result = await query(
            `SELECT id, name, rule_type, conditions, actions, platforms, is_active,
                    last_triggered_at, trigger_count, cooldown_minutes, created_at
             FROM sl_alerts
             WHERE tenant_id = $1
             ORDER BY created_at DESC`,
            [tenantId]
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch alerts', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

/**
 * POST /api/v1/social-listening/alerts
 * Create alert rule
 */
router.post('/alerts', authenticate, validate(createAlertSchema), async (req, res) => {
    try {
        const { name, rule_type, conditions, actions, platforms, cooldown_minutes } = req.body;
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;

        const result = await query(
            `INSERT INTO sl_alerts (tenant_id, name, rule_type, conditions, actions, platforms, cooldown_minutes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [tenantId, name, rule_type, conditions || {}, actions || [], platforms || [], cooldown_minutes || 60, userId]
        );

        logger.info('[SocialListening] Alert created', { alertId: result.rows[0].id });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to create alert', { error: error.message });
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

/**
 * PUT /api/v1/social-listening/alerts/:id
 * Update alert rule
 */
router.put('/alerts/:id', authenticate, validate(updateAlertSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, conditions, actions, platforms, is_active, cooldown_minutes } = req.body;
        const tenantId = req.user.tenant_id;

        const updates = [];
        const values = [tenantId, id];
        let paramIndex = 3;

        if (name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (conditions) {
            updates.push(`conditions = $${paramIndex++}`);
            values.push(conditions);
        }
        if (actions) {
            updates.push(`actions = $${paramIndex++}`);
            values.push(actions);
        }
        if (platforms) {
            updates.push(`platforms = $${paramIndex++}`);
            values.push(platforms);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        if (cooldown_minutes) {
            updates.push(`cooldown_minutes = $${paramIndex++}`);
            values.push(cooldown_minutes);
        }

        updates.push(`updated_at = NOW()`);

        const result = await query(
            `UPDATE sl_alerts
             SET ${updates.join(', ')}
             WHERE tenant_id = $1 AND id = $2
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to update alert', { error: error.message });
        res.status(500).json({ error: 'Failed to update alert' });
    }
});

/**
 * DELETE /api/v1/social-listening/alerts/:id
 * Delete alert rule
 */
router.delete('/alerts/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            'DELETE FROM sl_alerts WHERE tenant_id = $1 AND id = $2 RETURNING id',
            [tenantId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('[SocialListening] Failed to delete alert', { error: error.message });
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

/**
 * GET /api/v1/social-listening/alerts/events
 * List alert events
 */
router.get('/alerts/events', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { status, limit = 50, offset = 0 } = req.query;

        const conditions = ['e.tenant_id = $1'];
        const values = [tenantId];
        let paramIndex = 2;

        if (status) {
            conditions.push(`e.status = $${paramIndex++}`);
            values.push(status);
        }

        values.push(limit, offset);

        const result = await query(
            `SELECT e.id, e.alert_id, e.mention_id, e.event_type, e.event_data, e.status,
                    e.actioned_by, e.actioned_at, e.created_at,
                    a.name as alert_name,
                    m.content as mention_content, m.author_handle
             FROM sl_alert_events e
             LEFT JOIN sl_alerts a ON a.id = e.alert_id
             LEFT JOIN sl_mentions m ON m.id = e.mention_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY e.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            values
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('[SocialListening] Failed to fetch alert events', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch alert events' });
    }
});

/**
 * PUT /api/v1/social-listening/alerts/events/:id
 * Action/dismiss alert event
 */
router.put('/alerts/events/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'actioned' or 'dismissed'
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;

        if (!['actioned', 'dismissed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be actioned or dismissed' });
        }

        const result = await query(
            `UPDATE sl_alert_events
             SET status = $3, actioned_by = $4, actioned_at = NOW()
             WHERE tenant_id = $1 AND id = $2
             RETURNING *`,
            [tenantId, id, status, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alert event not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('[SocialListening] Failed to action alert event', { error: error.message });
        res.status(500).json({ error: 'Failed to action alert event' });
    }
});

// ============================================================================
// RESPONSES - Mention response management
// ============================================================================
// Mount response management routes
router.use('/responses', require('./responses'));

// ============================================================================
// AI PROCESSING - AI analysis endpoints
// ============================================================================
// Mount AI processing routes
router.use('/ai', require('./ai'));

// ============================================================================
// DATA SYNC - Synchronization endpoints
// ============================================================================
// Mount data sync routes
router.use('/sync', require('./sync'));

module.exports = router;
