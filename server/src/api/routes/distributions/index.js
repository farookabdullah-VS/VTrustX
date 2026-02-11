const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const emailService = require('../../../services/emailService');
const smsService = require('../../../services/smsService');
const validate = require('../../middleware/validate');
const { createDistributionSchema } = require('../../schemas/distributions.schemas');
const logger = require('../../../infrastructure/logger');

// 1. Get Campaign Types
router.get('/types', (req, res) => {
    res.json([
        { id: 'email', name: 'Email Blast', icon: 'email' },
        { id: 'sms', name: 'SMS', icon: 'sms' },
        { id: 'whatsapp', name: 'WhatsApp', icon: 'message' },
        { id: 'qr', name: 'QR Code', icon: 'qr' }
    ]);
});

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

// 3. Create Campaign
router.post('/', validate(createDistributionSchema), async (req, res) => {
    try {
        const { name, surveyId, type, subject, body, contacts } = req.body;

        if (!name || !type || !contacts || !Array.isArray(contacts)) {
            return res.status(400).json({ error: 'name, type, and contacts array are required' });
        }

        logger.info(`[Distribution] Creating Campaign: ${name} (${type})`);
        logger.info(`[Distribution] Contacts: ${contacts.length}`);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (type === 'email') {
            sendBatch(contacts, subject, body, surveyId, 'email', frontendUrl);
        } else if (type === 'sms') {
            sendBatch(contacts, subject, body, surveyId, 'sms', frontendUrl);
        }

        res.status(201).json({ id: Date.now(), status: 'Scheduled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function sendBatch(contacts, subject, body, surveyId, type, frontendUrl) {
    logger.info(`Starting ${type.toUpperCase()} Batch Send...`);
    let sent = 0;
    for (const contact of contacts) {
        try {
            const contactId = contact.email || contact.phone || 'unknown';
            const uniqueLink = `${frontendUrl}/s/${surveyId}?u=${encodeURIComponent(contactId)}`;

            const personalizedBody = body
                .replace('{{name}}', contact.name || 'Valued Customer')
                .replace('{{link}}', uniqueLink);

            if (type === 'email') {
                await emailService.sendEmail(contact.email, subject, personalizedBody, personalizedBody);
            } else if (type === 'sms') {
                if (!contact.phone) {
                    logger.info(`Skipping SMS for ${contact.name} - No Phone`);
                    continue;
                }
                await smsService.sendSMS(contact.phone, personalizedBody);
            }

            sent++;
            logger.info(`Sent ${type} to ${contactId}`);
        } catch (e) {
            logger.error(`Failed to send to ${contact.email || contact.phone}`, { error: e.message });
        }
    }
    logger.info(`Batch Complete. Sent ${sent}/${contacts.length}`);
}

module.exports = router;
