const express = require('express');
const router = express.Router();
const SurveySentimentService = require('../../services/SurveySentimentService');
const { authenticate } = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

/**
 * Sentiment Analysis API Routes
 *
 * Provides endpoints for analyzing survey response sentiment using AI.
 */

/**
 * @route   POST /api/sentiment/analyze
 * @desc    Analyze sentiment for a single response
 * @access  Private
 * @body    {submissionId, questionId, responseText, options}
 */
router.post('/analyze', authenticate, async (req, res) => {
    try {
        const { submissionId, questionId, responseText, options } = req.body;
        const tenantId = req.user.tenant_id;

        // Validate required fields
        if (!submissionId || !questionId || !responseText) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: submissionId, questionId, responseText'
            });
        }

        logger.info('[SentimentAPI] Analyzing single response', {
            tenantId,
            submissionId,
            questionId,
            userId: req.user.id
        });

        const result = await SurveySentimentService.analyzeResponse(
            tenantId,
            submissionId,
            questionId,
            responseText,
            options || {}
        );

        if (!result) {
            return res.status(200).json({
                success: true,
                message: 'Response too short to analyze',
                data: null
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[SentimentAPI] Failed to analyze response', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Failed to analyze response',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   POST /api/sentiment/analyze-submission
 * @desc    Analyze sentiment for all text responses in a submission
 * @access  Private
 * @body    {submissionId, responses}
 */
router.post('/analyze-submission', authenticate, async (req, res) => {
    try {
        const { submissionId, responses } = req.body;
        const tenantId = req.user.tenant_id;

        // Validate required fields
        if (!submissionId || !responses || !Array.isArray(responses)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: submissionId, responses (array)'
            });
        }

        logger.info('[SentimentAPI] Analyzing submission', {
            tenantId,
            submissionId,
            responseCount: responses.length,
            userId: req.user.id
        });

        const results = await SurveySentimentService.analyzeSubmission(
            tenantId,
            submissionId,
            responses
        );

        res.json({
            success: true,
            data: {
                submissionId,
                analyzedCount: results.length,
                results
            }
        });
    } catch (error) {
        logger.error('[SentimentAPI] Failed to analyze submission', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Failed to analyze submission',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/sentiment/stats/:formId
 * @desc    Get sentiment statistics for a form
 * @access  Private
 * @query   none
 */
router.get('/stats/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const tenantId = req.user.tenant_id;

        // Validate formId
        if (!formId || isNaN(parseInt(formId))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid formId parameter'
            });
        }

        logger.info('[SentimentAPI] Getting sentiment stats', {
            tenantId,
            formId: parseInt(formId),
            userId: req.user.id
        });

        const stats = await SurveySentimentService.getFormSentimentStats(
            tenantId,
            parseInt(formId)
        );

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('[SentimentAPI] Failed to get sentiment stats', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Failed to get sentiment statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/sentiment/trend/:formId
 * @desc    Get sentiment trend over time for a form
 * @access  Private
 * @query   days (optional, default: 30)
 */
router.get('/trend/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const days = parseInt(req.query.days) || 30;
        const tenantId = req.user.tenant_id;

        // Validate formId
        if (!formId || isNaN(parseInt(formId))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid formId parameter'
            });
        }

        // Validate days range
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                message: 'Days parameter must be between 1 and 365'
            });
        }

        logger.info('[SentimentAPI] Getting sentiment trend', {
            tenantId,
            formId: parseInt(formId),
            days,
            userId: req.user.id
        });

        const trend = await SurveySentimentService.getSentimentTrend(
            tenantId,
            parseInt(formId),
            days
        );

        res.json({
            success: true,
            data: {
                formId: parseInt(formId),
                days,
                trend
            }
        });
    } catch (error) {
        logger.error('[SentimentAPI] Failed to get sentiment trend', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Failed to get sentiment trend',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/sentiment/keywords/:formId
 * @desc    Get top keywords from responses
 * @access  Private
 * @query   limit (optional, default: 20)
 */
router.get('/keywords/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const tenantId = req.user.tenant_id;

        // Validate formId
        if (!formId || isNaN(parseInt(formId))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid formId parameter'
            });
        }

        // Validate limit range
        if (limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Limit parameter must be between 1 and 100'
            });
        }

        logger.info('[SentimentAPI] Getting top keywords', {
            tenantId,
            formId: parseInt(formId),
            limit,
            userId: req.user.id
        });

        const keywords = await SurveySentimentService.getTopKeywords(
            tenantId,
            parseInt(formId),
            limit
        );

        res.json({
            success: true,
            data: {
                formId: parseInt(formId),
                limit,
                keywords
            }
        });
    } catch (error) {
        logger.error('[SentimentAPI] Failed to get top keywords', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Failed to get top keywords',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   GET /api/sentiment/responses/:formId
 * @desc    Get all sentiment-analyzed responses for a form with pagination
 * @access  Private
 * @query   page (optional, default: 1), limit (optional, default: 50), sentiment (optional filter)
 */
router.get('/responses/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const sentimentFilter = req.query.sentiment; // 'positive', 'negative', 'neutral'
        const tenantId = req.user.tenant_id;

        // Validate formId
        if (!formId || isNaN(parseInt(formId))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid formId parameter'
            });
        }

        // Validate pagination
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pagination parameters (page >= 1, limit 1-100)'
            });
        }

        logger.info('[SentimentAPI] Getting sentiment responses', {
            tenantId,
            formId: parseInt(formId),
            page,
            limit,
            sentimentFilter,
            userId: req.user.id
        });

        const { query } = require('../../infrastructure/database/db');
        const offset = (page - 1) * limit;

        // Build WHERE clause
        let whereClause = 'WHERE s.form_id = $1 AND rs.tenant_id = $2';
        const params = [parseInt(formId), tenantId];

        if (sentimentFilter && ['positive', 'negative', 'neutral'].includes(sentimentFilter)) {
            whereClause += ' AND rs.sentiment = $3';
            params.push(sentimentFilter);
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total
            FROM response_sentiment rs
            JOIN submissions s ON s.id = rs.submission_id
            ${whereClause}`,
            params
        );

        const total = parseInt(countResult.rows[0].total);

        // Get paginated results
        const result = await query(
            `SELECT
                rs.id,
                rs.submission_id,
                rs.question_id,
                rs.response_text,
                rs.sentiment,
                rs.sentiment_score,
                rs.confidence,
                rs.emotions,
                rs.keywords,
                rs.themes,
                rs.language,
                rs.ctl_alert_created,
                rs.analyzed_at,
                q.text as question_text
            FROM response_sentiment rs
            JOIN submissions s ON s.id = rs.submission_id
            JOIN questions q ON q.id = rs.question_id
            ${whereClause}
            ORDER BY rs.analyzed_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                formId: parseInt(formId),
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                responses: result.rows
            }
        });
    } catch (error) {
        logger.error('[SentimentAPI] Failed to get sentiment responses', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Failed to get sentiment responses',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
