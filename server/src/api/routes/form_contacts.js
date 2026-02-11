const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');

// Helper: verify form belongs to tenant
async function verifyFormOwnership(formId, tenantId) {
    const result = await query('SELECT id FROM forms WHERE id = $1 AND tenant_id = $2', [formId, tenantId]);
    return result.rows.length > 0;
}

// Get Audience for a Survey
router.get('/:formId', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const tenantId = req.user.tenant_id;

        if (!await verifyFormOwnership(formId, tenantId)) {
            return res.status(404).json({ error: 'Form not found or access denied' });
        }

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
        logger.error('Form contacts list error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch form contacts' });
    }
});

// Add Contacts to Audience (batch INSERT)
router.post('/:formId/add', authenticate, async (req, res) => {
    try {
        const { formId } = req.params;
        const tenantId = req.user.tenant_id;
        const { contactIds } = req.body;

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({ error: 'contactIds array required' });
        }

        if (!await verifyFormOwnership(formId, tenantId)) {
            return res.status(404).json({ error: 'Form not found or access denied' });
        }

        // Batch insert with a single query using UNNEST
        const result = await query(
            `INSERT INTO form_contacts (form_id, contact_id)
             SELECT $1, unnest($2::int[])
             ON CONFLICT DO NOTHING`,
            [formId, contactIds]
        );

        res.json({ message: `Added ${result.rowCount} contacts` });
    } catch (error) {
        logger.error('Form contacts add error', { error: error.message });
        res.status(500).json({ error: 'Failed to add contacts' });
    }
});

// Remove Contact from Audience
router.delete('/:formId/:contactId', authenticate, async (req, res) => {
    try {
        const { formId, contactId } = req.params;
        const tenantId = req.user.tenant_id;

        if (!await verifyFormOwnership(formId, tenantId)) {
            return res.status(404).json({ error: 'Form not found or access denied' });
        }

        await query('DELETE FROM form_contacts WHERE form_id = $1 AND contact_id = $2', [formId, contactId]);
        res.json({ success: true });
    } catch (error) {
        logger.error('Form contacts delete error', { error: error.message });
        res.status(500).json({ error: 'Failed to remove contact' });
    }
});

module.exports = router;
