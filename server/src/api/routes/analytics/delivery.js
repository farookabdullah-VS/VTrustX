const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const authenticate = require('../../middleware/auth');
const logger = require('../../../infrastructure/logger');
const { emitAnalyticsUpdate } = require('./sse');

/**
 * @swagger
 * /api/analytics/survey-events:
 *   post:
 *     summary: Track survey event (viewed, started, completed, abandoned)
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *               - eventType
 *               - uniqueId
 *             properties:
 *               formId:
 *                 type: integer
 *               eventType:
 *                 type: string
 *                 enum: [viewed, started, completed, abandoned]
 *               uniqueId:
 *                 type: string
 *               distributionId:
 *                 type: integer
 *               sessionId:
 *                 type: string
 *               pageNumber:
 *                 type: integer
 *               userAgent:
 *                 type: string
 *               referrer:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Event tracked successfully
 *       400:
 *         description: Invalid request
 */
router.post('/survey-events', async (req, res) => {
    try {
        const {
            formId,
            eventType,
            uniqueId,
            distributionId,
            sessionId,
            pageNumber,
            userAgent,
            referrer,
            metadata
        } = req.body;

        // Validate required fields
        if (!formId || !eventType || !uniqueId) {
            return res.status(400).json({ error: 'formId, eventType, and uniqueId are required' });
        }

        // Validate event type
        const validEventTypes = ['viewed', 'started', 'completed', 'abandoned'];
        if (!validEventTypes.includes(eventType)) {
            return res.status(400).json({ error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` });
        }

        // Get form to extract tenant_id
        const formResult = await query('SELECT tenant_id FROM forms WHERE id = $1', [formId]);
        if (formResult.rows.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }
        const tenantId = formResult.rows[0].tenant_id;

        // Get IP address
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || null;

        // Insert event
        await query(
            `INSERT INTO survey_events
            (tenant_id, form_id, distribution_id, unique_id, event_type, page_number, session_id, user_agent, ip_address, referrer, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [tenantId, formId, distributionId || null, uniqueId, eventType, pageNumber || null, sessionId || null, userAgent || null, ipAddress, referrer || null, metadata ? JSON.stringify(metadata) : '{}']
        );

        // Update form counters (async, don't wait)
        const counterField = `${eventType === 'viewed' ? 'view' : eventType === 'started' ? 'start' : eventType === 'completed' ? 'completion' : 'abandon'}_count`;
        query(`UPDATE forms SET ${counterField} = ${counterField} + 1 WHERE id = $1`, [formId])
            .catch(err => logger.error('Failed to update form counter', { error: err.message, formId, eventType }));

        // Emit real-time analytics event for survey funnel tracking
        emitAnalyticsUpdate(tenantId, 'survey_event', {
            formId,
            distributionId: distributionId || null,
            eventType,
            sessionId: sessionId || null
        });

        res.status(201).json({ success: true });
    } catch (error) {
        logger.error('Failed to track survey event', { error: error.message });
        res.status(500).json({ error: 'Failed to track event' });
    }
});

/**
 * @swagger
 * /api/analytics/delivery/overview:
 *   get:
 *     summary: Get aggregated delivery stats across all channels
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Overview statistics
 */
router.get('/delivery/overview', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { startDate, endDate } = req.query;

        // Build date filter
        let dateFilter = '';
        const params = [tenantId];
        if (startDate) {
            params.push(startDate);
            dateFilter += ` AND created_at >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            dateFilter += ` AND created_at <= $${params.length}`;
        }

        // Get stats for each channel
        const emailStats = await query(
            `SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE status = 'opened') as opened,
                COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
                COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
             FROM email_messages
             WHERE tenant_id = $1 ${dateFilter}`,
            params
        );

        const smsStats = await query(
            `SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
             FROM sms_messages
             WHERE tenant_id = $1 ${dateFilter}`,
            params
        );

        const whatsappStats = await query(
            `SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE status = 'read') as read,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
             FROM whatsapp_messages
             WHERE tenant_id = $1 ${dateFilter}`,
            params
        );

        // Calculate overall metrics
        const totalMessages = parseInt(emailStats.rows[0].total) + parseInt(smsStats.rows[0].total) + parseInt(whatsappStats.rows[0].total);
        const totalDelivered = parseInt(emailStats.rows[0].delivered) + parseInt(smsStats.rows[0].delivered) + parseInt(whatsappStats.rows[0].delivered);
        const totalFailed = parseInt(emailStats.rows[0].failed) + parseInt(smsStats.rows[0].failed) + parseInt(whatsappStats.rows[0].failed);

        res.json({
            overview: {
                total: totalMessages,
                delivered: totalDelivered,
                failed: totalFailed,
                deliveryRate: totalMessages > 0 ? ((totalDelivered / totalMessages) * 100).toFixed(2) : '0.00'
            },
            byChannel: {
                email: emailStats.rows[0],
                sms: smsStats.rows[0],
                whatsapp: whatsappStats.rows[0]
            }
        });
    } catch (error) {
        logger.error('Failed to fetch delivery overview', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
});

/**
 * @swagger
 * /api/analytics/delivery/channel/{channel}:
 *   get:
 *     summary: Get channel-specific metrics
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: channel
 *         required: true
 *         schema:
 *           type: string
 *           enum: [email, sms, whatsapp]
 *     responses:
 *       200:
 *         description: Channel statistics
 */
router.get('/delivery/channel/:channel', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { channel } = req.params;
        const { startDate, endDate } = req.query;

        // Validate channel
        const validChannels = ['email', 'sms', 'whatsapp'];
        if (!validChannels.includes(channel)) {
            return res.status(400).json({ error: 'Invalid channel' });
        }

        // Build date filter
        let dateFilter = '';
        const params = [tenantId];
        if (startDate) {
            params.push(startDate);
            dateFilter += ` AND created_at >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            dateFilter += ` AND created_at <= $${params.length}`;
        }

        let stats;
        if (channel === 'email') {
            stats = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'opened') as opened,
                    COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
                    COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                 FROM email_messages
                 WHERE tenant_id = $1 ${dateFilter}`,
                params
            );
        } else if (channel === 'sms') {
            stats = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                 FROM sms_messages
                 WHERE tenant_id = $1 ${dateFilter}`,
                params
            );
        } else if (channel === 'whatsapp') {
            stats = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'read') as read,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                 FROM whatsapp_messages
                 WHERE tenant_id = $1 ${dateFilter}`,
                params
            );
        }

        res.json({
            channel,
            stats: stats.rows[0]
        });
    } catch (error) {
        logger.error('Failed to fetch channel stats', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch channel stats' });
    }
});

/**
 * @swagger
 * /api/analytics/delivery/funnel:
 *   get:
 *     summary: Get response funnel metrics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: formId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: distributionId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Funnel statistics
 */
router.get('/delivery/funnel', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { formId, distributionId, startDate, endDate } = req.query;

        // Build filters
        let filters = 'WHERE tenant_id = $1';
        const params = [tenantId];

        if (formId) {
            params.push(formId);
            filters += ` AND form_id = $${params.length}`;
        }
        if (distributionId) {
            params.push(distributionId);
            filters += ` AND distribution_id = $${params.length}`;
        }
        if (startDate) {
            params.push(startDate);
            filters += ` AND created_at >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            filters += ` AND created_at <= $${params.length}`;
        }

        // Get funnel stats
        const funnelStats = await query(
            `SELECT
                COUNT(DISTINCT CASE WHEN event_type = 'viewed' THEN unique_id END) as viewed,
                COUNT(DISTINCT CASE WHEN event_type = 'started' THEN unique_id END) as started,
                COUNT(DISTINCT CASE WHEN event_type = 'completed' THEN unique_id END) as completed,
                COUNT(DISTINCT CASE WHEN event_type = 'abandoned' THEN unique_id END) as abandoned
             FROM survey_events
             ${filters}`,
            params
        );

        const stats = funnelStats.rows[0];
        const viewed = parseInt(stats.viewed) || 1; // Avoid division by zero

        // Calculate conversion rates
        const funnel = {
            viewed: parseInt(stats.viewed),
            started: parseInt(stats.started),
            completed: parseInt(stats.completed),
            abandoned: parseInt(stats.abandoned),
            rates: {
                startRate: ((parseInt(stats.started) / viewed) * 100).toFixed(2),
                completionRate: ((parseInt(stats.completed) / viewed) * 100).toFixed(2),
                abandonRate: ((parseInt(stats.abandoned) / viewed) * 100).toFixed(2),
                completionFromStart: parseInt(stats.started) > 0
                    ? ((parseInt(stats.completed) / parseInt(stats.started)) * 100).toFixed(2)
                    : '0.00'
            }
        };

        res.json({ funnel });
    } catch (error) {
        logger.error('Failed to fetch funnel stats', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch funnel' });
    }
});

