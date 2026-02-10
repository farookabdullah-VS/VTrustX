const MockProvider = require('../providers/MockAIProvider');
const OpenAIProvider = require('../providers/OpenAIProvider');
const GeminiProvider = require('../providers/GeminiProvider');
const GroqProvider = require('../providers/GroqProvider');

function getProvider(config) {
    const providerName = config?.provider || process.env.AI_PROVIDER || 'mock';
    const apiKey = config?.apiKey || (providerName === 'groq' ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY);

    console.log(`Selecting AI Provider for Completion: ${providerName}`);

    switch (providerName.toLowerCase()) {
        case 'openai':
            return new OpenAIProvider(apiKey);
        case 'gemini':
            return new GeminiProvider(apiKey);
        case 'groq':
            return new GroqProvider(apiKey);
        case 'mock':
        default:
            return MockProvider;
    }
}

async function handleCompletion(prompt, aiConfig) {
    const provider = getProvider(aiConfig);
    console.log(`Getting completion with ${provider.constructor.name}...`);

    try {
        if (typeof provider.complete === 'function') {
            return await provider.complete(prompt);
        } else if (typeof provider.chat === 'function') {
            // Fallback to chat if complete not defined
            return await provider.chat([{ role: 'user', content: prompt }]);
        }
        return "AI Provider does not support completions.";
    } catch (err) {
        console.error("Completion logic failed:", err.message);
        throw err;
    }
}

module.exports = handleCompletion;
