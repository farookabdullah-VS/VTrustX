const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');
const validate = require('../middleware/validate');
const { createIntegrationSchema, updateIntegrationSchema } = require('../schemas/integrations.schemas');
const { encrypt, decrypt } = require('../../infrastructure/security/encryption');

// Mask an API key, showing only last 4 characters
const maskKey = (key) => {
    if (!key) return null;
    const decrypted = decrypt(key);
    if (!decrypted || decrypted.length <= 4) return '****';
    return '***' + decrypted.slice(-4);
};

/**
 * @swagger
 * /api/integrations:
 *   get:
 *     tags: [Integrations]
 *     summary: List all integrations
 *     description: Returns all integrations with API keys masked (only last 4 characters shown).
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of integrations
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
 *                   provider:
 *                     type: string
 *                   api_key:
 *                     type: string
 *                     description: Masked API key (e.g. ***ab12)
 *                   webhook_url:
 *                     type: string
 *                   is_active:
 *                     type: boolean
 *                   config:
 *                     type: object
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await query('SELECT * FROM integrations ORDER BY provider ASC');
        const rows = result.rows.map(row => ({
            ...row,
            api_key: maskKey(row.api_key),
        }));
        res.json(rows);
    } catch (error) {
        logger.error('Failed to fetch integrations', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

/**
 * @swagger
 * /api/integrations/{id}:
 *   put:
 *     tags: [Integrations]
 *     summary: Update an integration
 *     description: Updates an existing integration by ID. API keys are encrypted at rest.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Integration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: Plain-text API key (will be encrypted at rest)
 *               webhook_url:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Integration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, validate(updateIntegrationSchema), async (req, res) => {
    try {
        const { api_key, webhook_url, is_active, config } = req.body;

        // Encrypt the API key if provided
        const encryptedKey = api_key ? encrypt(api_key) : undefined;

        await query(
            `UPDATE integrations SET
                api_key = COALESCE($1, api_key),
                webhook_url = COALESCE($2, webhook_url),
                is_active = COALESCE($3, is_active),
                config = COALESCE($4, config),
                updated_at = NOW()
            WHERE id = $5`,
            [encryptedKey !== undefined ? encryptedKey : null, webhook_url, is_active, config, req.params.id]
        );
        res.json({ message: 'Updated successfully' });
    } catch (error) {
        logger.error('Failed to update integration', { error: error.message });
        res.status(500).json({ error: 'Failed to update integration' });
    }
});

/**
 * @swagger
 * /api/integrations:
 *   post:
 *     tags: [Integrations]
 *     summary: Create a new integration
 *     description: Creates a new integration. Returns 409 if the provider already exists. API key is encrypted at rest.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *               api_key:
 *                 type: string
 *                 description: Plain-text API key (will be encrypted at rest)
 *               webhook_url:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *                 default: false
 *               config:
 *                 type: object
 *                 default: {}
 *     responses:
 *       201:
 *         description: Integration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Integration already exists for this provider
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, validate(createIntegrationSchema), async (req, res) => {
    try {
        const { provider, api_key, webhook_url, is_active, config } = req.body;

        // Check availability
        const check = await query('SELECT id FROM integrations WHERE provider = $1', [provider]);
        if (check.rows.length > 0) {
            return res.status(409).json({ error: 'Integration already exists' });
        }

        // Encrypt the API key
        const encryptedKey = api_key ? encrypt(api_key) : null;

        const result = await query(
            `INSERT INTO integrations (provider, api_key, webhook_url, is_active, config, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id`,
            [provider, encryptedKey, webhook_url, is_active || false, config || {}]
        );
        res.status(201).json({ id: result.rows[0].id, message: 'Created successfully' });
    } catch (error) {
        logger.error("Create Integration Error", { error: error.message });
        res.status(500).json({ error: 'Failed to create integration' });
    }
});

module.exports = router;
