const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');

// Get Audience for a Survey
router.get('/:formId', async (req, res) => {
    try {
        const { formId } = req.params;
        // Join with contacts table
        const sql = `
            SELECT fc.*, c.name, c.email, c.mobile, c.designation 
            FROM form_contacts fc
            JOIN contacts c ON fc.contact_id = c.id
            WHERE fc.form_id = $1
            ORDER BY fc.created_at DESC
        `;
        const result = await query(sql, [formId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Contacts to Audience
router.post('/:formId/add', async (req, res) => {
    try {
        const { formId } = req.params;
        const { contactIds } = req.body; // Array of IDs

        if (!contactIds || !Array.isArray(contactIds)) {
            return res.status(400).json({ error: "contactIds array required" });
        }

        let added = 0;
        for (const cid of contactIds) {
            try {
                await query(
                    `INSERT INTO form_contacts (form_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [formId, cid]
                );
                added++;
            } catch (ignore) { }
        }

        res.json({ message: `Added ${added} contacts` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove Contact from Audience
router.delete('/:formId/:contactId', async (req, res) => {
    try {
        const { formId, contactId } = req.params;
        await query('DELETE FROM form_contacts WHERE form_id = $1 AND contact_id = $2', [formId, contactId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
