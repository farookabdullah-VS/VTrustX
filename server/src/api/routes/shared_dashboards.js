const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/auth');

// --- PROTECTED ROUTES (For creating shares) ---

/**
 * Create or get existing share link for a form
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
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// --- PUBLIC ROUTES (For viewing) ---

/**
 * Get public dashboard data
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
        console.error("Public dashboard error:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
