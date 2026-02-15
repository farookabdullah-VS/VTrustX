/**
 * QR Code Distribution API Routes
 *
 * Endpoints:
 * - POST /api/qr-codes - Create new QR code
 * - GET /api/qr-codes/form/:formId - List QR codes for form
 * - GET /api/qr-codes/:id - Get QR code details
 * - PUT /api/qr-codes/:id - Update QR code
 * - DELETE /api/qr-codes/:id - Delete QR code
 * - GET /api/qr-codes/:id/analytics - Get QR code analytics
 * - GET /api/qr-codes/:id/download/:format - Download QR code (png, svg)
 * - POST /api/qr-codes/track/:code - Track QR code scan (public)
 * - GET /api/qr/:code - Redirect endpoint (public)
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const QRCodeService = require('../../services/QRCodeService');
const logger = require('../../infrastructure/logger');
const { query } = require('../../infrastructure/database/db');

/**
 * POST /api/qr-codes
 * Create a new QR code
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const {
            formId,
            name,
            description,
            location,
            campaign,
            tags,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            design_options,
            expires_at
        } = req.body;

        // Validate form belongs to tenant
        const formCheck = await query(
            'SELECT id FROM forms WHERE id = $1 AND tenant_id = $2',
            [formId, tenantId]
        );

        if (formCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const qrCode = await QRCodeService.createQRCode(tenantId, formId, {
            name,
            description,
            location,
            campaign,
            tags,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            design_options,
            expires_at,
            created_by: req.user.id
        });

        return res.status(201).json({
            success: true,
            qr_code: {
                id: qrCode.id,
                code: qrCode.code,
                name: qrCode.name,
                short_url: qrCode.short_url,
                full_url: qrCode.full_url,
                qr_image_data: qrCode.qr_image_data,
                location: qrCode.location,
                campaign: qrCode.campaign,
                created_at: qrCode.created_at
            }
        });
    } catch (error) {
        logger.error('[QRCode API] Failed to create QR code', {
            error: error.message
        });
        return res.status(500).json({
            error: 'Failed to create QR code'
        });
    }
});

/**
 * GET /api/qr-codes/form/:formId
 * List QR codes for a form
 */
router.get('/form/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const tenantId = req.user.tenant_id;

        // Verify form belongs to tenant
        const formCheck = await query(
            'SELECT id FROM forms WHERE id = $1 AND tenant_id = $2',
            [formId, tenantId]
        );

        if (formCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }

        const qrCodes = await QRCodeService.listQRCodes(formId, tenantId);

        return res.json({
            formId: parseInt(formId),
            count: qrCodes.length,
            qr_codes: qrCodes.map(qr => ({
                id: qr.id,
                code: qr.code,
                name: qr.name,
                description: qr.description,
                short_url: qr.short_url,
                location: qr.location,
                campaign: qr.campaign,
                tags: qr.tags,
                total_scans: qr.total_scans,
                unique_scans: qr.unique_scans,
                total_submissions: qr.total_submissions,
                conversion_rate: parseFloat(qr.conversion_rate),
                is_active: qr.is_active,
                expires_at: qr.expires_at,
                created_at: qr.created_at
            }))
        });
    } catch (error) {
        logger.error('[QRCode API] Failed to list QR codes', {
            error: error.message,
            formId: req.params.formId
        });
        return res.status(500).json({
            error: 'Failed to retrieve QR codes'
        });
    }
});

