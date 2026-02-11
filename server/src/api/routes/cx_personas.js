const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPersonaSchema } = require('../schemas/personas.schemas');
const logger = require('../../infrastructure/logger');

/**
 * @swagger
 * /api/cx-personas:
 *   get:
 *     summary: List personas
 *     description: Retrieve all CX personas for the authenticated tenant, returning summary fields (id, name, title, photo_url, updated_at).
 *     tags: [Personas]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of persona summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Persona'
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, async (req, res) => {
    try {
        // Return summary
        const result = await query('SELECT id, name, title, photo_url, updated_at FROM cx_personas WHERE tenant_id = $1 ORDER BY updated_at DESC', [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) {
        logger.error("[CX_PERSONAS_ERROR]", { error: e.message });
        res.status(500).json({ error: 'Failed to fetch personas' });
    }
});

/**
 * @swagger
 * /api/cx-personas/{id}:
 *   get:
 *     summary: Get persona
 *     description: Retrieve full details of a single CX persona by ID, including layout configuration.
 *     tags: [Personas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Persona ID
 *     responses:
 *       200:
 *         description: Full persona object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Persona'
 *       404:
 *         description: Persona not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM cx_personas WHERE id = $1 AND tenant_id = $2', [id, req.user.tenant_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Persona not found' });
        res.json(result.rows[0]);
    } catch (e) {
        logger.error("[CX_PERSONAS_ERROR]", { error: e.message });
        res.status(500).json({ error: 'Failed to fetch persona' });
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
        logger.warn("Schema check failed (non-fatal)", { detail: e.message });
    }
}

/**
 * @swagger
 * /api/cx-personas:
 *   post:
 *     summary: Create persona
 *     description: Create a new CX persona with optional layout configuration, tags, and mapping rules.
 *     tags: [Personas]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Persona name
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Persona title or role
 *               photo_url:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *                 description: URL for persona avatar
 *               layout_config:
 *                 type: object
 *                 description: Layout configuration for the persona card
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *                 default: active
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags for categorization
 *               persona_type:
 *                 type: string
 *                 maxLength: 100
 *                 description: Type of persona (e.g. Customer)
 *               domain:
 *                 type: string
 *                 maxLength: 255
 *                 description: Domain scope (e.g. CX)
 *               mapping_rules:
 *                 type: object
 *                 description: Rules for mapping persona to data sources
 *     responses:
 *       201:
 *         description: Persona created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Persona'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, validate(createPersonaSchema), async (req, res) => {
    try {
        await ensureSchema(); // Ensure columns exist

        const {
            name, title, photo_url, layout_config, status, tags,
            accent_color, orientation, persona_type, domain, mapping_rules
        } = req.body;

        const initialLayout = layout_config || { left: [], right: [] };

        const result = await query(
            `INSERT INTO cx_personas 
            (name, title, photo_url, layout_config, status, tags, accent_color, orientation, persona_type, domain, mapping_rules, owner_id, tenant_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
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
                req.user?.id || 'system',
                req.user.tenant_id
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        logger.error("[CX_PERSONAS_ERROR]", { error: e.message });
        res.status(500).json({ error: 'Failed to create persona' });
    }
});

/**
 * @swagger
 * /api/cx-personas/{id}/clone:
 *   post:
 *     summary: Clone persona
 *     description: Create a copy of an existing CX persona. The cloned persona is set to Draft status with " (Copy)" appended to the name.
 *     tags: [Personas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the persona to clone
 *     responses:
 *       201:
 *         description: Cloned persona created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Persona'
 *       404:
 *         description: Source persona not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/clone', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const source = await query('SELECT * FROM cx_personas WHERE id = $1 AND tenant_id = $2', [id, req.user.tenant_id]);
        if (source.rows.length === 0) return res.status(404).json({ error: 'Source not found' });

        const s = source.rows[0];
        const result = await query(
            `INSERT INTO cx_personas 
            (name, title, photo_url, layout_config, status, tags, accent_color, orientation, persona_type, domain, mapping_rules, owner_id, tenant_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
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
                req.user?.id || 'system',
                req.user.tenant_id
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        logger.error("[CX_PERSONAS_ERROR] Failed to clone persona", { error: e.message });
        res.status(500).json({ error: 'Failed to clone persona' });
    }
});

/**
 * @swagger
 * /api/cx-personas/{id}:
 *   put:
 *     summary: Update persona
 *     description: Update an existing CX persona. Supports partial updates (auto-save). Only provided fields are updated.
 *     tags: [Personas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Persona ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               title:
 *                 type: string
 *               photo_url:
 *                 type: string
 *                 format: uri
 *               layout_config:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               accent_color:
 *                 type: string
 *               orientation:
 *                 type: string
 *               cjm_links:
 *                 type: array
 *                 items:
 *                   type: object
 *               persona_type:
 *                 type: string
 *               domain:
 *                 type: string
 *               mapping_rules:
 *                 type: object
 *     responses:
 *       200:
 *         description: Persona updated successfully
 *       500:
 *         description: Internal server error
 */
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
            params.push(req.user.tenant_id);
            await query(`UPDATE cx_personas SET ${updates.join(', ')} WHERE id=$${i} AND tenant_id=$${i + 1}`, params);
        }

        res.json({ success: true });
    } catch (e) {
        logger.error("[CX_PERSONAS_ERROR]", { error: e.message });
        res.status(500).json({ error: 'Failed to update persona' });
    }
});

/**
 * @swagger
 * /api/cx-personas/{id}:
 *   delete:
 *     summary: Delete persona
 *     description: Delete a CX persona by ID. Only personas belonging to the authenticated tenant can be deleted.
 *     tags: [Personas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Persona ID
 *     responses:
 *       204:
 *         description: Persona deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await query('DELETE FROM cx_personas WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
        res.status(204).send();
    } catch (e) {
        logger.error("[CX_PERSONAS_ERROR]", { error: e.message });
        res.status(500).json({ error: 'Failed to delete persona' });
    }
});

module.exports = router;
