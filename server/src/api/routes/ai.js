const express = require('express');
const router = express.Router();
const AiService = require('../../services/AiService');
const { query } = require('../../infrastructure/database/db');

// Helper to get settings from DB
async function getAiSettings() {
    // Assuming settings are stored in a 'settings' table or similar.
    // For MVP, we might pull from ENV or a specific config row.
    // Let's check 'configurations' or 'system_settings'.
    // If not found, use defaults.
    // For now, allow Partial Override from Request or default to Env.

    // TODO: Fetch real settings from DB if implemented.
    return {
        provider: 'vertex', // Default to Vertex if configured
        vertexProject: 'vtrustx',
        vertexLocation: 'us-central1',
        modelName: 'gemini-pro',
        apiKey: process.env.GEMINI_API_KEY
    };
}

router.post('/generate', async (req, res) => {
    try {
        const { prompt, settings } = req.body;

        // Merge request settings with system defaults
        const aiSettings = { ...(await getAiSettings()), ...settings };

        const text = await AiService.generateContent(prompt, aiSettings);
        res.json({ text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
