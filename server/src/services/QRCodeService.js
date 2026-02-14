/**
 * QR Code Distribution Service
 *
 * Generate and track QR codes for survey distribution:
 * - Generate QR codes with custom designs
 * - Track scans and conversions
 * - Analytics and location-based insights
 * - Export for print (PNG, SVG, PDF)
 */

const QRCode = require('qrcode');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const crypto = require('crypto');

class QRCodeService {
    /**
     * Generate a new QR code for a form
     * @param {number} tenantId - Tenant ID
     * @param {number} formId - Form ID
     * @param {object} options - QR code options
     * @returns {Promise<object>} - Created QR code
     */
    static async createQRCode(tenantId, formId, options = {}) {
        try {
            const {
                name,
                description,
                location,
                campaign,
                tags = [],
                utm_source = 'qr_code',
                utm_medium = 'offline',
                utm_campaign,
                utm_content,
                utm_term,
                design_options = {},
                expires_at,
                created_by
            } = options;

            // Generate unique code
            const code = this.generateUniqueCode();
            const shortUrl = `/qr/${code}`;

            // Build full URL with UTM parameters
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const fullUrl = this.buildTrackingURL(formId, {
                qr_code: code,
                utm_source,
                utm_medium,
                utm_campaign,
                utm_content,
                utm_term
            });

            // Generate QR code image
            const qrImageData = await this.generateQRImage(fullUrl, design_options);

            // Save to database
            const result = await query(
                `INSERT INTO qr_codes (
                    tenant_id, form_id, code, name, description,
                    short_url, full_url, qr_image_data, design_options,
                    location, campaign, tags,
                    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                    expires_at, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING *`,
                [
                    tenantId, formId, code, name || null, description || null,
                    shortUrl, fullUrl, qrImageData, JSON.stringify(design_options),
                    location || null, campaign || null, tags,
                    utm_source, utm_medium, utm_campaign || null, utm_content || null, utm_term || null,
                    expires_at || null, created_by || null
                ]
            );

            logger.info('[QRCode] QR code created', {
                tenantId,
                formId,
                code,
                name
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[QRCode] Failed to create QR code', {
                error: error.message,
                tenantId,
                formId
            });
            throw error;
        }
    }

    /**
     * Generate unique QR code identifier
     * @returns {string} - Unique code
     */
    static generateUniqueCode() {
        return crypto.randomBytes(6).toString('base64url'); // URL-safe, 8 chars
    }

    /**
     * Build tracking URL with UTM parameters
     * @param {number} formId - Form ID
     * @param {object} params - Tracking parameters
     * @returns {string} - Full tracking URL
     */
    static buildTrackingURL(formId, params) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Get form to retrieve slug
        const formSlug = formId; // Will be replaced with actual slug lookup

