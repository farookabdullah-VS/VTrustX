const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const authenticate = require('../../middleware/auth');
const logger = require('../../../infrastructure/logger');

/**
 * @swagger
 * /api/templates/validate:
 *   post:
 *     summary: Validate template syntax and media references
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *               - channel
 *             properties:
 *               body:
 *                 type: string
 *                 description: Template body with placeholders
 *               channel:
 *                 type: string
 *                 enum: [email, sms, whatsapp, qr]
 *                 description: Distribution channel
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *                 mediaCount:
 *                   type: integer
 *                 estimatedSize:
 *                   type: integer
 *       400:
 *         description: Validation failed
 */
router.post('/validate', authenticate, async (req, res) => {
    try {
        const { body, channel } = req.body;
        const tenantId = req.user.tenant_id;

        if (!body || !channel) {
            return res.status(400).json({
                valid: false,
                errors: ['body and channel are required']
            });
        }

        const errors = [];
        const warnings = [];

        // Extract all placeholders
        const placeholderRegex = /{{([^}]+)}}/g;
        const placeholders = [...body.matchAll(placeholderRegex)];

        // Extract media placeholders
        const mediaRegex = /{{(image|video|document|audio):(\d+)}}/g;
        const mediaMatches = [...body.matchAll(mediaRegex)];
        const mediaIds = mediaMatches.map(m => parseInt(m[2]));

        // Verify media exists
        if (mediaIds.length > 0) {
            const result = await query(
                'SELECT id FROM media_assets WHERE id = ANY($1) AND tenant_id = $2',
                [mediaIds, tenantId]
            );

            const foundIds = result.rows.map(r => r.id);
            const missingIds = mediaIds.filter(id => !foundIds.includes(id));

            if (missingIds.length > 0) {
                errors.push(`Media not found: ${missingIds.join(', ')}`);
            }
        }

        // Channel-specific validation
        if (channel === 'sms') {
            if (mediaIds.length > 0) {
                warnings.push('SMS does not support media. Media placeholders will be converted to URLs.');
            }

            // Check SMS length (160 chars for single SMS, 153 for multipart)
            const estimatedLength = body.length;
            if (estimatedLength > 160) {
                const parts = Math.ceil(estimatedLength / 153);
                warnings.push(`Message will be sent as ${parts} SMS parts (${estimatedLength} characters)`);
            }
        }

        if (channel === 'whatsapp') {
            // WhatsApp has a 4096 character limit
            if (body.length > 4096) {
                errors.push('WhatsApp messages are limited to 4096 characters');
            }
        }

        // Check for required placeholders
        const hasLink = placeholders.some(m => m[1] === 'link');
        if (!hasLink) {
            warnings.push('Template does not include {{link}} placeholder for survey link');
        }

        // Validate placeholder syntax
        for (const match of placeholders) {
            const placeholder = match[1];

            // Check for common placeholders
            const validPlaceholders = ['name', 'email', 'phone', 'link', 'company'];
            const isMediaPlaceholder = /^(image|video|document|audio):\d+$/.test(placeholder);

            if (!validPlaceholders.includes(placeholder) && !isMediaPlaceholder) {
                warnings.push(`Unknown placeholder: {{${placeholder}}}`);
            }
        }

        // Estimate size
        const estimatedSize = Buffer.byteLength(body, 'utf8');

        // Build response
        const valid = errors.length === 0;

        const response = {
            valid,
            mediaCount: mediaIds.length,
            estimatedSize,
            placeholderCount: placeholders.length
        };

        if (errors.length > 0) {
            response.errors = errors;
        }

        if (warnings.length > 0) {
            response.warnings = warnings;
        }

        logger.info('[TemplateAPI] Validation completed', {
            valid,
            channel,
            mediaCount: mediaIds.length,
            errorCount: errors.length,
            warningCount: warnings.length,
            tenantId
        });

        res.json(response);
    } catch (error) {
        logger.error('[TemplateAPI] Validation failed', { error: error.message });
        res.status(500).json({
            valid: false,
            errors: ['Validation failed due to server error']
        });
    }
});

module.exports = router;
