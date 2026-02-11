const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

router.get('/debug-db', async (req, res) => {
    try {
        const result = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'cx_personas'");
        const dbName = await query("SELECT current_database()");
        res.json({
            db: dbName.rows[0].current_database,
            columns: result.rows.map(r => r.column_name)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/run-sql', async (req, res) => {
    try {
        const { sql, params } = req.body;
        logger.debug('Executing SQL', { sql });
        const result = await query(sql, params);
        res.json(result.rows || { success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