        const url = new URL(`${baseUrl}/s/${formSlug}`);

        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            }
        });

        return url.toString();
    }

    /**
     * Generate QR code image (base64 PNG)
     * @param {string} url - URL to encode
     * @param {object} options - Design options
     * @returns {Promise<string>} - Base64 encoded PNG
     */
    static async generateQRImage(url, options = {}) {
        try {
            const {
                size = 400,
                errorCorrectionLevel = 'M', // L, M, Q, H
                color = { dark: '#000000', light: '#FFFFFF' },
                margin = 4
            } = options;

            const qrOptions = {
                errorCorrectionLevel,
                type: 'image/png',
                quality: 1,
                margin,
                color,
                width: size
            };

            const dataURL = await QRCode.toDataURL(url, qrOptions);

            // Return base64 data (without data:image/png;base64, prefix)
            return dataURL.split(',')[1];
        } catch (error) {
            logger.error('[QRCode] Failed to generate QR image', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Track a QR code scan
     * @param {string} code - QR code identifier
     * @param {object} scanData - Scan metadata
     * @returns {Promise<object>} - Scan record
     */
    static async trackScan(code, scanData = {}) {
        try {
            // Get QR code details
            const qrResult = await query(
                `SELECT * FROM qr_codes WHERE code = $1 AND is_active = true`,
                [code]
            );

            if (qrResult.rows.length === 0) {
                throw new Error('QR code not found or inactive');
            }

            const qrCode = qrResult.rows[0];

            // Check expiration
            if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
                throw new Error('QR code has expired');
            }

            const {
                ip_address,
                user_agent,
                device_type,
                browser,
                os,
                country,
                region,
                city,
                latitude,
                longitude,
                referrer,
                session_id
            } = scanData;

            // Check if this is a unique scan (first time from this session)
            let isUniqueScan = true;
            if (session_id) {
                const existingScan = await query(
                    `SELECT id FROM qr_scans WHERE qr_code_id = $1 AND session_id = $2`,
                    [qrCode.id, session_id]
                );
                isUniqueScan = existingScan.rows.length === 0;
            }

            // Insert scan record
            const scanResult = await query(
                `INSERT INTO qr_scans (
                    qr_code_id, tenant_id, form_id,
                    ip_address, user_agent, device_type, browser, os,
                    country, region, city, latitude, longitude,
                    referrer, session_id, is_unique_scan
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *`,
                [
                    qrCode.id, qrCode.tenant_id, qrCode.form_id,
                    ip_address || null, user_agent || null, device_type || null, browser || null, os || null,
                    country || null, region || null, city || null, latitude || null, longitude || null,
                    referrer || null, session_id || null, isUniqueScan
                ]
            );

            // Update QR code statistics
            await query(
                `UPDATE qr_codes
                SET total_scans = total_scans + 1,
                    unique_scans = unique_scans + ${isUniqueScan ? 1 : 0},
                    updated_at = NOW()
                WHERE id = $1`,
                [qrCode.id]
            );

            logger.info('[QRCode] Scan tracked', {
                code,
                scanId: scanResult.rows[0].id,
                isUniqueScan
            });

            return {
                scan: scanResult.rows[0],
                qr_code: qrCode,
                redirect_url: qrCode.full_url
            };
        } catch (error) {
            logger.error('[QRCode] Failed to track scan', {
                error: error.message,
                code
            });
            throw error;
        }
    }

    /**
     * Mark a scan as converted (submission completed)
     * @param {number} scanId - Scan ID
     * @param {number} submissionId - Submission ID
     * @returns {Promise<void>}
     */
    static async markConversion(scanId, submissionId) {
        try {
            const scanResult = await query(
                'SELECT * FROM qr_scans WHERE id = $1',
                [scanId]
            );

            if (scanResult.rows.length === 0) {
                throw new Error('Scan not found');
            }

            const scan = scanResult.rows[0];
            const timeToConversion = Math.floor((new Date() - new Date(scan.scanned_at)) / 1000);

            // Update scan record
            await query(
                `UPDATE qr_scans
                SET submission_id = $1,
                    converted = true,
                    converted_at = NOW(),
                    time_to_conversion_seconds = $2
                WHERE id = $3`,
                [submissionId, timeToConversion, scanId]
            );

            // Update QR code statistics
            await query(
                `UPDATE qr_codes
                SET total_submissions = total_submissions + 1,
                    conversion_rate = ROUND((total_submissions + 1)::numeric / NULLIF(total_scans, 0) * 100, 2),
                    updated_at = NOW()
                WHERE id = $1`,
                [scan.qr_code_id]
            );

            // Update submission with QR code reference
            await query(
                `UPDATE submissions
                SET qr_code_id = $1, scan_id = $2
                WHERE id = $3`,
                [scan.qr_code_id, scanId, submissionId]
            );

            logger.info('[QRCode] Conversion tracked', {
                scanId,
                submissionId,
                timeToConversion
            });
        } catch (error) {
            logger.error('[QRCode] Failed to mark conversion', {
                error: error.message,
                scanId,
                submissionId
            });
            // Don't throw - conversion tracking is non-critical
        }
    }

    /**
     * Get QR code analytics
     * @param {number} qrCodeId - QR code ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Analytics data
     */
    static async getAnalytics(qrCodeId, tenantId) {
        try {
            // Verify ownership
            const qrResult = await query(
                'SELECT * FROM qr_codes WHERE id = $1 AND tenant_id = $2',
                [qrCodeId, tenantId]
            );

            if (qrResult.rows.length === 0) {
                throw new Error('QR code not found');
            }

            const qrCode = qrResult.rows[0];

            // Get scan statistics
            const statsResult = await query(
                `SELECT
                    COUNT(*) as total_scans,
                    COUNT(*) FILTER (WHERE is_unique_scan = true) as unique_scans,
                    COUNT(*) FILTER (WHERE converted = true) as conversions,
                    AVG(time_to_conversion_seconds) FILTER (WHERE converted = true) as avg_conversion_time,
                    COUNT(DISTINCT device_type) as device_types,
                    COUNT(DISTINCT country) as countries
                FROM qr_scans
                WHERE qr_code_id = $1`,
                [qrCodeId]
            );

            // Get scans by device
            const deviceResult = await query(
                `SELECT device_type, COUNT(*) as count
                FROM qr_scans
                WHERE qr_code_id = $1 AND device_type IS NOT NULL
                GROUP BY device_type
                ORDER BY count DESC`,
                [qrCodeId]
            );

            // Get scans by location
            const locationResult = await query(
                `SELECT country, city, COUNT(*) as count
                FROM qr_scans
                WHERE qr_code_id = $1 AND country IS NOT NULL
                GROUP BY country, city
                ORDER BY count DESC
                LIMIT 10`,
                [qrCodeId]
            );

            // Get scans over time (last 30 days)
            const timelineResult = await query(
                `SELECT DATE(scanned_at) as date, COUNT(*) as scans
                FROM qr_scans
                WHERE qr_code_id = $1 AND scanned_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(scanned_at)
                ORDER BY date ASC`,
                [qrCodeId]
            );

            const stats = statsResult.rows[0];

            return {
                qr_code: qrCode,
                statistics: {
                    total_scans: parseInt(stats.total_scans) || 0,
                    unique_scans: parseInt(stats.unique_scans) || 0,
                    conversions: parseInt(stats.conversions) || 0,
                    conversion_rate: parseFloat(qrCode.conversion_rate) || 0,
                    avg_conversion_time: parseFloat(stats.avg_conversion_time) || 0,
                    device_types: parseInt(stats.device_types) || 0,
                    countries: parseInt(stats.countries) || 0
                },
                by_device: deviceResult.rows,
                by_location: locationResult.rows,
                timeline: timelineResult.rows.map(row => ({
                    date: row.date,
                    scans: parseInt(row.scans)
                }))
            };
        } catch (error) {
            logger.error('[QRCode] Failed to get analytics', {
                error: error.message,
                qrCodeId
            });
            throw error;
        }
    }

    /**
     * List QR codes for a form
     * @param {number} formId - Form ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<array>} - QR codes
     */
    static async listQRCodes(formId, tenantId) {
        try {
            const result = await query(
                `SELECT * FROM qr_codes
                WHERE form_id = $1 AND tenant_id = $2
                ORDER BY created_at DESC`,
                [formId, tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[QRCode] Failed to list QR codes', {
                error: error.message,
                formId
            });
            throw error;
        }
    }

    /**
     * Get QR code by code
     * @param {string} code - QR code identifier
     * @returns {Promise<object>} - QR code
     */
    static async getByCode(code) {
        try {
            const result = await query(
                'SELECT * FROM qr_codes WHERE code = $1',
                [code]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('[QRCode] Failed to get QR code', {
                error: error.message,
                code
            });
            throw error;
        }
    }

    /**
     * Update QR code
     * @param {number} qrCodeId - QR code ID
     * @param {number} tenantId - Tenant ID
     * @param {object} updates - Fields to update
     * @returns {Promise<object>} - Updated QR code
     */
    static async updateQRCode(qrCodeId, tenantId, updates) {
        try {
            const {
                name,
                description,
                location,
                campaign,
                tags,
                is_active,
                expires_at
            } = updates;

            const result = await query(
                `UPDATE qr_codes
                SET name = COALESCE($1, name),
                    description = COALESCE($2, description),
                    location = COALESCE($3, location),
                    campaign = COALESCE($4, campaign),
                    tags = COALESCE($5, tags),
                    is_active = COALESCE($6, is_active),
                    expires_at = COALESCE($7, expires_at),
                    updated_at = NOW()
                WHERE id = $8 AND tenant_id = $9
                RETURNING *`,
                [
                    name, description, location, campaign, tags,
                    is_active, expires_at,
                    qrCodeId, tenantId
                ]
            );

            if (result.rows.length === 0) {
                throw new Error('QR code not found');
            }

            logger.info('[QRCode] QR code updated', { qrCodeId });

            return result.rows[0];
        } catch (error) {
            logger.error('[QRCode] Failed to update QR code', {
                error: error.message,
                qrCodeId
            });
            throw error;
        }
    }

    /**
     * Delete QR code (soft delete by marking inactive)
     * @param {number} qrCodeId - QR code ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async deleteQRCode(qrCodeId, tenantId) {
        try {
            await query(
                `UPDATE qr_codes
                SET is_active = false, updated_at = NOW()
                WHERE id = $1 AND tenant_id = $2`,
                [qrCodeId, tenantId]
            );

            logger.info('[QRCode] QR code deleted', { qrCodeId });
        } catch (error) {
            logger.error('[QRCode] Failed to delete QR code', {
                error: error.message,
                qrCodeId
            });
            throw error;
        }
    }

    /**
     * Generate QR code in different formats
     * @param {string} url - URL to encode
     * @param {string} format - Format (png, svg, pdf)
     * @param {object} options - Design options
     * @returns {Promise<Buffer|string>} - Image data
     */
    static async generateInFormat(url, format = 'png', options = {}) {
        try {
            const {
                size = 400,
                errorCorrectionLevel = 'M',
                color = { dark: '#000000', light: '#FFFFFF' },
                margin = 4
            } = options;

            const qrOptions = {
                errorCorrectionLevel,
                quality: 1,
                margin,
                color,
                width: size
            };

            if (format === 'svg') {
                return await QRCode.toString(url, { ...qrOptions, type: 'svg' });
            } else if (format === 'png') {
                return await QRCode.toBuffer(url, { ...qrOptions, type: 'png' });
            } else {
                throw new Error(`Unsupported format: ${format}`);
            }
        } catch (error) {
            logger.error('[QRCode] Failed to generate format', {
                error: error.message,
                format
            });
            throw error;
        }
    }
}

module.exports = QRCodeService;
