const GeminiProvider = require('../providers/GeminiProvider');
const ConfigService = require('../services/ConfigService');

async function handleAgentInteract(req, res) {
    try {
        const { prompt, systemContext } = req.body;

        console.log(`[AgentInteract] Processing Prompt: ${prompt.substring(0, 50)}...`);

        // Get API Key
        const apiKey = await ConfigService.get('gemini_api_key');
        if (!apiKey) {
            console.warn("Gemini API Key missing for agent interaction");
            return res.json({ error: "API Key Missing", speak: "Service unavailable.", action: "end" });
        }

        const provider = new GeminiProvider(apiKey);
        const result = await provider.generateJson(prompt, systemContext);

        res.json(result);

    } catch (error) {
        console.error("Agent Interaction failed:", error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { handleAgentInteract };
