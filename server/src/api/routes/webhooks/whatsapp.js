const express = require('express');
const router = express.Router();
const whatsappService = require('../../../services/whatsappService');
const logger = require('../../../infrastructure/logger');
const { query } = require('../../../infrastructure/database/db');

/**
 * Twilio WhatsApp Status Callback Webhook
 *
 * Handles delivery status updates from Twilio:
 * - sent: Message sent to WhatsApp
 * - delivered: Message delivered to recipient
 * - read: Message read by recipient
 * - failed: Message delivery failed
 *
 * Configure in Twilio Console:
 * Status Callback URL: https://your-domain.com/api/webhooks/whatsapp/status
 */
router.post('/status', async (req, res) => {
    try {
        const {
            MessageSid,
            MessageStatus,
            ErrorCode,
            ErrorMessage,
            From,
            To
        } = req.body;

        logger.info('[WhatsApp Webhook] Status callback received', {
            messageSid: MessageSid,
            status: MessageStatus,
            from: From,
            to: To,
            errorCode: ErrorCode
        });

        // Validate Twilio signature in production
        if (process.env.NODE_ENV === 'production') {
            const isValid = validateTwilioSignature(req);
            if (!isValid) {
                logger.warn('[WhatsApp Webhook] Invalid Twilio signature');
                return res.status(403).json({ error: 'Invalid signature' });
            }
        }

        // Process status update
        await whatsappService.processStatusUpdate(req.body);

        // Twilio expects 200 OK response
        res.status(200).send('OK');

    } catch (error) {
        logger.error('[WhatsApp Webhook] Error processing status callback', {
            error: error.message,
            body: req.body
        });
        // Still return 200 to prevent Twilio retries
        res.status(200).send('OK');
    }
});

/**
 * Twilio WhatsApp Inbound Message Webhook
 *
 * Handles incoming messages from users:
 * - Track session start (enables 24-hour freeform messaging window)
 * - Route to support system (future enhancement)
 *
 * Configure in Twilio Console:
 * Inbound Message URL: https://your-domain.com/api/webhooks/whatsapp/inbound
 */
router.post('/inbound', async (req, res) => {
    try {
        const {
            MessageSid,
            From,
            To,
            Body,
            NumMedia,
            ProfileName
        } = req.body;

        logger.info('[WhatsApp Webhook] Inbound message received', {
            messageSid: MessageSid,
            from: From,
            to: To,
            body: Body?.substring(0, 100), // Log first 100 chars only
            numMedia: NumMedia,
            profileName: ProfileName
        });

        // Validate Twilio signature in production
        if (process.env.NODE_ENV === 'production') {
            const isValid = validateTwilioSignature(req);
            if (!isValid) {
                logger.warn('[WhatsApp Webhook] Invalid Twilio signature');
                return res.status(403).json({ error: 'Invalid signature' });
            }
        }

        // Extract phone number (remove whatsapp: prefix)
        const phone = From.replace('whatsapp:', '');

        // Track session start (enables 24-hour freeform messaging)
        // Note: tenant_id would need to be looked up from phone number in production
        const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // For now, we'll track sessions without tenant isolation
        // In production, implement phone-to-tenant lookup
        await query(
            `INSERT INTO whatsapp_sessions (tenant_id, phone, last_inbound_at, session_expires_at)
            VALUES (1, $1, NOW(), $2)
            ON CONFLICT (tenant_id, phone)
            DO UPDATE SET last_inbound_at = NOW(), session_expires_at = $2, updated_at = NOW()`,
            [phone, sessionExpiresAt]
        );

        logger.info('[WhatsApp Webhook] Session updated', { phone });

        // Future enhancement: Route to support ticket system
        // if (Body?.toLowerCase().includes('help')) {
        //     await createSupportTicket({ phone, message: Body, profileName: ProfileName });
        // }

        // Respond with TwiML (optional - can send auto-reply)
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <!-- Auto-reply could go here -->
            </Response>
        `);

    } catch (error) {
        logger.error('[WhatsApp Webhook] Error processing inbound message', {
            error: error.message,
            body: req.body
        });
        res.status(200).send('OK');
    }
});

/**
 * Validate Twilio webhook signature
 * Ensures requests are actually from Twilio
 *
 * @param {object} req - Express request object
 * @returns {boolean} True if signature is valid
 */
function validateTwilioSignature(req) {
    try {
        const crypto = require('crypto');
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!authToken) {
            logger.warn('[WhatsApp Webhook] TWILIO_AUTH_TOKEN not configured');
            return false;
        }

        const twilioSignature = req.headers['x-twilio-signature'];
        if (!twilioSignature) {
            return false;
        }

        // Construct full URL
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}${req.originalUrl}`;

        // Build data string from POST parameters
        const data = Object.keys(req.body)
            .sort()
            .reduce((acc, key) => acc + key + req.body[key], url);

        // Compute HMAC SHA1
        const expectedSignature = crypto
            .createHmac('sha1', authToken)
            .update(Buffer.from(data, 'utf-8'))
            .digest('base64');

        return twilioSignature === expectedSignature;

    } catch (error) {
        logger.error('[WhatsApp Webhook] Error validating signature', { error: error.message });
        return false;
    }
}

/**
 * Health check endpoint for webhook testing
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'WhatsApp Webhook',
        endpoints: {
            status: '/api/webhooks/whatsapp/status',
            inbound: '/api/webhooks/whatsapp/inbound'
        }
    });
});

module.exports = router;
