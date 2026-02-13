const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const logger = require('../../../infrastructure/logger');
const authenticate = require('../../middleware/auth');

/**
 * Sentiment Analytics Routes
 *
 * Provides 5 endpoints for querying sentiment analysis data:
 * 1. /overview - Aggregate sentiment metrics
 * 2. /timeline - Sentiment trends over time
 * 3. /by-question - Per-field sentiment breakdown
 * 4. /themes - Top extracted themes
 * 5. /submissions - Filtered submission list
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/analytics/sentiment/overview:
 *   get:
 *     summary: Get sentiment overview metrics
 *     tags: [Sentiment Analytics]
 *     parameters:
 *       - in: query
 *         name: formId
 *         schema:
 *           type: integer
 *         description: Filter by form ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Sentiment overview data
 */
router.get('/overview', async (req, res) => {
    try {
        const { formId, startDate, endDate } = req.query;
        const tenantId = req.user.tenant_id;

        // Build WHERE clause
        const conditions = ['s.tenant_id = $1'];
        const params = [tenantId];
        let paramIndex = 2;

        if (formId) {
            conditions.push(`s.form_id = $${paramIndex++}`);
            params.push(formId);
        }

        if (startDate) {
            conditions.push(`s.created_at >= $${paramIndex++}`);
            params.push(startDate);
        }

        if (endDate) {
            conditions.push(`s.created_at <= $${paramIndex++}`);
            params.push(endDate);
        }

        const whereClause = conditions.join(' AND ');

        // Query for overview metrics
        const overviewQuery = `
            SELECT
                COUNT(*) as total_responses,
                COUNT(CASE WHEN analysis->'sentiment' IS NOT NULL THEN 1 END) as analyzed_count,
                AVG((analysis->'sentiment'->'aggregate'->>'score')::numeric) as avg_score,
                COUNT(CASE WHEN (analysis->'sentiment'->'aggregate'->>'score')::numeric > 0.3 THEN 1 END) as positive_count,
                COUNT(CASE WHEN (analysis->'sentiment'->'aggregate'->>'score')::numeric BETWEEN -0.3 AND 0.3 THEN 1 END) as neutral_count,
                COUNT(CASE WHEN (analysis->'sentiment'->'aggregate'->>'score')::numeric < -0.3 THEN 1 END) as negative_count,
                COUNT(CASE WHEN (analysis->'sentiment'->>'flagged')::boolean = true THEN 1 END) as flagged_count
            FROM submissions s
            WHERE ${whereClause}
        `;

        const overviewResult = await query(overviewQuery, params);
        const overview = overviewResult.rows[0];

        // Query for emotion distribution
        const emotionQuery = `
            SELECT
                analysis->'sentiment'->'aggregate'->>'emotion' as emotion,
                COUNT(*) as count
            FROM submissions s
            WHERE ${whereClause}
                AND analysis->'sentiment'->'aggregate'->>'emotion' IS NOT NULL
            GROUP BY emotion
            ORDER BY count DESC
        `;

        const emotionResult = await query(emotionQuery, params);

        const responseData = {
            totalResponses: parseInt(overview.total_responses),
            analyzedCount: parseInt(overview.analyzed_count),
            avgScore: overview.avg_score ? parseFloat(overview.avg_score).toFixed(2) : 0,
            distribution: {
                positive: parseInt(overview.positive_count || 0),
                neutral: parseInt(overview.neutral_count || 0),
                negative: parseInt(overview.negative_count || 0)
            },
            flaggedCount: parseInt(overview.flagged_count || 0),
            emotions: emotionResult.rows.map(row => ({
                emotion: row.emotion,
                count: parseInt(row.count)
            }))
        };

        res.json(responseData);

    } catch (error) {
        logger.error('Sentiment overview query failed', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch sentiment overview' });
    }
});

/**
 * @swagger
 * /api/analytics/sentiment/timeline:
 *   get:
 *     summary: Get sentiment trend over time
 *     tags: [Sentiment Analytics]
 *     parameters:
 *       - in: query
 *         name: formId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Grouping interval (default: day)
 *     responses:
 *       200:
 *         description: Sentiment timeline data
 */
router.get('/timeline', async (req, res) => {
    try {
        const { formId, startDate, endDate, interval = 'day' } = req.query;
        const tenantId = req.user.tenant_id;

        // Validate interval
        const validIntervals = ['day', 'week', 'month'];
        if (!validIntervals.includes(interval)) {
            return res.status(400).json({ error: 'Invalid interval. Must be day, week, or month' });
        }

        // Determine date format based on interval
        const dateFormat = {
            day: 'YYYY-MM-DD',
            week: 'IYYY-IW', // ISO week format
            month: 'YYYY-MM'
        }[interval];

        // Build WHERE clause
        const conditions = ['s.tenant_id = $1', "analysis->'sentiment' IS NOT NULL"];
        const params = [tenantId];
        let paramIndex = 2;

        if (formId) {
            conditions.push(`s.form_id = $${paramIndex++}`);
            params.push(formId);
        }

        if (startDate) {
            conditions.push(`s.created_at >= $${paramIndex++}`);
            params.push(startDate);
        }

        if (endDate) {
            conditions.push(`s.created_at <= $${paramIndex++}`);
            params.push(endDate);
        }

        const whereClause = conditions.join(' AND ');

        const timelineQuery = `
            SELECT
                TO_CHAR(s.created_at, '${dateFormat}') as period,
                AVG((analysis->'sentiment'->'aggregate'->>'score')::numeric) as avg_score,
                COUNT(CASE WHEN (analysis->'sentiment'->'aggregate'->>'score')::numeric > 0.3 THEN 1 END) as positive,
                COUNT(CASE WHEN (analysis->'sentiment'->'aggregate'->>'score')::numeric BETWEEN -0.3 AND 0.3 THEN 1 END) as neutral,
                COUNT(CASE WHEN (analysis->'sentiment'->'aggregate'->>'score')::numeric < -0.3 THEN 1 END) as negative,
                COUNT(*) as total
            FROM submissions s
            WHERE ${whereClause}
            GROUP BY period
            ORDER BY period ASC
        `;

        const result = await query(timelineQuery, params);

        const timeline = result.rows.map(row => ({
            period: row.period,
            avgScore: parseFloat(row.avg_score).toFixed(2),
            positive: parseInt(row.positive),
            neutral: parseInt(row.neutral),
            negative: parseInt(row.negative),
            total: parseInt(row.total)
        }));

        res.json({ timeline });

    } catch (error) {
        logger.error('Sentiment timeline query failed', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch sentiment timeline' });
    }
});

/**
 * @swagger
 * /api/analytics/sentiment/by-question:
 *   get:
 *     summary: Get sentiment breakdown by question/field
 *     tags: [Sentiment Analytics]
 *     parameters:
 *       - in: query
 *         name: formId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Per-question sentiment data
 */
router.get('/by-question', async (req, res) => {
    try {
        const { formId, startDate, endDate } = req.query;
        const tenantId = req.user.tenant_id;

        // Build WHERE clause
        const conditions = ['s.tenant_id = $1', "analysis->'sentiment'->'fields' IS NOT NULL"];
        const params = [tenantId];
        let paramIndex = 2;

        if (formId) {
            conditions.push(`s.form_id = $${paramIndex++}`);
            params.push(formId);
        }

        if (startDate) {
            conditions.push(`s.created_at >= $${paramIndex++}`);
            params.push(startDate);
        }

        if (endDate) {
            conditions.push(`s.created_at <= $${paramIndex++}`);
            params.push(endDate);
        }

        const whereClause = conditions.join(' AND ');

        // Query to extract and aggregate field-level sentiment
        const fieldsQuery = `
            SELECT
                field_data.key as field_name,
                AVG((field_data.value->>'score')::numeric) as avg_score,
                COUNT(*) as response_count,
                jsonb_object_agg(
                    field_data.value->>'emotion',
                    1
                ) FILTER (WHERE field_data.value->>'emotion' IS NOT NULL) as emotions
            FROM submissions s,
            LATERAL jsonb_each(s.analysis->'sentiment'->'fields') as field_data
            WHERE ${whereClause}
            GROUP BY field_name
            ORDER BY response_count DESC
            LIMIT 20
        `;

        const result = await query(fieldsQuery, params);

        const fields = result.rows.map(row => ({
            fieldName: row.field_name,
            avgScore: parseFloat(row.avg_score).toFixed(2),
            responseCount: parseInt(row.response_count),
            emotions: row.emotions || {}
        }));

        res.json({ fields });

    } catch (error) {
        logger.error('Sentiment by-question query failed', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch per-question sentiment' });
    }
});

/**
 * @swagger
 * /api/analytics/sentiment/themes:
 *   get:
 *     summary: Get top sentiment themes
 *     tags: [Sentiment Analytics]
 *     parameters:
 *       - in: query
 *         name: formId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Top themes extracted from sentiment analysis
 */
router.get('/themes', async (req, res) => {
    try {
        const { formId, startDate, endDate, limit = 20 } = req.query;
        const tenantId = req.user.tenant_id;

        // Build WHERE clause
        const conditions = ['s.tenant_id = $1', "analysis->'sentiment'->'themes' IS NOT NULL"];
        const params = [tenantId];
        let paramIndex = 2;

        if (formId) {
            conditions.push(`s.form_id = $${paramIndex++}`);
            params.push(formId);
        }

        if (startDate) {
            conditions.push(`s.created_at >= $${paramIndex++}`);
            params.push(startDate);
        }

        if (endDate) {
            conditions.push(`s.created_at <= $${paramIndex++}`);
            params.push(endDate);
        }

        const whereClause = conditions.join(' AND ');

        // Extract and count themes
        const themesQuery = `
            SELECT
                theme_element.value::text as theme,
                COUNT(*) as count
            FROM submissions s,
            LATERAL jsonb_array_elements_text(s.analysis->'sentiment'->'themes') as theme_element
            WHERE ${whereClause}
            GROUP BY theme
            ORDER BY count DESC
            LIMIT $${paramIndex}
        `;

        params.push(parseInt(limit));

        const result = await query(themesQuery, params);

        const themes = result.rows.map(row => ({
            theme: row.theme.replace(/^"|"$/g, ''), // Remove quotes
            count: parseInt(row.count)
        }));

        res.json({ themes });

    } catch (error) {
        logger.error('Sentiment themes query failed', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch sentiment themes' });
    }
});

/**
 * @swagger
 * /api/analytics/sentiment/submissions:
 *   get:
 *     summary: Get submissions filtered by sentiment
 *     tags: [Sentiment Analytics]
 *     parameters:
 *       - in: query
 *         name: formId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *           enum: [positive, neutral, negative]
 *       - in: query
 *         name: emotion
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Filtered submission list
 */
router.get('/submissions', async (req, res) => {
    try {
        const { formId, sentiment, emotion, limit = 50, offset = 0 } = req.query;
        const tenantId = req.user.tenant_id;

        // Build WHERE clause
        const conditions = ['s.tenant_id = $1', "analysis->'sentiment' IS NOT NULL"];
        const params = [tenantId];
        let paramIndex = 2;

        if (formId) {
            conditions.push(`s.form_id = $${paramIndex++}`);
            params.push(formId);
        }

        // Filter by sentiment range
        if (sentiment) {
            const sentimentRanges = {
                positive: "(analysis->'sentiment'->'aggregate'->>'score')::numeric > 0.3",
                neutral: "(analysis->'sentiment'->'aggregate'->>'score')::numeric BETWEEN -0.3 AND 0.3",
                negative: "(analysis->'sentiment'->'aggregate'->>'score')::numeric < -0.3"
            };

            if (sentimentRanges[sentiment]) {
                conditions.push(sentimentRanges[sentiment]);
            }
        }

        // Filter by emotion
        if (emotion) {
            conditions.push(`analysis->'sentiment'->'aggregate'->>'emotion' = $${paramIndex++}`);
            params.push(emotion);
        }

        const whereClause = conditions.join(' AND ');

        // Query for submissions
        const submissionsQuery = `
            SELECT
                s.id,
                s.form_id,
                s.data,
                s.created_at,
                s.analysis->'sentiment' as sentiment
            FROM submissions s
            WHERE ${whereClause}
            ORDER BY s.created_at DESC
            LIMIT $${paramIndex++}
            OFFSET $${paramIndex++}
        `;

        params.push(parseInt(limit), parseInt(offset));

        const result = await query(submissionsQuery, params);

        // Count total for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM submissions s
            WHERE ${whereClause}
        `;

        const countResult = await query(countQuery, params.slice(0, paramIndex - 2));

        const submissions = result.rows.map(row => ({
            id: row.id,
            formId: row.form_id,
            data: row.data,
            createdAt: row.created_at,
            sentiment: row.sentiment
        }));

        res.json({
            submissions,
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        logger.error('Sentiment submissions query failed', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

module.exports = router;
