const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../../infrastructure/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3001';

router.all('/*', async (req, res) => {
    try {
        const url = `${AI_SERVICE_URL}${req.originalUrl.replace('/api/ai-service', '')}`;
        logger.info(`[AI Proxy] Forwarding to ${url}`);

        const response = await axios({
            method: req.method,
            url: url,
            data: req.body,
            headers: {
                ...req.headers,
                host: new URL(AI_SERVICE_URL).host
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        logger.error("[AI Proxy] Error", { error: error.message });
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;
