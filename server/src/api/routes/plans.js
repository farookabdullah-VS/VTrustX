const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');

// GET /api/plans - Public
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM pricing_plans WHERE is_active = TRUE ORDER BY price_monthly ASC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
