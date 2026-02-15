/**
 * Response Quality Scoring API Routes
 *
 * Endpoints:
 * - GET /api/quality/stats/:formId - Get quality statistics for a form
 * - GET /api/quality/low-quality/:formId - Get low quality responses
 * - GET /api/quality/thresholds - Get quality thresholds
 * - PUT /api/quality/thresholds - Update quality thresholds
 * - POST /api/quality/recalculate/:submissionId - Recalculate quality score
 * - GET /api/quality/score/:submissionId - Get quality score for submission
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ResponseQualityService = require('../../services/ResponseQualityService');
const logger = require('../../infrastructure/logger');
const { query } = require('../../infrastructure/database/db');

/**
 * GET /api/quality/stats/:formId
 * Get quality statistics for a form
 */
router.get('/stats/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const tenantId = req.user.tenant_id;

        // Verify form belongs to tenant
        const formCheck = await query(
            'SELECT id FROM forms WHERE id = $1 AND tenant_id = $2',
            [formId, tenantId]
        );

        if (formCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const stats = await ResponseQualityService.getQualityStats(formId, tenantId);

        return res.json({
            formId: parseInt(formId),
            stats: {
                total_responses: parseInt(stats.total_responses) || 0,
                avg_quality_score: parseFloat(stats.avg_quality_score) || 100,
                suspicious_count: parseInt(stats.suspicious_count) || 0,
                spam_count: parseInt(stats.spam_count) || 0,
                bot_count: parseInt(stats.bot_count) || 0,
                review_required_count: parseInt(stats.review_required_count) || 0,
                straight_lining_count: parseInt(stats.straight_lining_count) || 0,
                gibberish_count: parseInt(stats.gibberish_count) || 0
            }
        });
    } catch (error) {
        logger.error('[Quality API] Failed to get stats', {
            error: error.message,
            formId: req.params.formId
        });
        return res.status(500).json({
            error: 'Failed to retrieve quality statistics'
        });
    }
});

/**
 * GET /api/quality/low-quality/:formId
 * Get low quality responses for review
 */
router.get('/low-quality/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const tenantId = req.user.tenant_id;
        const limit = parseInt(req.query.limit) || 50;

        // Verify form belongs to tenant
        const formCheck = await query(
            'SELECT id FROM forms WHERE id = $1 AND tenant_id = $2',
            [formId, tenantId]
        );

        if (formCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const responses = await ResponseQualityService.getLowQualityResponses(
            formId,
            tenantId,
            limit
        );

        return res.json({
            formId: parseInt(formId),
            count: responses.length,
            responses: responses.map(r => ({
                submission_id: r.submission_id,
                quality_score: parseFloat(r.quality_score),
                is_suspicious: r.is_suspicious,
                is_spam: r.is_spam,
                is_bot: r.is_bot,
                flagged_reasons: r.flagged_reasons,
                completion_time_seconds: r.completion_time_seconds,
                straight_lining_detected: r.straight_lining_detected,
                gibberish_detected: r.gibberish_detected,
                submitted_at: r.submitted_at,
                ip_address: r.ip_address,
                user_agent: r.user_agent
            }))
        });
    } catch (error) {
        logger.error('[Quality API] Failed to get low quality responses', {
            error: error.message,
            formId: req.params.formId
        });
        return res.status(500).json({
            error: 'Failed to retrieve low quality responses'
        });
    }
});

/**
 * GET /api/quality/thresholds
 * Get quality thresholds for current tenant
 */
