const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// GET /api/master/countries (includes nationality)
router.get('/countries', authenticate, async (req, res) => {
    try {
        const result = await query('SELECT * FROM lov_countries WHERE is_active = TRUE ORDER BY name ASC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/master/cities
router.get('/cities', authenticate, async (req, res) => {
    try {
        const { country_id } = req.query;
        let sql = 'SELECT * FROM lov_cities WHERE is_active = TRUE';
        let params = [];

        if (country_id) {
            sql += ' AND country_id = $1';
            params.push(country_id);
        }

        sql += ' ORDER BY name ASC';

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
