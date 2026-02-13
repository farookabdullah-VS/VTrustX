const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const emailService = require('../../../services/emailService');
const smsService = require('../../../services/smsService');
const whatsappService = require('../../../services/whatsappService');
const TemplateService = require('../../../services/TemplateService');
const validate = require('../../middleware/validate');
const { createDistributionSchema } = require('../../schemas/distributions.schemas');
const logger = require('../../../infrastructure/logger');

/**
 * @swagger
 * /api/distributions/types:
 *   get:
 *     summary: List available distribution campaign types
 *     tags: [Distributions]
 *     responses:
 *       200:
 *         description: Array of distribution types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     enum: [email, sms, whatsapp, qr]
 *                   name:
 *                     type: string
 *                   icon:
 *                     type: string
 */
// 1. Get Campaign Types
router.get('/types', (req, res) => {
    res.json([
        { id: 'email', name: 'Email Blast', icon: 'email' },
        { id: 'sms', name: 'SMS', icon: 'sms' },
        { id: 'whatsapp', name: 'WhatsApp', icon: 'message' },
        { id: 'qr', name: 'QR Code', icon: 'qr' }
    ]);
});

/**
 * @swagger
 * /api/distributions:
 *   get:
 *     summary: List all distribution campaigns
 *     tags: [Distributions]
 *     responses:
 *       200:
 *         description: Array of distribution campaigns
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
// 2. Get Campaigns
router.get('/', async (req, res) => {
    try {
        const result = await query("SELECT * FROM distributions ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        // If table doesn't exist yet, return empty array instead of mock data
        if (err.code === '42P01') {
            logger.warn('distributions table does not exist yet — returning empty array');
            return res.json([]);
        }
        logger.error('Failed to fetch distributions', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch distributions' });
    }
});

/**
 * @swagger
 * /api/distributions:
 *   post:
 *     summary: Create a new distribution campaign
 *     tags: [Distributions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - contacts
 *             properties:
 *               name:
 *                 type: string
 *                 description: Campaign name
 *               surveyId:
 *                 type: integer
 *                 description: ID of the survey to distribute
 *               type:
 *                 type: string
 *                 enum: [email, sms, whatsapp, qr]
 *                 description: Distribution channel type
 *               subject:
 *                 type: string
 *                 description: Email subject line (for email type)
 *               body:
 *                 type: string
 *                 description: Message body with optional {{name}} and {{link}} placeholders
 *               contacts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *     responses:
 *       201:
 *         description: Campaign created and scheduled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 status:
 *                   type: string
 *                   example: Scheduled
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
// 3. Create Campaign
router.post('/', validate(createDistributionSchema), async (req, res) => {
    try {
        const { name, surveyId, type, subject, body, contacts, mediaAttachments = [], experimentId } = req.body;

        if (!name || !type || !contacts || !Array.isArray(contacts)) {
            return res.status(400).json({ error: 'name, type, and contacts array are required' });
        }

        logger.info(`[Distribution] Creating Campaign: ${name} (${type})`);
        logger.info(`[Distribution] Contacts: ${contacts.length}, Media: ${mediaAttachments.length}, ExperimentId: ${experimentId || 'none'}`);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const tenantId = req.user?.tenant_id || 1; // Get tenant from authenticated user

        // Fetch media assets if there are any
        let mediaAssets = [];
        if (mediaAttachments && mediaAttachments.length > 0) {
            const mediaIds = mediaAttachments.map(m => m.id);
            const mediaResult = await query(
                `SELECT id, filename, media_type, cdn_url, storage_path
                 FROM media_assets
                 WHERE id = ANY($1) AND tenant_id = $2`,
                [mediaIds, tenantId]
            );
            mediaAssets = mediaResult.rows;
        }

        // Create distribution record (needed for message tracking and experiment tracking)
        const distResult = await query(
            `INSERT INTO distributions (name, type, survey_id, tenant_id, experiment_id, status, created_at)
             VALUES ($1, $2, $3, $4, $5, 'processing', NOW())
             RETURNING id`,
            [name, type, surveyId, tenantId, experimentId || null]
        );
        const distributionId = distResult.rows[0].id;

        if (type === 'email') {
            sendBatch(contacts, subject, body, surveyId, 'email', frontendUrl, tenantId, distributionId, mediaAssets, experimentId);
        } else if (type === 'sms') {
            sendBatch(contacts, subject, body, surveyId, 'sms', frontendUrl, tenantId, distributionId, mediaAssets, experimentId);
        } else if (type === 'whatsapp') {
            sendBatch(contacts, subject, body, surveyId, 'whatsapp', frontendUrl, tenantId, distributionId, mediaAssets, experimentId);
        }

        res.status(201).json({ id: distributionId, status: 'Scheduled' });
    } catch (err) {
        logger.error('Failed to create distribution campaign', { error: err.message });
        res.status(500).json({ error: 'Failed to create distribution campaign' });
    }
});

async function sendBatch(contacts, subject, body, surveyId, type, frontendUrl, tenantId, distributionId = null, mediaAssets = [], experimentId = null) {
    logger.info(`Starting ${type.toUpperCase()} Batch Send...`, { tenantId, contactCount: contacts.length, mediaCount: mediaAssets.length, experimentId });
    let sent = 0;

    // A/B Testing: Validate experiment is running
    if (experimentId) {
        const expCheck = await query(
            'SELECT status FROM ab_experiments WHERE id = $1 AND tenant_id = $2',
            [experimentId, tenantId]
        );

        if (expCheck.rows.length === 0) {
            throw new Error(`Experiment ${experimentId} not found for tenant ${tenantId}`);
        }

        if (expCheck.rows[0].status !== 'running') {
            throw new Error(`Experiment must be in running status (current: ${expCheck.rows[0].status})`);
        }

        logger.info(`A/B Test Active: Experiment ${experimentId}`, { status: expCheck.rows[0].status });
    }

    for (const contact of contacts) {
        try {
            const contactId = contact.email || contact.phone || 'unknown';
            const uniqueLink = `${frontendUrl}/s/${surveyId}?u=${encodeURIComponent(contactId)}`;

            // A/B Testing: Assign variant if experiment active
            let finalSubject = subject;
            let finalBody = body;
            let finalMediaAssets = mediaAssets;

            if (experimentId) {
                const ABTestService = require('../../../services/ABTestService');
                const variant = await ABTestService.assignVariant(
                    experimentId,
                    contactId,
                    contact.name
                );

                // Use variant content (subject can be null for SMS/WhatsApp)
                finalSubject = variant.subject || subject;
                finalBody = variant.body;

                // Parse media attachments from variant (stored as JSON string)
                const variantMediaIds = JSON.parse(variant.media_attachments || '[]');
                if (variantMediaIds && variantMediaIds.length > 0) {
                    const variantMediaResult = await query(
                        `SELECT id, filename, media_type, cdn_url, storage_path
                         FROM media_assets
                         WHERE id = ANY($1) AND tenant_id = $2`,
                        [variantMediaIds, tenantId]
                    );
                    finalMediaAssets = variantMediaResult.rows;
                }

                logger.debug(`Variant assigned: ${variant.variant_name} for ${contactId}`, { experimentId });
            }

            // Prepare context for template rendering
            const context = {
                name: contact.name || 'Valued Customer',
                email: contact.email || '',
                phone: contact.phone || '',
                link: uniqueLink,
                company: contact.company || ''
            };

            // Render template with media using TemplateService
            const rendered = await TemplateService.renderTemplate(
                finalBody,
                context,
                finalMediaAssets,
                type,
                { tenantId }
            );

            if (type === 'email') {
                await emailService.sendEmail(
                    contact.email,
                    finalSubject,
                    rendered.html || rendered.text,
                    rendered.text,
                    {
                        tenantId,
                        distributionId,
                        recipientName: contact.name,
                        attachments: rendered.attachments || []
                    }
                );
            } else if (type === 'sms') {
                if (!contact.phone) {
                    logger.info(`Skipping SMS for ${contact.name} - No Phone`);
                    continue;
                }
                await smsService.sendMessage(
                    contact.phone,
                    rendered.text,
                    { tenantId, distributionId, recipientName: contact.name }
                );
            } else if (type === 'whatsapp') {
                if (!contact.phone) {
                    logger.info(`Skipping WhatsApp for ${contact.name || 'contact'} - No Phone`);
                    continue;
                }

                // Use sendMediaMessage if there are media URLs, otherwise regular sendMessage
                let result;
                if (rendered.mediaUrls && rendered.mediaUrls.length > 0) {
                    result = await whatsappService.sendMediaMessage(
                        contact.phone,
                        rendered.text,
                        rendered.mediaUrls,
                        { tenantId, distributionId, recipientName: contact.name }
                    );
                } else {
                    result = await whatsappService.sendMessage(
                        contact.phone,
                        rendered.text,
                        { tenantId, distributionId, recipientName: contact.name }
                    );
                }

                if (!result.success) {
                    logger.error(`Failed to send WhatsApp to ${contact.phone}`, { error: result.error });
                    continue;
                }
            }

            sent++;
            logger.info(`Sent ${type} to ${contactId}`);
        } catch (e) {
            logger.error(`Failed to send to ${contact.email || contact.phone}`, { error: e.message, stack: e.stack });
        }
    }
    logger.info(`Batch Complete. Sent ${sent}/${contacts.length}`, { type, tenantId });
}

/**
 * @swagger
 * /api/distributions/{id}/messages:
 *   get:
 *     summary: Get all tracked messages for a distribution
 *     tags: [Distributions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distribution ID
 *     responses:
 *       200:
 *         description: Array of tracked messages
 *       404:
 *         description: Distribution not found
 *       500:
 *         description: Server error
 */
