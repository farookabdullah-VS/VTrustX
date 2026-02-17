const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createRoleSchema, updateRoleSchema } = require('../schemas/roles.schemas');

// GET all roles for the tenant

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: List roles
 *     description: Returns all roles for the authenticated user's tenant, ordered by creation date.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   tenant_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   permissions:
 *                     type: object
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query('SELECT * FROM roles WHERE tenant_id = $1 ORDER BY created_at', [tenantId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// CREATE a new role

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create role
 *     description: Creates a new role with a name, optional description, and a permissions object for the tenant.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, permissions]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               permissions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Role created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 tenant_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 permissions:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, validate(createRoleSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { name, description, permissions } = req.body;

        const result = await query(
            'INSERT INTO roles (tenant_id, name, description, permissions) VALUES ($1, $2, $3, $4) RETURNING *',
            [tenantId, name, description, permissions || {}]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// UPDATE a role

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     tags: [Roles]
 *     summary: Update role
 *     description: Updates an existing role by ID. At least one field (name, description, or permissions) must be provided.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               permissions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 tenant_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 permissions:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, validate(updateRoleSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { name, description, permissions } = req.body;
        const id = req.params.id;

        const result = await query(
            'UPDATE roles SET name = $1, description = $2, permissions = $3, updated_at = NOW() WHERE id = $4 AND tenant_id = $5 RETURNING *',
            [name, description, permissions, id, tenantId]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: 'Role not found' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE a role

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete role
 *     description: Deletes a role by ID for the authenticated user's tenant.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const id = req.params.id;

        await query('DELETE FROM roles WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Role deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// MENU-ITEM PERMISSIONS ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/roles/menu-items:
 *   get:
 *     tags: [Roles]
 *     summary: Get all menu items
 *     description: Returns all available menu items organized by group
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of menu items
 *       401:
 *         description: Unauthorized
 */
router.get('/menu-items', authenticate, async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM menu_items
            WHERE is_active = TRUE
            ORDER BY sort_order, id
        `);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * @swagger
 * /api/roles/{id}/menu-permissions:
 *   get:
 *     tags: [Roles]
 *     summary: Get role menu permissions
 *     description: Returns menu-item permissions for a specific role
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role menu permissions
 *       404:
 *         description: Role not found
 */
router.get('/:id/menu-permissions', authenticate, async (req, res) => {
    try {
        const roleId = req.params.id;
        const tenantId = req.user.tenant_id;

        // Verify role belongs to tenant
        const roleCheck = await query(
            'SELECT id FROM roles WHERE id = $1 AND tenant_id = $2',
            [roleId, tenantId]
        );
        if (roleCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Get all menu items with permission status for this role
        const result = await query(`
            SELECT
                m.id,
                m.label,
                m.group_id,
                m.group_title,
                m.route,
                m.requires_admin,
                COALESCE(rmp.can_access, FALSE) as can_access
            FROM menu_items m
            LEFT JOIN role_menu_permissions rmp
                ON m.id = rmp.menu_item_id AND rmp.role_id = $1
            WHERE m.is_active = TRUE
            ORDER BY m.sort_order, m.id
        `, [roleId]);

        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * @swagger
 * /api/roles/{id}/menu-permissions:
 *   post:
 *     tags: [Roles]
 *     summary: Update role menu permissions
 *     description: Updates menu-item permissions for a role
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [menuPermissions]
 *             properties:
 *               menuPermissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_item_id:
 *                       type: string
 *                     can_access:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Permissions updated
 *       404:
 *         description: Role not found
 */
router.post('/:id/menu-permissions', authenticate, async (req, res) => {
    try {
        const roleId = req.params.id;
        const tenantId = req.user.tenant_id;
        const { menuPermissions } = req.body;

        // Verify role belongs to tenant
        const roleCheck = await query(
            'SELECT id FROM roles WHERE id = $1 AND tenant_id = $2',
            [roleId, tenantId]
        );
        if (roleCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Delete all existing permissions for this role
        await query('DELETE FROM role_menu_permissions WHERE role_id = $1', [roleId]);

        // Insert new permissions (only for items with can_access = true)
        if (menuPermissions && menuPermissions.length > 0) {
            const valuesToInsert = menuPermissions
                .filter(p => p.can_access)
                .map(p => `(${roleId}, '${p.menu_item_id}', TRUE)`);

            if (valuesToInsert.length > 0) {
                await query(`
                    INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
                    VALUES ${valuesToInsert.join(', ')}
                `);
            }
        }

        res.json({ message: 'Menu permissions updated successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
