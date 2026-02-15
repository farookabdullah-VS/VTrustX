/**
 * Two-Factor Authentication Routes
 *
 * Endpoints for managing 2FA:
 * - POST /api/auth/2fa/setup - Generate new 2FA secret and QR code
 * - POST /api/auth/2fa/enable - Enable 2FA after token verification
 * - POST /api/auth/2fa/verify - Verify 2FA token during login
 * - POST /api/auth/2fa/disable - Disable 2FA
 * - GET /api/auth/2fa/status - Get 2FA status
 * - POST /api/auth/2fa/backup-codes/regenerate - Regenerate backup codes
 * - GET /api/auth/2fa/audit-log - Get 2FA audit log
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const TwoFactorAuthService = require('../../services/TwoFactorAuthService');
const logger = require('../../infrastructure/logger');
const QRCode = require('qrcode');

/**
 * POST /api/auth/2fa/setup
 * Generate a new 2FA secret and QR code for setup
 */
router.post('/setup', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Check if 2FA is already enabled
        const status = await TwoFactorAuthService.getStatus(userId);
        if (status.enabled) {
            return res.status(400).json({
                error: 'Two-factor authentication is already enabled'
            });
        }

        // Generate secret and backup codes
        const { secret, qrCodeUrl, backupCodes } = await TwoFactorAuthService.generateSecret(
            userId,
            userEmail
        );

        // Generate QR code image data URL
        const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

        return res.json({
            secret, // For manual entry
            qrCodeDataUrl, // Base64 image data URL
            backupCodes // Show once during setup
        });
    } catch (error) {
        logger.error('[2FA API] Setup failed', {
            error: error.message,
            userId: req.user?.id
        });
        return res.status(500).json({
            error: error.message || 'Failed to setup two-factor authentication'
        });
    }
});

/**
 * POST /api/auth/2fa/enable
 * Enable 2FA after verifying the initial token
 */
router.post('/enable', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        const { secret, token, backupCodes } = req.body;

        if (!secret || !token || !backupCodes) {
            return res.status(400).json({
                error: 'Secret, token, and backup codes are required'
            });
        }

        const reqInfo = {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };

        const result = await TwoFactorAuthService.enableTwoFactor(
            userId,
            tenantId,
            secret,
            token,
            backupCodes,
            reqInfo
        );

        return res.json({
            success: true,
            message: 'Two-factor authentication enabled successfully'
        });
    } catch (error) {
        logger.error('[2FA API] Enable failed', {
            error: error.message,
            userId: req.user?.id
        });
        return res.status(400).json({
            error: error.message || 'Failed to enable two-factor authentication'
        });
    }
});

/**
 * POST /api/auth/2fa/verify
 * Verify a 2FA token (used during login or sensitive operations)
 */
router.post('/verify', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Verification token is required'
            });
        }

        const reqInfo = {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };

        const result = await TwoFactorAuthService.verifyToken(
            userId,
            tenantId,
            token,
            reqInfo
        );

        if (result.success) {
            return res.json({
                success: true,
                method: result.method, // 'totp' or 'backup_code'
                remainingBackupCodes: result.remainingCodes || null
            });
        } else {
            return res.status(401).json({
                success: false,
                error: result.error || 'Invalid verification code'
            });
        }
    } catch (error) {
        logger.error('[2FA API] Verification failed', {
            error: error.message,
            userId: req.user?.id
        });
        return res.status(500).json({
            error: error.message || 'Verification failed'
        });
    }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA (requires current token for confirmation)
 */
router.post('/disable', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Current 2FA token is required to disable'
            });
        }

        const reqInfo = {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };

        await TwoFactorAuthService.disableTwoFactor(
            userId,
            tenantId,
            token,
            reqInfo
        );

        return res.json({
            success: true,
            message: 'Two-factor authentication disabled successfully'
        });
    } catch (error) {
        logger.error('[2FA API] Disable failed', {
            error: error.message,
            userId: req.user?.id
        });
        return res.status(400).json({
            error: error.message || 'Failed to disable two-factor authentication'
        });
    }
});

/**
 * GET /api/auth/2fa/status
 * Get current 2FA status for the user
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const status = await TwoFactorAuthService.getStatus(userId);

        return res.json(status);
    } catch (error) {
        logger.error('[2FA API] Get status failed', {
            error: error.message,
            userId: req.user?.id
        });
        return res.status(500).json({
            error: 'Failed to get 2FA status'
        });
    }
});

/**
 * POST /api/auth/2fa/backup-codes/regenerate
 * Regenerate backup codes (requires current token)
 */
router.post('/backup-codes/regenerate', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Current 2FA token is required to regenerate backup codes'
            });
        }

        const reqInfo = {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };

        const backupCodes = await TwoFactorAuthService.regenerateBackupCodes(
            userId,
            tenantId,
            token,
            reqInfo
        );

        return res.json({
            success: true,
            backupCodes,
            message: 'Backup codes regenerated. Save these in a secure location.'
        });
    } catch (error) {
        logger.error('[2FA API] Regenerate backup codes failed', {
            error: error.message,
            userId: req.user?.id
        });
        return res.status(400).json({
            error: error.message || 'Failed to regenerate backup codes'
        });
    }
});

/**
 * GET /api/auth/2fa/audit-log
 * Get 2FA audit log for the current user
 */
router.get('/audit-log', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;

        const auditLog = await TwoFactorAuthService.getAuditLog(userId, limit);

        return res.json({
            auditLog,
            count: auditLog.length
        });
    } catch (error) {
        logger.error('[2FA API] Get audit log failed', {
            error: error.message,
            userId: req.user?.id
        });
        return res.status(500).json({
            error: 'Failed to get audit log'
        });
    }
});

module.exports = router;
