const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');

// GET all integrations
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM integrations ORDER BY provider ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE specific integration
router.put('/:id', async (req, res) => {
    try {
        const { api_key, webhook_url, is_active, config } = req.body;
        await query(
            `UPDATE integrations SET 
                api_key = COALESCE($1, api_key), 
                webhook_url = COALESCE($2, webhook_url), 
                is_active = COALESCE($3, is_active), 
                config = COALESCE($4, config),
                updated_at = NOW() 
            WHERE id = $5`,
            [api_key, webhook_url, is_active, config, req.params.id]
        );
        res.json({ message: 'Updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE new integration
router.post('/', async (req, res) => {
    try {
        const { provider, api_key, webhook_url, is_active, config } = req.body;

        // Check availability
        const check = await query('SELECT id FROM integrations WHERE provider = $1', [provider]);
        if (check.rows.length > 0) {
            return res.status(409).json({ error: 'Integration already exists' });
        }

        const result = await query(
            `INSERT INTO integrations (provider, api_key, webhook_url, is_active, config, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id`,
            [provider, api_key, webhook_url, is_active || false, config || {}]
        );
        res.status(201).json({ id: result.rows[0].id, message: 'Created successfully' });
    } catch (error) {
        console.error("Create Integration Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
