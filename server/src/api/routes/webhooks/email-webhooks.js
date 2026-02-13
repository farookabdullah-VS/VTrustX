const express = require('express');
const router = express.Router();
const emailService = require('../../../services/emailService');
const logger = require('../../../infrastructure/logger');

/**
 * @swagger
 * /api/webhooks/email/sendgrid:
 *   post:
 *     summary: Handle SendGrid webhook events
 *     tags: [Webhooks]
 *     description: Processes delivery, bounce, open, and click events from SendGrid
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/sendgrid', async (req, res) => {
    try {
        const events = Array.isArray(req.body) ? req.body : [req.body];

        logger.info('[EmailWebhook] Received SendGrid webhook', {
            eventCount: events.length
        });

        for (const event of events) {
            await emailService.processStatusUpdate(event, 'sendgrid');
        }

        res.status(200).send('OK');
    } catch (error) {
        logger.error('[EmailWebhook] Failed to process SendGrid webhook', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

/**
 * @swagger
 * /api/webhooks/email/mailgun:
 *   post:
 *     summary: Handle Mailgun webhook events
 *     tags: [Webhooks]
 *     description: Processes delivery, bounce, open, and click events from Mailgun
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/mailgun', async (req, res) => {
    try {
        const eventData = req.body['event-data'] || req.body;

        logger.info('[EmailWebhook] Received Mailgun webhook', {
            event: eventData.event
        });

        await emailService.processStatusUpdate(eventData, 'mailgun');

        res.status(200).send('OK');
    } catch (error) {
        logger.error('[EmailWebhook] Failed to process Mailgun webhook', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

/**
 * @swagger
 * /api/webhooks/email/ses:
 *   post:
 *     summary: Handle AWS SES webhook events via SNS
 *     tags: [Webhooks]
 *     description: Processes delivery, bounce, and complaint notifications from AWS SES
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/ses', async (req, res) => {
    try {
        // Handle SNS subscription confirmation
        if (req.body.Type === 'SubscriptionConfirmation') {
            logger.info('[EmailWebhook] SNS subscription confirmation received', {
                topicArn: req.body.TopicArn
            });
            // In production, you would verify and confirm the subscription
            // by making a GET request to req.body.SubscribeURL
            return res.status(200).send('OK');
        }

        // Parse SNS message
        const message = req.body.Message ? JSON.parse(req.body.Message) : req.body;

        logger.info('[EmailWebhook] Received SES webhook', {
            eventType: message.eventType || message.notificationType
        });

        await emailService.processStatusUpdate(message, 'ses');

        res.status(200).send('OK');
    } catch (error) {
        logger.error('[EmailWebhook] Failed to process SES webhook', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

module.exports = router;
