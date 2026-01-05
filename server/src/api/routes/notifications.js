const express = require('express');
const router = express.Router();
const pool = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET Notifications (Unread first, then recent)
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;

        const query = `
            SELECT * FROM notifications 
            WHERE user_id = $1 AND tenant_id = $2
            ORDER BY is_read ASC, created_at DESC
            LIMIT 20
        `;
        const result = await pool.query(query, [userId, tenantId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark Single as Read
router.put('/:id/read', async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.user.id;
        await pool.query(
            "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
            [id, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark All as Read
router.put('/read-all', async (req, res) => {
    try {
        await pool.query(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND tenant_id = $2",
            [req.user.id, req.user.tenant_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
