const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

// --- PROTECTED ROUTES (For creating shares) ---

/**
 * @swagger
 * /api/shared/create:
 *   post:
 *     summary: Create a shared dashboard link for a form
 *     tags: [SharedDashboards]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *             properties:
 *               formId:
 *                 type: integer
 *                 description: ID of the form to share
 *     responses:
 *       200:
 *         description: Share link created or existing link returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   format: uuid
 *                 url:
 *                   type: string
 *                   example: /shared/abc-123-def
 *       400:
 *         description: Form ID is required
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied or form not found
 *       500:
 *         description: Server error
 */
router.post('/create', authenticate, async (req, res) => {
    const { formId } = req.body;

    if (!formId) return res.status(400).json({ error: 'Form ID is required' });

    try {
        // Check if user has access to this form
        const permissionCheck = await query(
            'SELECT id FROM forms WHERE id = $1 AND tenant_id = $2',
            [formId, req.user.tenant_id]
        );

        if (permissionCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied or form not found' });
        }

        // Check availability
        const existing = await query(
            'SELECT * FROM shared_dashboards WHERE form_id = $1',
            [formId]
        );

        if (existing.rows.length > 0) {
            return res.json({
                token: existing.rows[0].share_token,
                url: `/shared/${existing.rows[0].share_token}`
            });
        }

        // Create new
        const token = uuidv4();
        await query(
            'INSERT INTO shared_dashboards (form_id, share_token, is_public, created_by) VALUES ($1, $2, true, $3)',
            [formId, token, req.user.id]
        );

        res.json({
            token,
            url: `/shared/${token}`
        });

    } catch (err) {
        logger.error('Error creating shared dashboard', { error: err.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// --- PUBLIC ROUTES (For viewing) ---

/**
 * @swagger
 * /api/shared/{token}/view:
 *   get:
 *     summary: View a shared dashboard by token
 *     tags: [SharedDashboards]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Share token for the dashboard
 *     responses:
 *       200:
 *         description: Dashboard data with form and submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 form:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     definition:
 *                       type: object
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     tenant_theme:
 *                       type: object
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       form_id:
 *                         type: integer
 *                       data:
 *                         type: object
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Dashboard not found or form data unavailable
 *       500:
 *         description: Server error
 */
router.get('/:token/view', async (req, res) => {
    const { token } = req.params;

    try {
        // Validate token
        const share = await query(
            'SELECT * FROM shared_dashboards WHERE share_token = $1',
            [token]
        );

        if (share.rows.length === 0) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }

        const dashboard = share.rows[0];
        const formId = dashboard.form_id;

        // Fetch Form Data with Tenant Theme
        const formResult = await query(
            `SELECT f.id, f.title, f.definition, f.created_at, t.theme as tenant_theme 
             FROM forms f
             JOIN tenants t ON f.tenant_id = t.id
             WHERE f.id = $1`,
            [formId]
        );

        if (formResult.rows.length === 0) {
            return res.status(404).json({ error: 'Form data unavailable' });
        }

        // Fetch Submissions (exclude sensitive data if needed, but for dashboard usually raw is okay)
        // We'll join users just to handle the existing structure, though name might be null if anonymous
        const subResult = await query(
            `SELECT id, form_id, data, created_at 
             FROM submissions 
             WHERE form_id = $1
             ORDER BY created_at DESC`,
            [formId]
        );

        // Return combined data object
        res.json({
            form: formResult.rows[0],
            submissions: subResult.rows
        });

    } catch (err) {
        logger.error('Public dashboard error', { error: err.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
