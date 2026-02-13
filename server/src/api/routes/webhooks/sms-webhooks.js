const express = require('express');
const router = express.Router();
const smsService = require('../../../services/smsService');
const logger = require('../../../infrastructure/logger');

/**
 * @swagger
 * /api/webhooks/sms/unifonic:
 *   post:
 *     summary: Handle Unifonic SMS delivery status callbacks
 *     tags: [Webhooks]
 *     description: Processes delivery status updates from Unifonic SMS API
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               MessageID:
 *                 type: string
 *                 description: Unifonic message ID
 *               Status:
 *                 type: string
 *                 enum: [Queued, Sent, Delivered, Failed, Rejected]
 *               DoneDate:
 *                 type: string
 *                 format: date-time
 *               Recipient:
 *                 type: string
 *               ErrorCode:
 *                 type: string
 *               ErrorMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/unifonic', async (req, res) => {
    try {
        const {
            MessageID,
            Status,
            DoneDate,
            Recipient,
            ErrorCode,
            ErrorMessage
        } = req.body;

        logger.info('[SMSWebhook] Received Unifonic webhook', {
            messageId: MessageID,
            status: Status,
            recipient: Recipient
        });

        await smsService.processStatusUpdate({
            MessageID,
            Status,
            DoneDate,
            Recipient,
            ErrorCode,
            ErrorMessage
        });

        res.status(200).send('OK');
    } catch (error) {
        logger.error('[SMSWebhook] Failed to process Unifonic webhook', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

/**
 * @swagger
 * /api/webhooks/sms/twilio:
 *   post:
 *     summary: Handle Twilio SMS status callbacks
 *     tags: [Webhooks]
 *     description: Processes delivery status updates from Twilio SMS API
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               MessageSid:
 *                 type: string
 *               MessageStatus:
 *                 type: string
 *                 enum: [queued, sending, sent, delivered, undelivered, failed]
 *               To:
 *                 type: string
 *               From:
 *                 type: string
 *               ErrorCode:
 *                 type: string
 *               ErrorMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/twilio', async (req, res) => {
    try {
        const {
            MessageSid,
            MessageStatus,
            To,
            From,
            ErrorCode,
            ErrorMessage
        } = req.body;

        logger.info('[SMSWebhook] Received Twilio SMS webhook', {
            messageSid: MessageSid,
            status: MessageStatus,
            to: To
        });

        // Map Twilio format to Unifonic format for processing
        await smsService.processStatusUpdate({
            MessageID: MessageSid,
            Status: this.mapTwilioToUnifonicStatus(MessageStatus),
            Recipient: To,
            ErrorCode,
            ErrorMessage
        });

        res.status(200).send('OK');
    } catch (error) {
        logger.error('[SMSWebhook] Failed to process Twilio SMS webhook', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

/**
 * Map Twilio SMS status to Unifonic status format
 */
function mapTwilioToUnifonicStatus(twilioStatus) {
    const statusMap = {
        'queued': 'Queued',
        'sending': 'Queued',
        'sent': 'Sent',
        'delivered': 'Delivered',
        'undelivered': 'Failed',
        'failed': 'Failed'
    };
    return statusMap[twilioStatus] || 'Queued';
}

module.exports = router;