router.get('/thresholds', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        const thresholds = await ResponseQualityService.getQualityThresholds(tenantId);

        return res.json({
            thresholds: {
                min_quality_score: parseFloat(thresholds.min_quality_score),
                suspicious_threshold: parseFloat(thresholds.suspicious_threshold),
                min_completion_time_seconds: thresholds.min_completion_time_seconds,
                max_completion_time_seconds: thresholds.max_completion_time_seconds,
                time_ratio_min: parseFloat(thresholds.time_ratio_min),
                time_ratio_max: parseFloat(thresholds.time_ratio_max),
                min_avg_text_length: thresholds.min_avg_text_length,
                min_text_response_length: thresholds.min_text_response_length,
                enable_straight_lining_detection: thresholds.enable_straight_lining_detection,
                enable_gibberish_detection: thresholds.enable_gibberish_detection,
                enable_duplicate_detection: thresholds.enable_duplicate_detection,
                auto_flag_suspicious: thresholds.auto_flag_suspicious,
                auto_exclude_from_analytics: thresholds.auto_exclude_from_analytics,
                require_manual_review: thresholds.require_manual_review
            }
        });
    } catch (error) {
        logger.error('[Quality API] Failed to get thresholds', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to retrieve quality thresholds'
        });
    }
});

/**
 * PUT /api/quality/thresholds
 * Update quality thresholds for current tenant
 */
router.put('/thresholds', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const thresholds = req.body;

        // Validate threshold values
        if (thresholds.min_quality_score !== undefined) {
            if (thresholds.min_quality_score < 0 || thresholds.min_quality_score > 100) {
                return res.status(400).json({ error: 'min_quality_score must be between 0 and 100' });
            }
        }

        if (thresholds.suspicious_threshold !== undefined) {
            if (thresholds.suspicious_threshold < 0 || thresholds.suspicious_threshold > 100) {
                return res.status(400).json({ error: 'suspicious_threshold must be between 0 and 100' });
            }
        }

        if (thresholds.min_completion_time_seconds !== undefined) {
            if (thresholds.min_completion_time_seconds < 1) {
                return res.status(400).json({ error: 'min_completion_time_seconds must be at least 1' });
            }
        }

        const updated = await ResponseQualityService.updateQualityThresholds(tenantId, thresholds);

        return res.json({
            success: true,
            message: 'Quality thresholds updated successfully',
            thresholds: {
                min_quality_score: parseFloat(updated.min_quality_score),
                suspicious_threshold: parseFloat(updated.suspicious_threshold),
                min_completion_time_seconds: updated.min_completion_time_seconds,
                max_completion_time_seconds: updated.max_completion_time_seconds,
                time_ratio_min: parseFloat(updated.time_ratio_min),
                time_ratio_max: parseFloat(updated.time_ratio_max),
                min_avg_text_length: updated.min_avg_text_length,
                min_text_response_length: updated.min_text_response_length,
                enable_straight_lining_detection: updated.enable_straight_lining_detection,
                enable_gibberish_detection: updated.enable_gibberish_detection,
                enable_duplicate_detection: updated.enable_duplicate_detection,
                auto_flag_suspicious: updated.auto_flag_suspicious,
                auto_exclude_from_analytics: updated.auto_exclude_from_analytics,
                require_manual_review: updated.require_manual_review
            }
        });
    } catch (error) {
        logger.error('[Quality API] Failed to update thresholds', {
            error: error.message,
            tenantId: req.user.tenant_id
        });
        return res.status(500).json({
            error: 'Failed to update quality thresholds'
        });
    }
});

/**
 * POST /api/quality/recalculate/:submissionId
 * Recalculate quality score for a submission
 */
router.post('/recalculate/:submissionId', authenticate, async (req, res) => {
    try {
        const { submissionId } = req.params;
        const tenantId = req.user.tenant_id;

        // Get submission data
        const submissionResult = await query(
            `SELECT s.*, f.id as form_id
            FROM submissions s
            JOIN forms f ON f.id = s.form_id
            WHERE s.id = $1 AND f.tenant_id = $2`,
            [submissionId, tenantId]
        );

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const submission = submissionResult.rows[0];

        // Get answers
        const answersResult = await query(
            'SELECT * FROM answers WHERE submission_id = $1',
            [submissionId]
        );

        const submissionData = {
            ...submission,
            answers: answersResult.rows,
            started_at: submission.created_at,
            completed_at: submission.submitted_at || submission.created_at
        };

        // Recalculate quality score
        const result = await ResponseQualityService.calculateQualityScore(
            parseInt(submissionId),
            tenantId,
            submission.form_id,
            submissionData
        );

        return res.json({
            success: true,
            submission_id: parseInt(submissionId),
            quality_score: result.quality_score,
            is_suspicious: result.is_suspicious,
            is_spam: result.is_spam,
            is_bot: result.is_bot,
            flagged_reasons: result.flagged_reasons,
            details: result.details
        });
    } catch (error) {
        logger.error('[Quality API] Failed to recalculate quality score', {
            error: error.message,
            submissionId: req.params.submissionId
        });
        return res.status(500).json({
            error: 'Failed to recalculate quality score'
        });
    }
});

