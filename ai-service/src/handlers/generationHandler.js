const MockProvider = require('../providers/MockAIProvider');
const OpenAIProvider = require('../providers/OpenAIProvider');
const GeminiProvider = require('../providers/GeminiProvider');

function getProvider(config) {
    const providerName = config?.provider || 'mock';
    const apiKey = config?.apiKey;

    console.log(`Selecting AI Provider for Generation: ${providerName}`);

    switch (providerName.toLowerCase()) {
        case 'openai':
            return new OpenAIProvider(apiKey);
        case 'gemini':
            return new GeminiProvider(apiKey);
        case 'mock':
        default:
            return MockProvider;
    }
}

async function generateSurvey(prompt, aiConfig) {
    const provider = getProvider(aiConfig);
    console.log(`Generating survey with ${provider.constructor.name}...`);

    try {
        // Enforce JSON structure in the prompt if the provider doesn't support JSON mode natively
        // (OpenAI supports json_object, but we'll include it in the system prompt too)

        const result = await provider.generate(prompt);
        console.log("Generation complete.");
        return result;
    } catch (err) {
        console.error("Generation logic failed:", err.message);
        throw err;
    }
}

module.exports = generateSurvey;
