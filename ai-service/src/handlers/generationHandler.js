const MockProvider = require('../providers/MockAIProvider');
const OpenAIProvider = require('../providers/OpenAIProvider');
const GeminiProvider = require('../providers/GeminiProvider');
const GroqProvider = require('../providers/GroqProvider');
const ConfigService = require('../services/ConfigService');

async function getProvider(config) {
    const providerName = config?.provider || await ConfigService.get('ai_provider') || 'mock';

    console.log(`Selecting AI Provider for Generation: ${providerName}`);

    switch (providerName.toLowerCase()) {
        case 'openai':
            const oaKey = config?.apiKey || await ConfigService.get('openai_api_key');
            return new OpenAIProvider(oaKey);
        case 'gemini':
            const gemKey = config?.apiKey || await ConfigService.get('gemini_api_key');
            return new GeminiProvider(gemKey);
        case 'groq':
            const groqKey = config?.apiKey || await ConfigService.get('groq_api_key');
            return new GroqProvider(groqKey);
        case 'mock':
        default:
            return MockProvider;
    }
}

async function generateSurvey(prompt, aiConfig) {
    const provider = await getProvider(aiConfig);
    console.log(`Generating survey with ${provider.constructor.name || 'MockProvider'}...`);

    try {
        const result = await provider.generate(prompt);
        console.log("Generation complete.");
        return result;
    } catch (err) {
        console.error("Generation logic failed:", err.message);
        throw err;
    }
}

module.exports = generateSurvey;
