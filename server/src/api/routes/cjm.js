const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const crypto = require('crypto');

// LIST Maps - Enhanced with search, status filter, sort
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { search, status, sort, createdBy } = req.query;

        let sql = "SELECT id, title, description, status, thumbnail_data, persona_id, created_by, tags, created_at, updated_at FROM cjm_maps WHERE tenant_id = $1";
        const params = [tenantId];
        let idx = 2;

        if (search) {
            sql += ` AND (title ILIKE $${idx} OR description ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        if (status) {
            sql += ` AND status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (createdBy) {
            sql += ` AND created_by = $${idx}`;
            params.push(createdBy);
            idx++;
        }

        if (sort === 'title') sql += " ORDER BY title ASC";
        else if (sort === 'created') sql += " ORDER BY created_at DESC";
        else sql += " ORDER BY updated_at DESC";

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET Map
router.get('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query(
            "SELECT * FROM cjm_maps WHERE id = $1 AND tenant_id = $2",
            [req.params.id, tenantId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Map not found" });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// CREATE Map
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { title, data, description, status, persona_id, tags } = req.body;

        const initialData = data || {
            project_name: title,
            stages: [{ id: "st_1", name: "Stage 1", style: { bg_color: "#F0F4FF", text_color: "#000000" } }],
            sections: []
        };

        const result = await query(
            `INSERT INTO cjm_maps (tenant_id, title, description, status, persona_id, created_by, tags, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [tenantId, title || 'Untitled Journey', description || null, status || 'draft', persona_id || null, req.user.id, tags || '[]', initialData]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// UPDATE Map (also auto-creates version snapshot)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { title, data, description, status, persona_id, tags, thumbnail_data } = req.body;

        // Get current data for versioning
        const current = await query("SELECT data FROM cjm_maps WHERE id = $1 AND tenant_id = $2", [req.params.id, tenantId]);
        if (current.rows.length > 0 && current.rows[0].data) {
            // Auto-create version
            const verCount = await query("SELECT COALESCE(MAX(version_number), 0) as max_ver FROM cjm_versions WHERE map_id = $1", [req.params.id]);
            const nextVer = (verCount.rows[0].max_ver || 0) + 1;
            await query(
                "INSERT INTO cjm_versions (map_id, version_number, data, created_by) VALUES ($1, $2, $3, $4)",
                [req.params.id, nextVer, current.rows[0].data, req.user.id]
            );
        }

        await query(
            `UPDATE cjm_maps SET
                title = COALESCE($1, title),
                data = COALESCE($2, data),
                description = COALESCE($3, description),
                status = COALESCE($4, status),
                persona_id = COALESCE($5, persona_id),
                tags = COALESCE($6, tags),
                thumbnail_data = COALESCE($7, thumbnail_data),
                updated_at = NOW()
             WHERE id = $8 AND tenant_id = $9`,
            [title, data, description, status, persona_id, tags, thumbnail_data, req.params.id, tenantId]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE Map
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // Cascade delete related records in a transaction for atomicity
        await transaction(async (client) => {
            await client.query("DELETE FROM cjm_comments WHERE map_id = $1", [req.params.id]);
            await client.query("DELETE FROM cjm_shares WHERE map_id = $1", [req.params.id]);
            await client.query("DELETE FROM cjm_versions WHERE map_id = $1", [req.params.id]);
            await client.query("DELETE FROM cjm_maps WHERE id = $1 AND tenant_id = $2", [req.params.id, tenantId]);
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DUPLICATE Map
router.post('/:id/duplicate', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const original = await query("SELECT * FROM cjm_maps WHERE id = $1 AND tenant_id = $2", [req.params.id, tenantId]);
        if (original.rows.length === 0) return res.status(404).json({ error: "Map not found" });

        const map = original.rows[0];
        const result = await query(
            `INSERT INTO cjm_maps (tenant_id, title, description, status, persona_id, created_by, tags, data)
             VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7) RETURNING *`,
            [tenantId, `${map.title} (Copy)`, map.description, map.persona_id, req.user.id, map.tags, map.data]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// SAVE THUMBNAIL
router.post('/:id/thumbnail', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { thumbnail_data } = req.body;
        await query(
            "UPDATE cjm_maps SET thumbnail_data = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3",
            [thumbnail_data, req.params.id, tenantId]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ VERSIONS ============

// LIST Versions
router.get('/:id/versions', authenticate, async (req, res) => {
    try {
        const result = await query(
            "SELECT id, version_number, created_by, created_at FROM cjm_versions WHERE map_id = $1 ORDER BY version_number DESC",
            [req.params.id]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET Version data
router.get('/:id/versions/:vid', authenticate, async (req, res) => {
    try {
        const result = await query(
            "SELECT * FROM cjm_versions WHERE id = $1 AND map_id = $2",
            [req.params.vid, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Version not found" });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// RESTORE Version
router.post('/:id/versions/:vid/restore', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const version = await query("SELECT data FROM cjm_versions WHERE id = $1 AND map_id = $2", [req.params.vid, req.params.id]);
        if (version.rows.length === 0) return res.status(404).json({ error: "Version not found" });

        await query(
            "UPDATE cjm_maps SET data = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3",
            [version.rows[0].data, req.params.id, tenantId]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ COMMENTS ============

// LIST Comments
router.get('/:id/comments', authenticate, async (req, res) => {
    try {
        const result = await query(
            "SELECT * FROM cjm_comments WHERE map_id = $1 ORDER BY created_at DESC",
            [req.params.id]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ADD Comment
router.post('/:id/comments', authenticate, async (req, res) => {
    try {
        const { section_id, stage_id, content } = req.body;
        const result = await query(
            `INSERT INTO cjm_comments (map_id, user_id, user_name, section_id, stage_id, content)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.params.id, req.user.id, req.user.name || req.user.email, section_id || null, stage_id || null, content]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// UPDATE Comment (resolve/unresolve)
router.put('/:id/comments/:cid', authenticate, async (req, res) => {
    try {
        const { resolved, content } = req.body;
        await query(
            "UPDATE cjm_comments SET resolved = COALESCE($1, resolved), content = COALESCE($2, content) WHERE id = $3 AND map_id = $4",
            [resolved, content, req.params.cid, req.params.id]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE Comment
router.delete('/:id/comments/:cid', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM cjm_comments WHERE id = $1 AND map_id = $2", [req.params.cid, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ SHARES ============

// SHARE Map
router.post('/:id/share', authenticate, async (req, res) => {
    try {
        const { user_id, permission } = req.body;
        const shareToken = crypto.randomBytes(24).toString('hex');

        const result = await query(
            `INSERT INTO cjm_shares (map_id, shared_with_user_id, share_token, permission)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.params.id, user_id || null, shareToken, permission || 'view']
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// LIST Shares
router.get('/:id/shares', authenticate, async (req, res) => {
    try {
        const result = await query(
            "SELECT * FROM cjm_shares WHERE map_id = $1 ORDER BY created_at DESC",
            [req.params.id]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE Share
router.delete('/:id/shares/:sid', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM cjm_shares WHERE id = $1 AND map_id = $2", [req.params.sid, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUBLIC shared access (no auth)
router.get('/shared/:token', async (req, res) => {
    try {
        const share = await query("SELECT * FROM cjm_shares WHERE share_token = $1", [req.params.token]);
        if (share.rows.length === 0) return res.status(404).json({ error: "Share not found" });

        const map = await query("SELECT id, title, description, data, status FROM cjm_maps WHERE id = $1", [share.rows[0].map_id]);
        if (map.rows.length === 0) return res.status(404).json({ error: "Map not found" });

        res.json({ ...map.rows[0], permission: share.rows[0].permission });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ TEMPLATES ============

// LIST Templates
router.get('/templates/list', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query(
            "SELECT * FROM cjm_templates WHERE tenant_id = $1 OR is_system = true ORDER BY is_system DESC, title ASC",
            [tenantId]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// CREATE Template (save current map as template)
router.post('/templates', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { title, description, category, data } = req.body;
        const result = await query(
            `INSERT INTO cjm_templates (tenant_id, title, description, category, data)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [tenantId, title, description, category, data]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// CREATE Map from Template
router.post('/from-template/:tid', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const template = await query("SELECT * FROM cjm_templates WHERE id = $1", [req.params.tid]);
        if (template.rows.length === 0) return res.status(404).json({ error: "Template not found" });

        const tpl = template.rows[0];
        const result = await query(
            `INSERT INTO cjm_maps (tenant_id, title, description, status, created_by, data)
             VALUES ($1, $2, $3, 'draft', $4, $5) RETURNING *`,
            [tenantId, tpl.title, tpl.description, req.user.id, tpl.data]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ ANALYTICS ============

// GET Analytics for a map (computed from JSONB)
router.get('/:id/analytics', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query("SELECT data FROM cjm_maps WHERE id = $1 AND tenant_id = $2", [req.params.id, tenantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Map not found" });

        const data = result.rows[0].data || {};
        const stages = data.stages || [];
        const sections = data.sections || [];

        // Compute analytics
        const analytics = {
            stageCount: stages.length,
            sectionCount: sections.length,
            sentimentByStage: [],
            touchpointsByStage: [],
            cellCompleteness: 0
        };

        let totalCells = stages.length * sections.length;
        let filledCells = 0;

        stages.forEach(stage => {
            let sentimentSum = 0;
            let sentimentCount = 0;
            let touchpointCount = 0;

            sections.forEach(section => {
                const cell = section.cells?.[stage.id];
                if (cell && Object.keys(cell).length > 0) filledCells++;

                if (section.type === 'sentiment_graph' && cell?.value !== undefined) {
                    sentimentSum += cell.value;
                    sentimentCount++;
                }
                if (section.type === 'touchpoints' && cell?.items) {
                    touchpointCount += cell.items.length;
                }
            });

            analytics.sentimentByStage.push({
                stage: stage.name,
                avgSentiment: sentimentCount > 0 ? sentimentSum / sentimentCount : 0
            });
            analytics.touchpointsByStage.push({
                stage: stage.name,
                count: touchpointCount
            });
        });

        analytics.cellCompleteness = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

        res.json(analytics);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
