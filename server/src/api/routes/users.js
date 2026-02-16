const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const userRepo = new PostgresRepository('users');

const authenticate = require('../middleware/auth');
const pool = require('../../infrastructure/database/db');
const validate = require('../middleware/validate');
const { createUserSchema } = require('../schemas/users.schemas');
const logger = require('../../infrastructure/logger');

// Helper: resolve plan user limit dynamically
async function getPlanUserLimit(tenant) {
    // Try features from plans table first
    if (tenant.plan_id) {
        const planRes = await pool.query('SELECT features FROM plans WHERE id = $1', [tenant.plan_id]);
        if (planRes.rows.length > 0 && planRes.rows[0].features) {
            return planRes.rows[0].features.max_users || 2;
        }
    }
    // Fallback to legacy plan name
    const limits = { free: 2, starter: 3, pro: 10, business: 25, enterprise: 100 };
    return limits[tenant.plan] || 2;
}

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users with search and pagination
 *     description: Returns a paginated list of users for the authenticated tenant. Supports filtering by search term, status, and role.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username, name, or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by user status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, viewer, editor]
 *         description: Filter by user role
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, authenticate.checkPermission('users', 'view'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        logger.info(`Fetching users for tenant ${tenantId}`, { query: req.query });

        if (!tenantId) {
            logger.warn('Tenant ID missing in request user context');
            return res.json({ users: [], total: 0, page: 1, limit: 50 });
        }

        const { search, status, role, page = 1, limit = 50 } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;

        let whereClause = 'WHERE u.tenant_id = $1';
        const params = [tenantId];
        let paramIdx = 2;

        if (search) {
            whereClause += ` AND (u.username ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }
        if (status) {
            whereClause += ` AND u.status = $${paramIdx}`;
            params.push(status);
            paramIdx++;
        }
        if (role) {
            whereClause += ` AND u.role = $${paramIdx}`;
            params.push(role);
            paramIdx++;
        }

        // Count total
        const countRes = await pool.query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
        const total = parseInt(countRes.rows[0].count);

        // Fetch page
        params.push(limitNum, offset);
        const result = await pool.query(`
            SELECT u.*, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
        `, params);

        const safeUsers = result.rows.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json({ users: safeUsers, total, page: pageNum, limit: limitNum });
    } catch (error) {
        logger.error('Failed to fetch users', { error: error.message, stack: error.stack, tenantId: req.user?.tenant_id });
        res.status(500).json({ error: 'Failed to fetch users. Check server logs.' });
    }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Creates a new user under the authenticated tenant. Enforces plan-based user limits and hashes the password.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [user, admin, viewer, editor]
 *               role_id:
 *                 type: string
 *                 format: uuid
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               name:
 *                 type: string
 *               name_ar:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 username:
 *                   type: string
 *                 role:
 *                   type: string
 *                 email:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions or plan limit reached
 *       409:
 *         description: Username already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, authenticate.checkPermission('users', 'create'), validate(createUserSchema), async (req, res) => {
    try {
        const { username, password, role, role_id, email, phone, name, name_ar } = req.body;
        const tenant = req.tenant;

        if (!tenant) return res.status(403).json({ error: 'No tenant context' });

        // Check Limit dynamically
        const countRes = await pool.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenant.id]);
        const currentCount = parseInt(countRes.rows[0].count);
        const limit = await getPlanUserLimit(tenant);

        if (currentCount >= limit) {
            return res.status(403).json({
                error: `Plan limit reached (${currentCount}/${limit}). Upgrade your plan to add more users.`
            });
        }

        const existingRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingRes.rows.length > 0) return res.status(409).json({ error: 'Username already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            username,
            password: hashedPassword,
            role: (['user', 'admin', 'viewer', 'editor'].includes(role) ? role : 'user'),
            role_id: role_id || null,
            email: email || null,
            phone: phone || null,
            name: name || null,
            name_ar: name_ar || null,
            tenant_id: tenant.id,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
        };
        const saved = await userRepo.create(newUser);
        const { password: _, ...safeUser } = saved;
        res.status(201).json(safeUser);
    } catch (error) {
        logger.error('Failed to create user', { error: error.message });
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update an existing user
 *     description: Updates user fields by ID. Validates email format, enforces unique username, and hashes new password if provided.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [user, admin, viewer, editor]
 *               role_id:
 *                 type: string
 *                 format: uuid
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               name:
 *                 type: string
 *               name_ar:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error (invalid email, short password, invalid role)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: Username already taken
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, authenticate.checkPermission('users', 'update'), async (req, res) => {
    try {
        const { username, password, role, role_id, email, phone, name, name_ar, status } = req.body;
        const id = req.params.id;
        const tenantId = req.user.tenant_id;

        const user = await userRepo.findById(id);
        if (!user || user.tenant_id != tenantId) return res.status(404).json({ error: 'User not found' });

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

        const updates = { updated_at: new Date() };

        if (username) {
            const newName = username.trim();
            if (newName !== user.username) {
                const existing = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [newName, id]);
                if (existing.rows.length > 0) return res.status(409).json({ error: 'Username already taken' });
                updates.username = newName;
            }
        }

        if (password) {
            if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(password, salt);
        }
        if (role) {
            const ALLOWED_ROLES = ['user', 'admin', 'viewer', 'editor'];
            if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
            updates.role = role;
        }
        if (role_id !== undefined) updates.role_id = role_id;
        if (email !== undefined) updates.email = email;
        if (phone !== undefined) updates.phone = phone;
        if (name !== undefined) updates.name = name;
        if (name_ar !== undefined) updates.name_ar = name_ar;
        if (status !== undefined) updates.status = status;

        const updated = await userRepo.update(id, updates);
        const { password: _, ...safeUser } = updated;
        res.json(safeUser);
    } catch (error) {
        logger.error('Failed to update user', { error: error.message });
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Update user status
 *     description: Sets the status of a user to active, inactive, or suspended.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', authenticate, authenticate.checkPermission('users', 'update'), async (req, res) => {
    try {
        const { status } = req.body;
        const id = req.params.id;
        const tenantId = req.user.tenant_id;

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be: active, inactive, or suspended' });
        }

        const user = await userRepo.findById(id);
        if (!user || user.tenant_id != tenantId) return res.status(404).json({ error: 'User not found' });

        const updated = await userRepo.update(id, { status, updated_at: new Date() });
        const { password: _, ...safeUser } = updated;
        res.json(safeUser);
    } catch (error) {
        logger.error('Failed to update user status', { error: error.message });
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user
 *     description: Permanently deletes a user by ID. Users cannot delete their own account.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete your own account
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, authenticate.checkPermission('users', 'delete'), async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = req.user.tenant_id;

        const user = await userRepo.findById(id);
        if (!user || user.tenant_id != tenantId) return res.status(404).json({ error: 'User not found' });

        // Prevent self-deletion
        if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

        await userRepo.delete(id);
        res.status(204).send();
    } catch (error) {
        logger.error('Failed to delete user', { error: error.message });
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
