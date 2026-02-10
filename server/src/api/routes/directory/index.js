const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');

// 1. List Contacts (Directory)
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let sql = `
            SELECT c.*, 
            (SELECT COUNT(*) FROM tickets t WHERE t.contact_id = c.id) as ticket_count
            FROM crm_contacts c
        `;
        const params = [];
        if (search) {
            sql += ` WHERE c.name ILIKE $1 OR c.email ILIKE $1`;
            params.push(`%${search}%`);
        }
        sql += ` ORDER BY c.name ASC LIMIT 50`;

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get 360 Timeline
router.get('/:id/timeline', async (req, res) => {
    try {
        const contactId = req.params.id;

        // 1. Fetch Contact
        const cRes = await query("SELECT * FROM crm_contacts WHERE id = $1", [contactId]);
        if (cRes.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
        const contact = cRes.rows[0];

        const timeline = [];

        // 2. Events: Tickets
        const tRes = await query("SELECT * FROM tickets WHERE contact_id = $1 ORDER BY created_at DESC", [contactId]);
        tRes.rows.forEach(t => {
            timeline.push({
                type: 'ticket',
                date: t.created_at,
                title: `Ticket ${t.ticket_code}: ${t.status}`,
                description: t.subject,
                icon: 'ticket',
                metadata: { id: t.id, status: t.status }
            });
        });

        // 3. Events: Survey Submissions
        // Matching by email loosely in submissions data JSON
        // Note: This is a heavy query for production, but okay for MVP demo
        const sRes = await query(`
            SELECT s.*, f.title as form_title 
            FROM submissions s
            JOIN forms f ON s.form_id = f.id
            WHERE s.data->>'email' = $1 OR s.data->>'Email' = $1
            ORDER BY s.created_at DESC
        `, [contact.email]);

        sRes.rows.forEach(s => {
            // Try to find an NPS score
            const nps = s.data.nps || s.data.NPS || s.data.rating;
            timeline.push({
                type: 'survey',
                date: s.created_at,
                title: `Survey Response: ${s.form_title}`,
                description: nps ? `Score: ${nps}` : 'Response submitted',
                icon: 'clipboard',
                metadata: { id: s.id, score: nps }
            });
        });

        // 4. Sort Combined
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            contact,
            timeline
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