router.get('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenant_id || 1;

        // Get distribution to determine type
        const distResult = await query(
            "SELECT * FROM distributions WHERE id = $1 AND tenant_id = $2",
            [id, tenantId]
        );

        if (distResult.rows.length === 0) {
            return res.status(404).json({ error: 'Distribution not found' });
        }

        const distribution = distResult.rows[0];
        let messages = [];

        // Fetch messages based on distribution type
        if (distribution.type === 'email') {
            const result = await query(
                `SELECT id, recipient_email AS recipient, recipient_name, message_id, status,
                 error_code, error_message, sent_at, delivered_at, opened_at, clicked_at,
                 bounced_at, failed_at, created_at
                 FROM email_messages
                 WHERE distribution_id = $1 AND tenant_id = $2
                 ORDER BY created_at DESC`,
                [id, tenantId]
            );
            messages = result.rows;
        } else if (distribution.type === 'sms') {
            const result = await query(
                `SELECT id, recipient_phone AS recipient, recipient_name, message_sid AS message_id,
                 status, error_code, error_message, sent_at, delivered_at, failed_at, created_at
                 FROM sms_messages
                 WHERE distribution_id = $1 AND tenant_id = $2
                 ORDER BY created_at DESC`,
                [id, tenantId]
            );
            messages = result.rows;
        } else if (distribution.type === 'whatsapp') {
            const result = await query(
                `SELECT id, recipient_phone AS recipient, recipient_name, message_sid AS message_id,
                 status, error_code, error_message, sent_at, delivered_at, read_at, failed_at, created_at
                 FROM whatsapp_messages
                 WHERE distribution_id = $1 AND tenant_id = $2
                 ORDER BY created_at DESC`,
                [id, tenantId]
            );
            messages = result.rows;
        }

        res.json({
            distributionId: id,
            type: distribution.type,
            messages
        });
    } catch (err) {
        logger.error('Failed to fetch distribution messages', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * @swagger
 * /api/distributions/{id}/stats:
 *   get:
 *     summary: Get aggregated delivery statistics for a distribution
 *     tags: [Distributions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distribution ID
 *     responses:
 *       200:
 *         description: Delivery statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 distributionId:
 *                   type: integer
 *                 type:
 *                   type: string
 *                 stats:
 *                   type: object
 *       404:
 *         description: Distribution not found
 *       500:
 *         description: Server error
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenant_id || 1;

        // Get distribution to determine type
        const distResult = await query(
            "SELECT * FROM distributions WHERE id = $1 AND tenant_id = $2",
            [id, tenantId]
        );

        if (distResult.rows.length === 0) {
            return res.status(404).json({ error: 'Distribution not found' });
        }

        const distribution = distResult.rows[0];
        let stats = {};

        // Calculate stats based on distribution type
        if (distribution.type === 'email') {
            const result = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'opened') as opened,
                    COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
                    COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending
                 FROM email_messages
                 WHERE distribution_id = $1 AND tenant_id = $2`,
                [id, tenantId]
            );
            stats = result.rows[0];

            // Calculate rates
            const delivered = parseInt(stats.delivered) || 0;
            const total = parseInt(stats.total) || 1;
            stats.deliveryRate = ((delivered / total) * 100).toFixed(2);
            stats.openRate = delivered > 0 ? (((parseInt(stats.opened) || 0) / delivered) * 100).toFixed(2) : '0.00';
            stats.clickRate = (parseInt(stats.opened) || 0) > 0 ? (((parseInt(stats.clicked) || 0) / parseInt(stats.opened)) * 100).toFixed(2) : '0.00';
            stats.bounceRate = ((parseInt(stats.bounced) || 0) / total * 100).toFixed(2);

        } else if (distribution.type === 'sms') {
            const result = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending
                 FROM sms_messages
                 WHERE distribution_id = $1 AND tenant_id = $2`,
                [id, tenantId]
            );
            stats = result.rows[0];

            // Calculate rates
            const total = parseInt(stats.total) || 1;
            stats.deliveryRate = (((parseInt(stats.delivered) || 0) / total) * 100).toFixed(2);

        } else if (distribution.type === 'whatsapp') {
            const result = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'sent') as sent,
                    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                    COUNT(*) FILTER (WHERE status = 'read') as read,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending
                 FROM whatsapp_messages
                 WHERE distribution_id = $1 AND tenant_id = $2`,
                [id, tenantId]
            );
            stats = result.rows[0];

            // Calculate rates
            const delivered = parseInt(stats.delivered) || 0;
            const total = parseInt(stats.total) || 1;
            stats.deliveryRate = ((delivered / total) * 100).toFixed(2);
            stats.readRate = delivered > 0 ? (((parseInt(stats.read) || 0) / delivered) * 100).toFixed(2) : '0.00';
        }

        res.json({
            distributionId: id,
            type: distribution.type,
            stats
        });
    } catch (err) {
        logger.error('Failed to fetch distribution stats', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
