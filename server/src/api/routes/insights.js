const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// GET /api/insights - Fetch all for tenant
router.get('/', authenticate, async (req, res) => {
    try {
        const { submissionId, formId } = req.query;
        let sql = "SELECT * FROM insights WHERE tenant_id = $1";
        const params = [req.user.tenant_id];

        if (submissionId) {
            sql += " AND submission_id = $2";
            params.push(submissionId);
        } else if (formId) {
            sql += " AND form_id = $2";
            params.push(formId);
        }

        sql += " ORDER BY created_at DESC";
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/insights - Store new insight (from AI Service)
// Note: In production, this should have a specific API Key or Internal Auth
router.post('/', authenticate, async (req, res) => {
    try {
        const { submission_id, form_id, type, content, metadata } = req.body;

        await query(
            "INSERT INTO insights (tenant_id, submission_id, form_id, type, content, metadata) VALUES ($1, $2, $3, $4, $5, $6)",
            [req.user.tenant_id, submission_id, form_id, type, content, JSON.stringify(metadata || {})]
        );

        res.status(201).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
