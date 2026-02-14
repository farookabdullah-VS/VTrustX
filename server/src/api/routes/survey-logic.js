/**
 * Survey Logic API Routes
 *
 * Endpoints for managing conditional logic, skip logic, quotas, and piping
 * - Logic rules (CRUD)
 * - Quotas (CRUD and check)
 * - Piping rules (CRUD)
 * - Question groups (CRUD)
 * - Logic evaluation (for testing)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const SurveyLogicService = require('../../services/SurveyLogicService');
const logger = require('../../infrastructure/logger');

/**
 * @route   POST /api/survey-logic/rules
 * @desc    Create logic rule
 * @access  Private
 */
router.post('/rules', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { formId, ...ruleData } = req.body;

        if (!formId) {
            return res.status(400).json({
                success: false,
                error: 'formId is required'
            });
        }

        const rule = await SurveyLogicService.createLogicRule(tenantId, formId, ruleData);

        res.status(201).json({
            success: true,
            data: rule
        });
    } catch (error) {
        logger.error('[SurveyLogic] POST /rules failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/survey-logic/rules/:formId
 * @desc    Get logic rules for a form
 * @access  Private
 */
router.get('/rules/:formId', authenticate, async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);

        const rules = await SurveyLogicService.getLogicRules(formId);

        res.json({
            success: true,
            data: rules
        });
    } catch (error) {
        logger.error('[SurveyLogic] GET /rules/:formId failed', {
            error: error.message,
            formId: req.params.formId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/survey-logic/rules/:ruleId
 * @desc    Delete logic rule
 * @access  Private
 */
router.delete('/rules/:ruleId', authenticate, async (req, res) => {
    try {
        const ruleId = parseInt(req.params.ruleId);
        const tenantId = req.user.tenantId;

        await SurveyLogicService.deleteLogicRule(ruleId, tenantId);

        res.json({
            success: true,
            message: 'Logic rule deleted successfully'
        });
    } catch (error) {
        logger.error('[SurveyLogic] DELETE /rules/:ruleId failed', {
            error: error.message,
            ruleId: req.params.ruleId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/survey-logic/evaluate
 * @desc    Evaluate logic for a question (testing endpoint)
 * @access  Private
 */
router.post('/evaluate', authenticate, async (req, res) => {
    try {
        const { formId, questionId, answers } = req.body;

        if (!formId || !questionId) {
            return res.status(400).json({
                success: false,
                error: 'formId and questionId are required'
            });
        }

        const result = await SurveyLogicService.evaluateQuestionLogic(
            formId,
            questionId,
            answers || {}
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[SurveyLogic] POST /evaluate failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/survey-logic/quotas/:formId
 * @desc    Get quotas for a form
 * @access  Private
 */
router.get('/quotas/:formId', authenticate, async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);

        const result = await require('../../infrastructure/database/db').query(
            `SELECT * FROM question_quotas
            WHERE form_id = $1
            ORDER BY question_id, option_value`,
            [formId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('[SurveyLogic] GET /quotas/:formId failed', {
            error: error.message,
            formId: req.params.formId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/survey-logic/quotas
 * @desc    Create quota
 * @access  Private
 */
router.post('/quotas', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const {
            formId,
            questionId,
            optionValue,
            quotaType,
            quotaLimit,
            quotaReachedAction,
            resetFrequency
        } = req.body;

        if (!formId || !questionId || !quotaType || quotaLimit === undefined) {
            return res.status(400).json({
                success: false,
                error: 'formId, questionId, quotaType, and quotaLimit are required'
            });
        }

        const result = await require('../../infrastructure/database/db').query(
            `INSERT INTO question_quotas
            (tenant_id, form_id, question_id, option_value, quota_type, quota_limit, quota_reached_action, reset_frequency)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                tenantId,
                formId,
                questionId,
                optionValue || null,
                quotaType,
                quotaLimit,
                quotaReachedAction || 'disable_option',
                resetFrequency || null
            ]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('[SurveyLogic] POST /quotas failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/survey-logic/quotas/check
 * @desc    Check quota availability
 * @access  Public (for respondents)
 */
router.post('/quotas/check', async (req, res) => {
    try {
        const { formId, questionId, optionValue } = req.body;

        if (!formId || !questionId) {
            return res.status(400).json({
                success: false,
                error: 'formId and questionId are required'
            });
        }

        const quota = await SurveyLogicService.checkQuota(
            formId,
            questionId,
            optionValue || null
        );

        res.json({
            success: true,
            data: quota
        });
    } catch (error) {
        logger.error('[SurveyLogic] POST /quotas/check failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/survey-logic/quotas/:quotaId
 * @desc    Delete quota
 * @access  Private
 */
router.delete('/quotas/:quotaId', authenticate, async (req, res) => {
    try {
        const quotaId = parseInt(req.params.quotaId);
        const tenantId = req.user.tenantId;

        await require('../../infrastructure/database/db').query(
            'DELETE FROM question_quotas WHERE id = $1 AND tenant_id = $2',
            [quotaId, tenantId]
        );

        res.json({
            success: true,
            message: 'Quota deleted successfully'
        });
    } catch (error) {
        logger.error('[SurveyLogic] DELETE /quotas/:quotaId failed', {
            error: error.message,
            quotaId: req.params.quotaId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/survey-logic/piping/:formId
 * @desc    Get piping rules for a form
 * @access  Private
 */
router.get('/piping/:formId', authenticate, async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);

        const result = await require('../../infrastructure/database/db').query(
            `SELECT * FROM piping_rules
            WHERE form_id = $1 AND is_active = true
            ORDER BY target_question_id`,
            [formId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('[SurveyLogic] GET /piping/:formId failed', {
            error: error.message,
            formId: req.params.formId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/survey-logic/piping
 * @desc    Create piping rule
 * @access  Private
 */
router.post('/piping', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const {
            formId,
            targetQuestionId,
            sourceQuestionId,
            pipingType,
            template,
            transformRule,
            fallbackValue
        } = req.body;

        if (!formId || !targetQuestionId || !sourceQuestionId || !pipingType) {
            return res.status(400).json({
                success: false,
                error: 'formId, targetQuestionId, sourceQuestionId, and pipingType are required'
            });
        }

        const result = await require('../../infrastructure/database/db').query(
            `INSERT INTO piping_rules
            (tenant_id, form_id, target_question_id, source_question_id, piping_type, template, transform_rule, fallback_value)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                tenantId,
                formId,
                targetQuestionId,
                sourceQuestionId,
                pipingType,
                template || null,
                transformRule ? JSON.stringify(transformRule) : null,
                fallbackValue || null
            ]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('[SurveyLogic] POST /piping failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/survey-logic/piping/apply
 * @desc    Apply piping to question text (testing endpoint)
 * @access  Public (for respondents)
 */
router.post('/piping/apply', async (req, res) => {
    try {
        const { formId, questionId, questionText, answers } = req.body;

        if (!formId || !questionId || !questionText) {
            return res.status(400).json({
                success: false,
                error: 'formId, questionId, and questionText are required'
            });
        }

        const pipedText = await SurveyLogicService.applyPiping(
            formId,
            questionId,
            questionText,
            answers || {}
        );

        res.json({
            success: true,
            data: { pipedText }
        });
    } catch (error) {
        logger.error('[SurveyLogic] POST /piping/apply failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/survey-logic/piping/:pipingId
 * @desc    Delete piping rule
 * @access  Private
 */
router.delete('/piping/:pipingId', authenticate, async (req, res) => {
    try {
        const pipingId = parseInt(req.params.pipingId);
        const tenantId = req.user.tenantId;

        await require('../../infrastructure/database/db').query(
            'DELETE FROM piping_rules WHERE id = $1 AND tenant_id = $2',
            [pipingId, tenantId]
        );

        res.json({
            success: true,
            message: 'Piping rule deleted successfully'
        });
    } catch (error) {
        logger.error('[SurveyLogic] DELETE /piping/:pipingId failed', {
            error: error.message,
            pipingId: req.params.pipingId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/survey-logic/groups/:formId
 * @desc    Get question groups for a form
 * @access  Public (for respondents)
 */
router.get('/groups/:formId', async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);

        const groups = await SurveyLogicService.getQuestionGroups(formId);

        // Apply randomization if needed
        const randomized = SurveyLogicService.randomizeQuestions(groups);

        res.json({
            success: true,
            data: randomized
        });
    } catch (error) {
        logger.error('[SurveyLogic] GET /groups/:formId failed', {
            error: error.message,
            formId: req.params.formId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/survey-logic/groups
 * @desc    Create question group
 * @access  Private
 */
router.post('/groups', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const {
            formId,
            groupId,
            groupName,
            groupType,
            description,
            questionIds,
            displayOrder,
            randomizeQuestions,
            randomizeOptions
        } = req.body;

        if (!formId || !groupId || !groupName || !questionIds) {
            return res.status(400).json({
                success: false,
                error: 'formId, groupId, groupName, and questionIds are required'
            });
        }

        const result = await require('../../infrastructure/database/db').query(
            `INSERT INTO question_groups
            (tenant_id, form_id, group_id, group_name, group_type, description, question_ids, display_order, randomize_questions, randomize_options)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                tenantId,
                formId,
                groupId,
                groupName,
                groupType || 'page',
                description || null,
                JSON.stringify(questionIds),
                displayOrder || 0,
                randomizeQuestions || false,
                randomizeOptions || false
            ]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('[SurveyLogic] POST /groups failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/survey-logic/groups/:groupId
 * @desc    Delete question group
 * @access  Private
 */
router.delete('/groups/:groupId', authenticate, async (req, res) => {
    try {
        const groupId = req.params.groupId; // String, not integer
        const tenantId = req.user.tenantId;

        await require('../../infrastructure/database/db').query(
            'DELETE FROM question_groups WHERE group_id = $1 AND tenant_id = $2',
            [groupId, tenantId]
        );

        res.json({
            success: true,
            message: 'Question group deleted successfully'
        });
    } catch (error) {
        logger.error('[SurveyLogic] DELETE /groups/:groupId failed', {
            error: error.message,
            groupId: req.params.groupId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
