const GeminiProvider = require('../providers/GeminiProvider');
const ConfigService = require('../services/ConfigService');

async function handleBatchAnalysis(req, res) {
    try {
        const { texts } = req.body;

        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({ error: "No texts provided for analysis" });
        }

        console.log(`Received batch analysis request for ${texts.length} texts`);

        // Get API Key
        const apiKey = await ConfigService.get('gemini_api_key');
        if (!apiKey) {
            console.warn("Gemini API Key missing for batch analysis");
            return res.status(500).json({ error: "AI Service Configuration Error: API Key missing" });
        }

        const provider = new GeminiProvider(apiKey);
        const result = await provider.batchAnalyze(texts);

        res.json(result);

    } catch (error) {
        console.error("Batch analysis failed:", error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { handleBatchAnalysis };
