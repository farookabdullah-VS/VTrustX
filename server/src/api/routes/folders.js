const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createFolderSchema, updateFolderSchema } = require('../schemas/folders.schemas');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../infrastructure/logger');

/**
 * @swagger
 * /api/folders:
 *   get:
 *     summary: List folders
 *     description: Retrieve all folders for the current tenant/user. Optionally filter by type (private or shared).
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [private, shared]
 *         description: Filter by folder type
 *     responses:
 *       200:
 *         description: Array of folders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Folder'
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { type } = req.query; // 'private' or 'shared'
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;

        let sql = `
            SELECT * FROM folders 
            WHERE tenant_id = $1 
        `;
        const params = [tenantId];

        if (type === 'shared') {
            sql += ` AND type = 'shared'`;
        } else {
            // Default to showing user's private folders + shared ones?
            // Usually 'All' shows everything accessible.
            // If requesting 'my', show private.
            // Let's simplified: Show all folders visible to user.
            // Visibility: (tenant_id match AND type='shared') OR (user_id match)
            sql += ` AND (type = 'shared' OR user_id = $2)`;
            params.push(userId);
        }

        sql += ` ORDER BY created_at DESC`;

        const result = await query(sql, params);
        res.json(result.rows);

    } catch (err) {
        logger.error('List folders error', { error: err.message });
        res.status(500).json({ error: 'Failed to retrieve folders' });
    }
});

/**
 * @swagger
 * /api/folders:
 *   post:
 *     summary: Create folder
 *     description: Create a new folder for the authenticated user within their tenant.
 *     tags: [Folders]
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
 *                 description: Folder name
 *               type:
 *                 type: string
 *                 enum: [private, shared]
 *                 default: private
 *                 description: Folder visibility type
 *     responses:
 *       201:
 *         description: Folder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, validate(createFolderSchema), async (req, res) => {
    try {
        const { name, type } = req.body; // type: 'private' | 'shared'
        logger.info(`[Folders] Creating folder '${name}' for user ${req.user?.id}`);

        if (!name) return res.status(400).json({ error: 'Name is required' });

        const id = uuidv4();
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;
        const folderType = type || 'private';

        logger.debug(`[Folders] Generated ID: ${id}, Tenant: ${tenantId}, Type: ${folderType}`);

        await query(`
            INSERT INTO folders (id, name, tenant_id, user_id, type)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, name, tenantId, userId, folderType]);

        logger.debug("[Folders] Insert successful");

        res.status(201).json({ id, name, type: folderType });

    } catch (err) {
        logger.error('Create folder error', { error: err.message });
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

/**
 * @swagger
 * /api/folders/{id}:
 *   put:
 *     summary: Update folder
 *     description: Rename an existing folder. The user must be the folder creator or belong to the same tenant.
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Folder ID
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
 *                 description: New folder name
 *     responses:
 *       200:
 *         description: Folder updated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, validate(updateFolderSchema), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Ensure ownership or permission
        // For shared folders, check permission? For now, allow creator or tenant admin.
        // Simple check: user_id must match OR type is shared (allow for now)

        await query(`
            UPDATE folders 
            SET name = $1, updated_at = NOW()
            WHERE id = $2 AND (user_id = $3 OR tenant_id = $4)
        `, [name, req.params.id, req.user.id, req.user.tenant_id]);

        res.json({ success: true });

    } catch (err) {
        logger.error('Update folder error', { error: err.message });
        res.status(500).json({ error: 'Failed to update folder' });
    }
});

/**
 * @swagger
 * /api/folders/{id}:
 *   delete:
 *     summary: Delete folder
 *     description: Delete a folder. The user must be the folder creator or belong to the same tenant.
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Folder ID
 *     responses:
 *       200:
 *         description: Folder deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await query(`
            DELETE FROM folders 
            WHERE id = $1 AND (user_id = $2 OR tenant_id = $3)
        `, [req.params.id, req.user.id, req.user.tenant_id]);

        res.json({ success: true });

    } catch (err) {
        logger.error('Delete folder error', { error: err.message });
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

module.exports = router;
