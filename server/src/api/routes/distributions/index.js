const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const emailService = require('../../../services/emailService');
const smsService = require('../../../services/smsService');

// 1. Get Campaign Types
router.get('/types', (req, res) => {
    res.json([
        { id: 'email', name: 'Email Blast', icon: 'email' },
        { id: 'sms', name: 'SMS', icon: 'sms' },
        { id: 'whatsapp', name: 'WhatsApp', icon: 'message' },
        { id: 'qr', name: 'QR Code', icon: 'qr' }
    ]);
});

// 2. Get Campaigns (Mock Schema if tables don't exist yet)
router.get('/', async (req, res) => {
    try {
        // Try selecting from DB, if fail return mock
        const result = await query("SELECT * FROM distributions ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        // Mock Data for MVP until migration runs
        res.json([
            { id: 1, name: 'Q1 Customer Pulse', type: 'email', status: 'Sent', sent_count: 154, open_rate: 45, response_rate: 12, created_at: new Date() },
            { id: 2, name: 'Beta Feedback', type: 'email', status: 'Draft', sent_count: 0, open_rate: 0, response_rate: 0, created_at: new Date() }
        ]);
    }
});

// 3. Create Campaign
router.post('/', async (req, res) => {
    try {
        const { name, surveyId, type, subject, body, contacts } = req.body;
        // In real app: INSERT INTO distributions ... RETURNING id
        // For now, simulate success

        // Log simulation
        console.log(`[Distribution] Creating Campaign: ${name} (${type})`);
        console.log(`[Distribution] Contacts: ${contacts.length}`);

        if (type === 'email') {
            // Process in background
            sendBatch(contacts, subject, body, surveyId, 'email');
        } else if (type === 'sms') {
            sendBatch(contacts, subject, body, surveyId, 'sms');
        }

        res.status(201).json({ id: Date.now(), status: 'Scheduled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function sendBatch(contacts, subject, body, surveyId, type) {
    console.log(`Starting ${type.toUpperCase()} Batch Send...`);
    let sent = 0;
    for (const contact of contacts) {
        try {
            // Personalize Link
            // MVP: /s/{surveyId}?c={contact.email}
            const contactId = contact.email || contact.phone || 'unknown';
            const uniqueLink = `http://localhost:5173/s/${surveyId}?u=${encodeURIComponent(contactId)}`;

            const personalizedBody = body
                .replace('{{name}}', contact.name || 'Valued Customer')
                .replace('{{link}}', uniqueLink);

            if (type === 'email') {
                await emailService.sendEmail(contact.email, subject, personalizedBody, personalizedBody);
            } else if (type === 'sms') {
                if (!contact.phone) {
                    console.log(`Skipping SMS for ${contact.name} - No Phone`);
                    continue;
                }
                await smsService.sendSMS(contact.phone, personalizedBody);
            }

            sent++;
            console.log(`Sent ${type} to ${contactId}`);
        } catch (e) {
            console.error(`Failed to send to ${contact.email || contact.phone}`, e.message);
        }
    }
    console.log(`Batch Complete. Sent ${sent}/${contacts.length}`);
}

module.exports = router;