/**
 * GET /api/qr-codes/:id
 * Get QR code details
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            'SELECT * FROM qr_codes WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'QR code not found' });
        }

        const qrCode = result.rows[0];

        return res.json({
            qr_code: {
                id: qrCode.id,
                code: qrCode.code,
                name: qrCode.name,
                description: qrCode.description,
                short_url: qrCode.short_url,
                full_url: qrCode.full_url,
                qr_image_data: qrCode.qr_image_data,
                design_options: qrCode.design_options,
                location: qrCode.location,
                campaign: qrCode.campaign,
                tags: qrCode.tags,
                utm_source: qrCode.utm_source,
                utm_medium: qrCode.utm_medium,
                utm_campaign: qrCode.utm_campaign,
                utm_content: qrCode.utm_content,
                utm_term: qrCode.utm_term,
                total_scans: qrCode.total_scans,
                unique_scans: qrCode.unique_scans,
                total_submissions: qrCode.total_submissions,
                conversion_rate: parseFloat(qrCode.conversion_rate),
                is_active: qrCode.is_active,
                expires_at: qrCode.expires_at,
                created_at: qrCode.created_at,
                updated_at: qrCode.updated_at
            }
        });
    } catch (error) {
        logger.error('[QRCode API] Failed to get QR code', {
            error: error.message,
            id: req.params.id
        });
        return res.status(500).json({
            error: 'Failed to retrieve QR code'
        });
    }
});

/**
 * PUT /api/qr-codes/:id
 * Update QR code
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const updates = req.body;

        const qrCode = await QRCodeService.updateQRCode(id, tenantId, updates);

        return res.json({
            success: true,
            qr_code: {
                id: qrCode.id,
                name: qrCode.name,
                description: qrCode.description,
                location: qrCode.location,
                campaign: qrCode.campaign,
                tags: qrCode.tags,
                is_active: qrCode.is_active,
                expires_at: qrCode.expires_at,
                updated_at: qrCode.updated_at
            }
        });
    } catch (error) {
        logger.error('[QRCode API] Failed to update QR code', {
            error: error.message,
            id: req.params.id
        });
        return res.status(500).json({
            error: error.message || 'Failed to update QR code'
        });
    }
});

/**
 * DELETE /api/qr-codes/:id
 * Delete QR code (soft delete)
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        await QRCodeService.deleteQRCode(id, tenantId);

        return res.json({
            success: true,
            message: 'QR code deleted successfully'
        });
    } catch (error) {
        logger.error('[QRCode API] Failed to delete QR code', {
            error: error.message,
            id: req.params.id
        });
        return res.status(500).json({
            error: 'Failed to delete QR code'
        });
    }
});

/**
 * GET /api/qr-codes/:id/analytics
 * Get QR code analytics
 */
router.get('/:id/analytics', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const analytics = await QRCodeService.getAnalytics(id, tenantId);

        return res.json(analytics);
    } catch (error) {
        logger.error('[QRCode API] Failed to get analytics', {
            error: error.message,
            id: req.params.id
        });
        return res.status(500).json({
            error: error.message || 'Failed to retrieve analytics'
        });
    }
});

/**
 * GET /api/qr-codes/:id/download/:format
 * Download QR code in specified format
 */
router.get('/:id/download/:format', authenticate, async (req, res) => {
    try {
        const { id, format } = req.params;
        const tenantId = req.user.tenant_id;

        if (!['png', 'svg'].includes(format)) {
            return res.status(400).json({ error: 'Invalid format. Supported: png, svg' });
        }

        // Get QR code
        const result = await query(
            'SELECT * FROM qr_codes WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'QR code not found' });
        }

        const qrCode = result.rows[0];

        // Generate in requested format
        const imageData = await QRCodeService.generateInFormat(
            qrCode.full_url,
            format,
            qrCode.design_options
        );

        // Set response headers
        if (format === 'png') {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `attachment; filename="qr-${qrCode.code}.png"`);
            return res.send(imageData);
        } else if (format === 'svg') {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Content-Disposition', `attachment; filename="qr-${qrCode.code}.svg"`);
            return res.send(imageData);
        }
    } catch (error) {
        logger.error('[QRCode API] Failed to download QR code', {
            error: error.message,
            id: req.params.id,
            format: req.params.format
        });
        return res.status(500).json({
            error: 'Failed to download QR code'
        });
    }
});

/**
 * POST /api/qr-codes/track/:code
 * Track QR code scan (public endpoint)
 */
router.post('/track/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const {
            session_id,
            device_type,
            browser,
            os
        } = req.body;

        const scanData = {
            ip_address: req.ip || req.headers['x-forwarded-for'],
            user_agent: req.headers['user-agent'],
            device_type,
            browser,
            os,
            referrer: req.headers['referer'] || req.headers['referrer'],
            session_id
        };

        const result = await QRCodeService.trackScan(code, scanData);

        return res.json({
            success: true,
            scan_id: result.scan.id,
            redirect_url: result.redirect_url
        });
    } catch (error) {
        logger.error('[QRCode API] Failed to track scan', {
            error: error.message,
            code: req.params.code
        });
        return res.status(500).json({
            error: error.message || 'Failed to track scan'
        });
    }
});

/**
 * GET /api/qr/:code
 * Redirect endpoint (public)
 */
router.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;

        // Track scan with basic info
        const scanData = {
            ip_address: req.ip || req.headers['x-forwarded-for'],
            user_agent: req.headers['user-agent'],
            referrer: req.headers['referer'] || req.headers['referrer']
        };

        const result = await QRCodeService.trackScan(code, scanData);

        // Redirect to survey
        return res.redirect(result.redirect_url);
    } catch (error) {
        logger.error('[QRCode API] Failed to redirect', {
            error: error.message,
            code: req.params.code
        });

        // Fallback: try to redirect anyway
        const qrCode = await QRCodeService.getByCode(req.params.code);
        if (qrCode) {
            return res.redirect(qrCode.full_url);
        }

        return res.status(404).send('QR code not found or expired');
    }
});

module.exports = router;
