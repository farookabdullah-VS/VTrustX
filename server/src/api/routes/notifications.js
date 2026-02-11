const express = require('express');
const router = express.Router();
const pool = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

router.use(authenticate);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications
 *     description: Returns up to 20 notifications for the authenticated user, ordered with unread first then by most recent.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   user_id:
 *                     type: string
 *                     format: uuid
 *                   tenant_id:
 *                     type: string
 *                     format: uuid
 *                   is_read:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     description: Marks a single notification as read for the authenticated user.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Marks all notifications as read for the authenticated user within their tenant.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
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