/**
 * GET /api/quality/score/:submissionId
 * Get quality score for a submission
 */
router.get('/score/:submissionId', authenticate, async (req, res) => {
    try {
        const { submissionId } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            `SELECT rqs.*
            FROM response_quality_scores rqs
            JOIN submissions s ON s.id = rqs.submission_id
            JOIN forms f ON f.id = s.form_id
            WHERE rqs.submission_id = $1 AND f.tenant_id = $2`,
            [submissionId, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quality score not found' });
        }

        const score = result.rows[0];

        return res.json({
            submission_id: score.submission_id,
            quality_score: parseFloat(score.quality_score),
            scores: {
                completion_time: parseFloat(score.completion_time_score),
                text_quality: parseFloat(score.text_quality_score),
                consistency: parseFloat(score.consistency_score),
                engagement: parseFloat(score.engagement_score)
            },
            metrics: {
                completion_time_seconds: score.completion_time_seconds,
                expected_time_seconds: score.expected_time_seconds,
                time_ratio: parseFloat(score.time_ratio),
                text_responses_count: score.text_responses_count,
                avg_text_length: parseFloat(score.avg_text_length) || 0,
                min_text_length: score.min_text_length,
                max_text_length: score.max_text_length
            },
            flags: {
                is_suspicious: score.is_suspicious,
                is_spam: score.is_spam,
                is_bot: score.is_bot,
                manual_review_required: score.manual_review_required,
                straight_lining_detected: score.straight_lining_detected,
                gibberish_detected: score.gibberish_detected
            },
            flagged_reasons: score.flagged_reasons,
            suspicious_patterns: score.suspicious_patterns,
            quality_details: score.quality_details,
            created_at: score.created_at,
            updated_at: score.updated_at
        });
    } catch (error) {
        logger.error('[Quality API] Failed to get quality score', {
            error: error.message,
            submissionId: req.params.submissionId
        });
        return res.status(500).json({
            error: 'Failed to retrieve quality score'
        });
    }
});

/**
 * GET /api/quality/distribution/:formId
 * Get quality score distribution for a form
 */
router.get('/distribution/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const tenantId = req.user.tenant_id;

        // Verify form belongs to tenant
        const formCheck = await query(
            'SELECT id FROM forms WHERE id = $1 AND tenant_id = $2',
            [formId, tenantId]
        );

        if (formCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Get distribution of quality scores
        const result = await query(
            `SELECT
                CASE
                    WHEN quality_score >= 90 THEN 'excellent'
                    WHEN quality_score >= 70 THEN 'good'
                    WHEN quality_score >= 50 THEN 'medium'
                    WHEN quality_score >= 30 THEN 'low'
                    ELSE 'suspicious'
                END as quality_category,
                COUNT(*) as count
            FROM response_quality_scores
            WHERE form_id = $1 AND tenant_id = $2
            GROUP BY quality_category
            ORDER BY
                CASE quality_category
                    WHEN 'excellent' THEN 1
                    WHEN 'good' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    WHEN 'suspicious' THEN 5
                END`,
            [formId, tenantId]
        );

        const distribution = {
            excellent: 0,
            good: 0,
            medium: 0,
            low: 0,
            suspicious: 0
        };

        result.rows.forEach(row => {
            distribution[row.quality_category] = parseInt(row.count);
        });

        return res.json({
            formId: parseInt(formId),
            distribution
        });
    } catch (error) {
        logger.error('[Quality API] Failed to get quality distribution', {
            error: error.message,
            formId: req.params.formId
        });
        return res.status(500).json({
            error: 'Failed to retrieve quality distribution'
        });
    }
});

module.exports = router;