/**
 * @swagger
 * /api/analytics/delivery/timeline:
 *   get:
 *     summary: Get delivery performance over time
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [email, sms, whatsapp, all]
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Timeline data
 */
router.get('/delivery/timeline', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { channel = 'all', interval = 'day', startDate, endDate } = req.query;

        // Determine date truncation based on interval
        const truncMap = {
            hour: 'hour',
            day: 'day',
            week: 'week',
            month: 'month'
        };
        const truncFunc = truncMap[interval] || 'day';

        // Build date filter
        let dateFilter = '';
        const params = [tenantId];
        if (startDate) {
            params.push(startDate);
            dateFilter += ` AND created_at >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            dateFilter += ` AND created_at <= $${params.length}`;
        }

        let timeline = [];

        if (channel === 'all' || channel === 'email') {
            const emailTimeline = await query(
                `SELECT
                    DATE_TRUNC('${truncFunc}', created_at) as period,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                 FROM email_messages
                 WHERE tenant_id = $1 ${dateFilter}
                 GROUP BY period
                 ORDER BY period`,
                params
            );
            timeline.push({ channel: 'email', data: emailTimeline.rows });
        }

        if (channel === 'all' || channel === 'sms') {
            const smsTimeline = await query(
                `SELECT
                    DATE_TRUNC('${truncFunc}', created_at) as period,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                 FROM sms_messages
                 WHERE tenant_id = $1 ${dateFilter}
                 GROUP BY period
                 ORDER BY period`,
                params
            );
            timeline.push({ channel: 'sms', data: smsTimeline.rows });
        }

        if (channel === 'all' || channel === 'whatsapp') {
            const whatsappTimeline = await query(
                `SELECT
                    DATE_TRUNC('${truncFunc}', created_at) as period,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                 FROM whatsapp_messages
                 WHERE tenant_id = $1 ${dateFilter}
                 GROUP BY period
                 ORDER BY period`,
                params
            );
            timeline.push({ channel: 'whatsapp', data: whatsappTimeline.rows });
        }

        res.json({ timeline });
    } catch (error) {
        logger.error('Failed to fetch timeline', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch timeline' });
    }
});

/**
 * @swagger
 * /api/analytics/delivery/distributions/{id}:
 *   get:
 *     summary: Get detailed distribution analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Distribution analytics
 */
router.get('/delivery/distributions/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;

        // Get distribution
        const distResult = await query(
            'SELECT * FROM distributions WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (distResult.rows.length === 0) {
            return res.status(404).json({ error: 'Distribution not found' });
        }

        const distribution = distResult.rows[0];

        // Get message stats based on channel
        let messageStats;
        if (distribution.type === 'email') {
            messageStats = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'opened') as opened,
                    COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
                    COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) as avg_delivery_time
                 FROM email_messages
                 WHERE distribution_id = $1 AND tenant_id = $2`,
                [id, tenantId]
            );
        } else if (distribution.type === 'sms') {
            messageStats = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) as avg_delivery_time
                 FROM sms_messages
                 WHERE distribution_id = $1 AND tenant_id = $2`,
                [id, tenantId]
            );
        } else if (distribution.type === 'whatsapp') {
            messageStats = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'read') as read,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) as avg_delivery_time
                 FROM whatsapp_messages
                 WHERE distribution_id = $1 AND tenant_id = $2`,
                [id, tenantId]
            );
        }

        // Get funnel stats if survey linked
        let funnelStats = null;
        if (distribution.survey_id) {
            const funnel = await query(
                `SELECT
                    COUNT(DISTINCT CASE WHEN event_type = 'viewed' THEN unique_id END) as viewed,
                    COUNT(DISTINCT CASE WHEN event_type = 'started' THEN unique_id END) as started,
                    COUNT(DISTINCT CASE WHEN event_type = 'completed' THEN unique_id END) as completed,
                    COUNT(DISTINCT CASE WHEN event_type = 'abandoned' THEN unique_id END) as abandoned
                 FROM survey_events
                 WHERE distribution_id = $1 AND tenant_id = $2`,
                [id, tenantId]
            );
            funnelStats = funnel.rows[0];
        }

        res.json({
            distribution,
            messageStats: messageStats.rows[0],
            funnelStats
        });
    } catch (error) {
        logger.error('Failed to fetch distribution analytics', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

module.exports = router;
