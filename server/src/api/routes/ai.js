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
        provider: 'gemini', // Default to Gemini
        vertexProject: 'vtrustx',
        vertexLocation: 'us-central1',
        modelName: 'gemini-pro',
        apiKey: process.env.GEMINI_API_KEY
    };
}

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate', async (req, res) => {
    try {
        const { prompt, settings } = req.body;
        const aiSettings = { ...(await getAiSettings()), ...settings };
        const text = await AiService.generateContent(prompt, aiSettings);
        res.json({ text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/generate-multimodal', upload.single('file'), async (req, res) => {
    try {
        const prompt = req.body.prompt;
        const settings = req.body.settings ? JSON.parse(req.body.settings) : {}; // Settings might be generic JSON string if formdata
        const aiSettings = { ...(await getAiSettings()), ...settings };

        const fileData = req.file; // Buffer available due to memoryStorage

        if (!fileData) return res.status(400).json({ error: 'No file uploaded' });

        const text = await AiService.generateContent(prompt, aiSettings, fileData);
        res.json({ text });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
