const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// GET /api/cx-personas - List all
router.get('/', authenticate, async (req, res) => {
    try {
        // Return summary
        const result = await query('SELECT id, name, title, photo_url, updated_at FROM cx_personas ORDER BY updated_at DESC');
        res.json(result.rows);
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/cx-personas/:id - Get full details (including layout)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM cx_personas WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Persona not found' });
        res.json(result.rows[0]);
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// Helper to ensure schema
async function ensureSchema() {
    try {
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'Draft\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT \'{}\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT \'#bef264\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT \'portrait\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS cjm_links JSONB DEFAULT \'[]\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS persona_type VARCHAR(50) DEFAULT \'Customer\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS domain VARCHAR(50) DEFAULT \'CX\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS owner_id VARCHAR(50) DEFAULT \'system\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS mapping_rules JSONB DEFAULT \'{}\'');
        await query('ALTER TABLE cx_personas ADD COLUMN IF NOT EXISTS live_metrics JSONB DEFAULT \'{"sat": 0, "loyalty": 0, "trust": 0, "effort": 0}\'');
    } catch (e) {
        console.error("Schema check failed (non-fatal):", e.message);
    }
}

// POST /api/cx-personas - Create
router.post('/', authenticate, async (req, res) => {
    try {
        await ensureSchema(); // Ensure columns exist

        const {
            name, title, photo_url, layout_config, status, tags,
            accent_color, orientation, persona_type, domain, mapping_rules
        } = req.body;

        const initialLayout = layout_config || { left: [], right: [] };

        const result = await query(
            `INSERT INTO cx_personas 
            (name, title, photo_url, layout_config, status, tags, accent_color, orientation, persona_type, domain, mapping_rules, owner_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
                name,
                title,
                photo_url || null,
                JSON.stringify(initialLayout),
                status || 'Draft',
                tags || [],
                accent_color || '#bef264',
                orientation || 'portrait',
                persona_type || 'Customer',
                domain || 'CX',
                JSON.stringify(mapping_rules || {}),
                req.user?.id || 'system'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/cx-personas/:id/clone
router.post('/:id/clone', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const source = await query('SELECT * FROM cx_personas WHERE id = $1', [id]);
        if (source.rows.length === 0) return res.status(404).json({ error: 'Source not found' });

        const s = source.rows[0];
        const result = await query(
            `INSERT INTO cx_personas 
            (name, title, photo_url, layout_config, status, tags, accent_color, orientation, persona_type, domain, mapping_rules, owner_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
                s.name + ' (Copy)',
                s.title,
                s.photo_url,
                s.layout_config,
                'Draft',
                s.tags,
                s.accent_color,
                s.orientation,
                s.persona_type,
                s.domain,
                s.mapping_rules,
                req.user?.id || 'system'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/cx-personas/:id - Update (Auto-save)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, title, photo_url, layout_config, status, tags,
            accent_color, orientation, cjm_links, persona_type, domain, mapping_rules
        } = req.body;

        const updates = [];
        const params = [];
        let i = 1;

        if (name) { updates.push(`name=$${i++}`); params.push(name); }
        if (title) { updates.push(`title=$${i++}`); params.push(title); }
        if (photo_url) { updates.push(`photo_url=$${i++}`); params.push(photo_url); }
        if (layout_config) { updates.push(`layout_config=$${i++}`); params.push(JSON.stringify(layout_config)); }
        if (status) { updates.push(`status=$${i++}`); params.push(status); }
        if (tags) { updates.push(`tags=$${i++}`); params.push(tags); }
        if (accent_color) { updates.push(`accent_color=$${i++}`); params.push(accent_color); }
        if (orientation) { updates.push(`orientation=$${i++}`); params.push(orientation); }
        if (cjm_links) { updates.push(`cjm_links=$${i++}`); params.push(JSON.stringify(cjm_links)); }
        if (persona_type) { updates.push(`persona_type=$${i++}`); params.push(persona_type); }
        if (domain) { updates.push(`domain=$${i++}`); params.push(domain); }
        if (mapping_rules) { updates.push(`mapping_rules=$${i++}`); params.push(JSON.stringify(mapping_rules)); }

        updates.push(`updated_at=NOW()`);

        if (updates.length > 1) { // At least one update + updated_at
            params.push(id);
            await query(`UPDATE cx_personas SET ${updates.join(', ')} WHERE id=$${i}`, params);
        }

        res.json({ success: true });
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/cx-personas/:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await query('DELETE FROM cx_personas WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (e) {
        console.error("[CX_PERSONAS_ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
