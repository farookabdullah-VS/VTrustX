const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const contactRepo = new PostgresRepository('contacts');
const authenticate = require('../middleware/auth');

// List Contacts
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // In a real generic repo, we'd pass filters. For now, manual query or filter after fetch (inefficient but works for small scale)
        // Or better: extends PostgresRepository to support 'findAll({ where: { tenant_id } })'
        // Assuming findAll returns all rows for now, we filter manually or add method.
        // Let's use direct pool for filtering to be safe as per user example
        const pool = require('../../infrastructure/database/db');
        const result = await pool.query('SELECT * FROM contacts WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Contact
// Create Contact (with De-duplication)
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, email, mobile, address, designation, department } = req.body;
        const tenantId = req.user.tenant_id;
        if (!name) return res.status(400).json({ error: "Name is required" });

        // Check for existing
        const pool = require('../../infrastructure/database/db');
        let queryStr = "SELECT * FROM contacts WHERE tenant_id = $1 AND (email = $2";
        const params = [tenantId, email];

        if (mobile) {
            queryStr += " OR mobile = $3";
            params.push(mobile);
        }
        queryStr += ")";

        // Only check if email or mobile provided
        if (email || mobile) {
            const existing = await pool.query(queryStr, params);
            if (existing.rows.length > 0) {
                // If it exists, we return the existing one (Idempotent) or Error?
                // User said "check the contact is there... if not create... and map".
                // This implies getting the ID back.
                // We'll return the existing contact to be helpful.
                return res.status(200).json(existing.rows[0]);
            }
        }

        const newContact = {
            tenant_id: tenantId,
            name,
            email: email || null,
            mobile: mobile || null,
            address,
            designation,
            department,
            created_at: new Date(),
            updated_at: new Date()
        };
        const saved = await contactRepo.create(newContact);
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Contact
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const pool = require('../../infrastructure/database/db');
        const existing = await pool.query('SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
        await contactRepo.delete(req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Contact
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { name, email, mobile, address, designation, department } = req.body;
        const updates = { name, email, mobile, address, designation, department, updated_at: new Date() };
        // Remove undefined keys
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

        const updated = await contactRepo.update(req.params.id, updates);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
