const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const userRepo = new PostgresRepository('users');

const authenticate = require('../middleware/auth');
const pool = require('../../infrastructure/database/db'); // Direct query for counting

// GET all users (Filtered by Tenant)
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // Join with roles table to get role name
        const result = await pool.query(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.tenant_id = $1
        `, [tenantId]);

        const safeUsers = result.rows.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create user (Check Limits)
router.post('/', authenticate, async (req, res) => {
    try {
        const { username, password, role, role_id, email, phone, name, name_ar } = req.body;
        const tenant = req.tenant;

        if (!tenant) return res.status(403).json({ error: 'No tenant context' });

        // Check Limit
        const countRes = await pool.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenant.id]);
        const currentCount = parseInt(countRes.rows[0].count);

        let limit = 2; // Default Free
        if (tenant.plan === 'pro') limit = 5;
        if (tenant.plan === 'enterprise') limit = 100;

        if (currentCount >= limit) {
            return res.status(403).json({
                error: `Plan limit reached (${currentCount}/${limit}). Upgrade your plan to add more users.`
            });
        }

        if (!username || !password) return res.status(400).json({ error: 'Username/Password required' });

        const existingRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingRes.rows.length > 0) return res.status(409).json({ error: 'Username exists' });

        const newUser = {
            username,
            password,
            role: role || 'user',
            role_id: role_id || null,
            email: email || null,
            phone: phone || null,
            name: name || null,
            name_ar: name_ar || null,
            tenant_id: tenant.id,
            created_at: new Date()
        };
        const saved = await userRepo.create(newUser);
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update user
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { username, password, role, role_id, email, phone, is_2fa_enabled, name, name_ar } = req.body;
        const id = req.params.id;
        const tenantId = req.user.tenant_id;

        // Find existing and check ownership
        const user = await userRepo.findById(id);
        if (!user || user.tenant_id != tenantId) return res.status(404).json({ error: 'User not found' });

        const updates = {};

        if (username) {
            // Trim just in case
            const newName = username.trim();
            if (newName !== user.username) {
                const existing = await pool.query('SELECT id FROM users WHERE username = $1', [newName]);
                if (existing.rows.length > 0) return res.status(409).json({ error: 'Username already taken' });
                updates.username = newName;
            }
        }

        if (password) updates.password = password;
        if (role) updates.role = role;
        if (role_id !== undefined) updates.role_id = role_id;
        if (email !== undefined) updates.email = email;
        if (phone !== undefined) updates.phone = phone;
        if (name !== undefined) updates.name = name;
        if (name_ar !== undefined) updates.name_ar = name_ar;
        if (is_2fa_enabled !== undefined) updates.is_2fa_enabled = is_2fa_enabled;

        if (Object.keys(updates).length === 0) return res.json(user);

        const updated = await userRepo.update(id, updates);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE user
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = req.user.tenant_id;

        const user = await userRepo.findById(id);
        if (!user || user.tenant_id !== tenantId) return res.status(404).json({ error: 'User not found' });

        await userRepo.delete(id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
