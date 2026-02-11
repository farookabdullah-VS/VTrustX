const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const userRepo = new PostgresRepository('users');

const authenticate = require('../middleware/auth');
const pool = require('../../infrastructure/database/db');

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

// GET all users (Filtered by Tenant) - with search & pagination
router.get('/', authenticate, authenticate.checkPermission('users', 'view'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { search, status, role, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

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
        params.push(parseInt(limit), offset);
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
        res.json({ users: safeUsers, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create user (Check Limits + Hash Password)
router.post('/', authenticate, authenticate.checkPermission('users', 'create'), async (req, res) => {
    try {
        const { username, password, role, role_id, email, phone, name, name_ar } = req.body;
        const tenant = req.tenant;

        if (!tenant) return res.status(403).json({ error: 'No tenant context' });

        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

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
        res.status(500).json({ error: error.message });
    }
});

// PUT update user
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
        res.status(500).json({ error: error.message });
    }
});

// PATCH toggle user status
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
        res.status(500).json({ error: error.message });
    }
});

// DELETE user
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
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
