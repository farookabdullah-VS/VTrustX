const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

// Setup Transporter (Lazy init or per request if settings change)
const createTransporter = () => {
    // Check for SMTP Environment Variables
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Fallback / Dev Mode: Just calculate what would happen or use a valid Ethereal account if wanted.
        // For this user context, we might not have them.
        return null;
    }
};

router.post('/send', authenticate, async (req, res) => {
    const { recipients, subject, body } = req.body;
    // recipients: Array of { email, uniqueUrl, ... }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: "No recipients provided" });
    }

    const transporter = createTransporter();
    const results = { success: 0, failed: 0, errors: [] };

    logger.info("Starting Email Batch...");

    for (const recipient of recipients) {
        try {
            // Personalize Body
            // We assume the body sent from frontend is the "Template" but here we might receive the pre-processed body?
            // Actually, the Frontend logic I wrote previously generates a "personalizedBody" but didn't pass it fully structured.
            // Let's assume the frontend sends: 
            // { recipients: [ { email: 'a@b.com', link: '...' } ], bodyTemplate: '...', subject: '...' }
            // OR the frontend did the heavy lifting.
            // Let's support the frontend sending the *exact* body for each if needed, OR a template.

            // Re-reading frontend code: 
            // It was doing: `recipientList.forEach` -> `personalizedBody`.
            // Ideally, the frontend should send a batch request:
            // { emails: [ { to: '...', body: '...' } ], subject: '...' }

            // Let's stick to a simple contract:
            // req.body = { batch: [ { to: 'x@y.com', body: 'Final Content' } ], subject: 'Subj' }

            const mailOptions = {
                from: process.env.SMTP_FROM || '"VTrustX Survey" <no-reply@vtrustx.com>',
                to: recipient.to,
                subject: subject,
                text: recipient.body,
                // html: recipient.body // TODO: Support HTML
            };

            if (transporter) {
                await transporter.sendMail(mailOptions);
                results.success++;
            } else {
                // Mock Send
                logger.info(`[MOCK EMAIL] To: ${recipient.to} | Subject: ${subject}`);
                logger.debug(`[Body]: ${recipient.body}`);
                results.success++; // We count it as success in mock mode
            }

        } catch (error) {
            logger.error(`Failed to send to ${recipient.to}`, { error: error.message });
            results.failed++;
            results.errors.push({ email: recipient.to, error: error.message });
        }
    }

    if (!transporter) {
        logger.info("No SMTP Configured. Emails were logged only.");
    }

    res.json({
        message: transporter ? "Batch processing complete" : "Mock Batch processing complete (Check server logs)",
        results
    });
});

module.exports = router;
