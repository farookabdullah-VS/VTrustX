const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createMapSchema, updateMapSchema, createCommentSchema, shareMapSchema } = require('../schemas/cjm.schemas');
const crypto = require('crypto');

/**
 * @swagger
 * /api/cjm:
 *   get:
 *     summary: List journey maps
 *     description: Retrieve all customer journey maps for the authenticated tenant with optional search, status filter, and sorting.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description (case-insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by map status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [title, created, updated]
 *         description: Sort order (default updated_at DESC)
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: integer
 *         description: Filter by creator user ID
 *     responses:
 *       200:
 *         description: Array of journey maps
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CJMMap'
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}:
 *   get:
 *     summary: Get journey map
 *     description: Retrieve a single customer journey map by ID for the authenticated tenant.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     responses:
 *       200:
 *         description: Journey map object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CJMMap'
 *       404:
 *         description: Map not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm:
 *   post:
 *     summary: Create journey map
 *     description: Create a new customer journey map for the authenticated tenant.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               persona_id:
 *                 type: string
 *                 format: uuid
 *               tags:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: string
 *               data:
 *                 type: object
 *               template_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Created journey map
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CJMMap'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, validate(createMapSchema), async (req, res) => {
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

/**
 * @swagger
 * /api/cjm/{id}:
 *   put:
 *     summary: Update journey map
 *     description: Update an existing customer journey map. Automatically creates a version snapshot of the current data before applying changes.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               persona_id:
 *                 type: string
 *                 format: uuid
 *               tags:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: string
 *               data:
 *                 type: object
 *               thumbnail_data:
 *                 type: string
 *     responses:
 *       200:
 *         description: Map updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, validate(updateMapSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { title, data, description, status, persona_id, tags, thumbnail_data } = req.body;

        await transaction(async (client) => {
            // Get current data for versioning
            const current = await client.query("SELECT data FROM cjm_maps WHERE id = $1 AND tenant_id = $2", [req.params.id, tenantId]);
            if (current.rows.length > 0 && current.rows[0].data) {
                // Auto-create version
                const verCount = await client.query("SELECT COALESCE(MAX(version_number), 0) as max_ver FROM cjm_versions WHERE map_id = $1", [req.params.id]);
                const nextVer = (verCount.rows[0].max_ver || 0) + 1;
                await client.query(
                    "INSERT INTO cjm_versions (map_id, version_number, data, created_by) VALUES ($1, $2, $3, $4)",
                    [req.params.id, nextVer, current.rows[0].data, req.user.id]
                );
            }

            await client.query(
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
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * @swagger
 * /api/cjm/{id}:
 *   delete:
 *     summary: Delete journey map
 *     description: Delete a customer journey map and all related records (comments, shares, versions) in a single transaction.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     responses:
 *       200:
 *         description: Map deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/duplicate:
 *   post:
 *     summary: Duplicate journey map
 *     description: Create a copy of an existing journey map with "(Copy)" appended to the title and status set to draft.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID to duplicate
 *     responses:
 *       200:
 *         description: Duplicated journey map
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CJMMap'
 *       404:
 *         description: Map not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/thumbnail:
 *   post:
 *     summary: Upload thumbnail
 *     description: Save or update the thumbnail image data for a journey map.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - thumbnail_data
 *             properties:
 *               thumbnail_data:
 *                 type: string
 *                 description: Base64-encoded thumbnail image data
 *     responses:
 *       200:
 *         description: Thumbnail saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/versions:
 *   get:
 *     summary: List versions
 *     description: Retrieve all version snapshots for a journey map, ordered by version number descending.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     responses:
 *       200:
 *         description: Array of version records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   version_number:
 *                     type: integer
 *                   created_by:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/versions/{vid}:
 *   get:
 *     summary: Get version
 *     description: Retrieve a specific version snapshot including its full data payload.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *       - in: path
 *         name: vid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Version ID
 *     responses:
 *       200:
 *         description: Version object with data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CJMVersion'
 *       404:
 *         description: Version not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/versions/{vid}/restore:
 *   post:
 *     summary: Restore version
 *     description: Restore a journey map to the data from a specific version snapshot.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *       - in: path
 *         name: vid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Version ID to restore
 *     responses:
 *       200:
 *         description: Version restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Version not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/comments:
 *   get:
 *     summary: List comments
 *     description: Retrieve all comments for a journey map, ordered by creation date descending.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     responses:
 *       200:
 *         description: Array of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CJMComment'
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/comments:
 *   post:
 *     summary: Create comment
 *     description: Add a new comment to a journey map, optionally anchored to a specific section and stage.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *               section_id:
 *                 type: string
 *                 description: Section to anchor the comment to
 *               stage_id:
 *                 type: string
 *                 description: Stage to anchor the comment to
 *     responses:
 *       200:
 *         description: Created comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CJMComment'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/:id/comments', authenticate, validate(createCommentSchema), async (req, res) => {
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

/**
 * @swagger
 * /api/cjm/{id}/comments/{cid}:
 *   put:
 *     summary: Update comment
 *     description: Update a comment's content or resolved status.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolved:
 *                 type: boolean
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/comments/{cid}:
 *   delete:
 *     summary: Delete comment
 *     description: Permanently delete a comment from a journey map.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 */
