const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// GET /api/journeys - List all journeys for tenant
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query(
            `SELECT j.*, 
            (SELECT COUNT(*) FROM journey_instances WHERE journey_id = j.id AND status = 'active') as active_instances
            FROM journeys j 
            WHERE j.tenant_id = $1 
            ORDER BY j.updated_at DESC`,
            [tenantId]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/journeys - Create new journey
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { name, description } = req.body;

        const result = await query(
            'INSERT INTO journeys (tenant_id, name, description) VALUES ($1, $2, $3) RETURNING *',
            [tenantId, name, description]
        );

        // Create initial empty draft version
        await query(
            'INSERT INTO journey_versions (journey_id, version_number, definition) VALUES ($1, 1, $2)',
            [result.rows[0].id, JSON.stringify({ nodes: [], edges: [] })]
        );

        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/journeys/:id - Get detail and latest version
router.get('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const journeyId = req.params.id;

        const journeyRes = await query('SELECT * FROM journeys WHERE id = $1 AND tenant_id = $2', [journeyId, tenantId]);
        if (journeyRes.rows.length === 0) return res.status(404).json({ error: 'Journey not found' });

        // Get latest version
        const versionRes = await query(
            'SELECT * FROM journey_versions WHERE journey_id = $1 ORDER BY version_number DESC LIMIT 1',
            [journeyId]
        );

        res.json({
            ...journeyRes.rows[0],
            latestVersion: versionRes.rows[0] || { definition: { nodes: [], edges: [] } }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/journeys/:id/definition - Save diagram
router.put('/:id/definition', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const journeyId = req.params.id;
        const { definition } = req.body; // { nodes, edges }

        // Verify ownership
        const check = await query('SELECT id FROM journeys WHERE id = $1 AND tenant_id = $2', [journeyId, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Journey not found' });

        // Upsert latest draft version (logic: if latest is published, create new. if latest is draft, update it)
        // For simplicity: Always update the latest version if it's not active. Use version control logic later.

        const latestRes = await query('SELECT * FROM journey_versions WHERE journey_id = $1 ORDER BY version_number DESC LIMIT 1', [journeyId]);
        let latest = latestRes.rows[0];

        if (latest && !latest.is_active) {
            // Update existing draft
            await query('UPDATE journey_versions SET definition = $1, created_at = NOW() WHERE id = $2', [JSON.stringify(definition), latest.id]);
        } else {
            // Create new version
            const newVer = (latest?.version_number || 0) + 1;
            await query('INSERT INTO journey_versions (journey_id, version_number, definition) VALUES ($1, $2, $3)', [journeyId, newVer, JSON.stringify(definition)]);
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/journeys/:id/publish - Activate
router.post('/:id/publish', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const journeyId = req.params.id;

        // Verify ownership
        const check = await query('SELECT id FROM journeys WHERE id = $1 AND tenant_id = $2', [journeyId, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Journey not found' });

        // Set journey status to active
        await query("UPDATE journeys SET status = 'active' WHERE id = $1", [journeyId]);

        // Mark latest version as active
        const latestRes = await query('SELECT id FROM journey_versions WHERE journey_id = $1 ORDER BY version_number DESC LIMIT 1', [journeyId]);
        if (latestRes.rows.length > 0) {
            await query('UPDATE journey_versions SET is_active = true, published_at = NOW() WHERE id = $1', [latestRes.rows[0].id]);
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
