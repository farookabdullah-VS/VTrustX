/**
 * Drip Campaigns API Routes
 *
 * Endpoints for managing automated multi-step distribution campaigns
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const DripCampaignService = require('../../services/DripCampaignService');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

/**
 * @route   POST /api/drip-campaigns
 * @desc    Create a new drip campaign
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignData = req.body;

        const campaign = await DripCampaignService.createCampaign(tenantId, campaignData);

        res.status(201).json({
            success: true,
            campaign
        });
    } catch (error) {
        logger.error('[DripCampaigns] POST / failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/drip-campaigns
 * @desc    List all drip campaigns for tenant
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { status, formId } = req.query;

        let sql = 'SELECT * FROM drip_campaigns WHERE tenant_id = $1';
        const params = [tenantId];
        let paramIndex = 2;

        if (status) {
            sql += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (formId) {
            sql += ` AND form_id = $${paramIndex}`;
            params.push(parseInt(formId));
            paramIndex++;
        }

        sql += ' ORDER BY created_at DESC';

        const result = await query(sql, params);

        res.json({
            success: true,
            campaigns: result.rows
        });
    } catch (error) {
        logger.error('[DripCampaigns] GET / failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/drip-campaigns/:id
 * @desc    Get campaign details with steps
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);

        // Get campaign
        const campaignResult = await query(
            'SELECT * FROM drip_campaigns WHERE id = $1 AND tenant_id = $2',
            [campaignId, tenantId]
        );

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }

        const campaign = campaignResult.rows[0];

        // Get steps
        const stepsResult = await query(
            'SELECT * FROM drip_campaign_steps WHERE campaign_id = $1 ORDER BY step_number ASC',
            [campaignId]
        );

        campaign.steps = stepsResult.rows;

        // Get stats
        const stats = await DripCampaignService.getCampaignStats(campaignId, tenantId);
        campaign.stats = stats;

        res.json({
            success: true,
            campaign
        });
    } catch (error) {
        logger.error('[DripCampaigns] GET /:id failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/drip-campaigns/:id
 * @desc    Update campaign
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);
        const updates = req.body;

        // Only allow updating certain fields
        const allowedFields = ['name', 'description', 'stop_on_response', 'max_reminders', 'timezone'];
        const setClause = [];
        const params = [campaignId, tenantId];
        let paramIndex = 3;

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClause.push(`${field} = $${paramIndex}`);
                params.push(updates[field]);
                paramIndex++;
            }
        }

        if (setClause.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        setClause.push('updated_at = NOW()');

        const result = await query(
            `UPDATE drip_campaigns SET ${setClause.join(', ')}
            WHERE id = $1 AND tenant_id = $2
            RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }

        res.json({
            success: true,
            campaign: result.rows[0]
        });
    } catch (error) {
        logger.error('[DripCampaigns] PUT /:id failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/drip-campaigns/:id
 * @desc    Delete campaign
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);

        const result = await query(
            'DELETE FROM drip_campaigns WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [campaignId, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }

        res.json({
            success: true,
            message: 'Campaign deleted successfully'
        });
    } catch (error) {
        logger.error('[DripCampaigns] DELETE /:id failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/drip-campaigns/:id/start
 * @desc    Start (activate) a campaign
 * @access  Private
 */
router.post('/:id/start', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);

        const campaign = await DripCampaignService.startCampaign(campaignId, tenantId);

        res.json({
            success: true,
            campaign
        });
    } catch (error) {
        logger.error('[DripCampaigns] POST /:id/start failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/drip-campaigns/:id/pause
 * @desc    Pause a campaign
 * @access  Private
 */
router.post('/:id/pause', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);

        const campaign = await DripCampaignService.pauseCampaign(campaignId, tenantId);

        res.json({
            success: true,
            campaign
        });
    } catch (error) {
        logger.error('[DripCampaigns] POST /:id/pause failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/drip-campaigns/:id/resume
 * @desc    Resume a paused campaign
 * @access  Private
 */
router.post('/:id/resume', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);

        const campaign = await DripCampaignService.resumeCampaign(campaignId, tenantId);

        res.json({
            success: true,
            campaign
        });
    } catch (error) {
        logger.error('[DripCampaigns] POST /:id/resume failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/drip-campaigns/:id/enroll
 * @desc    Enroll contacts in a campaign
 * @access  Private
 */
router.post('/:id/enroll', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);
        const { contacts } = req.body;

        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Contacts array is required'
            });
        }

        const result = await DripCampaignService.enrollContacts(campaignId, contacts, tenantId);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('[DripCampaigns] POST /:id/enroll failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/drip-campaigns/:id/enrollments
 * @desc    Get campaign enrollments
 * @access  Private
 */
router.get('/:id/enrollments', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);
        const { status, limit = 50, offset = 0 } = req.query;

        // Verify campaign ownership
        const campaignResult = await query(
            'SELECT id FROM drip_campaigns WHERE id = $1 AND tenant_id = $2',
            [campaignId, tenantId]
        );

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }

        let sql = 'SELECT * FROM drip_campaign_enrollments WHERE campaign_id = $1';
        const params = [campaignId];
        let paramIndex = 2;

        if (status) {
            sql += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        sql += ` ORDER BY enrolled_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(sql, params);

        res.json({
            success: true,
            enrollments: result.rows
        });
    } catch (error) {
        logger.error('[DripCampaigns] GET /:id/enrollments failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/drip-campaigns/:id/executions
 * @desc    Get step execution history
 * @access  Private
 */
router.get('/:id/executions', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);
        const { limit = 50, offset = 0 } = req.query;

        // Verify campaign ownership
        const campaignResult = await query(
            'SELECT id FROM drip_campaigns WHERE id = $1 AND tenant_id = $2',
            [campaignId, tenantId]
        );

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }

        const result = await query(
            `SELECT e.*, en.recipient_email, en.recipient_phone, en.recipient_name, s.step_type
            FROM drip_step_executions e
            JOIN drip_campaign_enrollments en ON e.enrollment_id = en.id
            LEFT JOIN drip_campaign_steps s ON e.step_id = s.id
            WHERE en.campaign_id = $1
            ORDER BY e.created_at DESC
            LIMIT $2 OFFSET $3`,
            [campaignId, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            executions: result.rows
        });
    } catch (error) {
        logger.error('[DripCampaigns] GET /:id/executions failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/drip-campaigns/:id/stats
 * @desc    Get campaign statistics
 * @access  Private
 */
router.get('/:id/stats', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const campaignId = parseInt(req.params.id);

        // Verify campaign ownership
        const campaignResult = await query(
            'SELECT id FROM drip_campaigns WHERE id = $1 AND tenant_id = $2',
            [campaignId, tenantId]
        );

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found'
            });
        }

        const stats = await DripCampaignService.getCampaignStats(campaignId, tenantId);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        logger.error('[DripCampaigns] GET /:id/stats failed', {
            error: error.message,
            campaignId: req.params.id
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