router.delete('/:id/comments/:cid', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM cjm_comments WHERE id = $1 AND map_id = $2", [req.params.cid, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ SHARES ============

/**
 * @swagger
 * /api/cjm/{id}/share:
 *   post:
 *     summary: Share map
 *     description: Create a share link or share a journey map with a specific user. Generates a unique share token.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: User ID to share with
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email of user to share with
 *               permission:
 *                 type: string
 *                 enum: [view, edit]
 *                 default: view
 *             anyOf:
 *               - required: [user_id]
 *               - required: [email]
 *     responses:
 *       200:
 *         description: Share record with token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CJMShare'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/:id/share', authenticate, validate(shareMapSchema), async (req, res) => {
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

/**
 * @swagger
 * /api/cjm/{id}/shares:
 *   get:
 *     summary: List shares
 *     description: Retrieve all share records for a journey map, ordered by creation date descending.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     responses:
 *       200:
 *         description: Array of share records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CJMShare'
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/shares/{sid}:
 *   delete:
 *     summary: Delete share
 *     description: Revoke a share by deleting the share record, invalidating the share token.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *       - in: path
 *         name: sid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Share ID
 *     responses:
 *       200:
 *         description: Share deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 */
router.delete('/:id/shares/:sid', authenticate, async (req, res) => {
    try {
        await query("DELETE FROM cjm_shares WHERE id = $1 AND map_id = $2", [req.params.sid, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * @swagger
 * /api/cjm/shared/{token}:
 *   get:
 *     summary: Access shared map
 *     description: Access a journey map via a public share token. No authentication required.
 *     tags: [CJM]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Share token
 *     responses:
 *       200:
 *         description: Shared map data with permission level
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 data:
 *                   type: object
 *                 status:
 *                   type: string
 *                 permission:
 *                   type: string
 *                   enum: [view, edit]
 *       404:
 *         description: Share or map not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/templates/list:
 *   get:
 *     summary: List templates
 *     description: Retrieve all journey map templates available to the tenant, including system templates.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CJMTemplate'
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/templates:
 *   post:
 *     summary: Create template
 *     description: Save a journey map configuration as a reusable template.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - data
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Created template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CJMTemplate'
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/from-template/{tid}:
 *   post:
 *     summary: Create from template
 *     description: Create a new journey map pre-populated with data from a template.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: tid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Created journey map from template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CJMMap'
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/cjm/{id}/analytics:
 *   get:
 *     summary: Get map analytics
 *     description: Compute and return analytics for a journey map including stage counts, sentiment averages, touchpoint counts, and cell completeness percentage.
 *     tags: [CJM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journey map ID
 *     responses:
 *       200:
 *         description: Computed analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stageCount:
 *                   type: integer
 *                 sectionCount:
 *                   type: integer
 *                 sentimentByStage:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stage:
 *                         type: string
 *                       avgSentiment:
 *                         type: number
 *                 touchpointsByStage:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stage:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 cellCompleteness:
 *                   type: integer
 *                   description: Percentage of cells that have data (0-100)
 *       404:
 *         description: Map not found
 *       500:
 *         description: Internal server error
 */
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
