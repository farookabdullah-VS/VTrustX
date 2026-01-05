const MockProvider = require('../providers/MockAIProvider');
const OpenAIProvider = require('../providers/OpenAIProvider');
const AzureOpenAIProvider = require('../providers/AzureOpenAIProvider');
const GeminiProvider = require('../providers/GeminiProvider');

// Simple Factory based on Config
function getProvider(config) {
    const providerName = config?.provider || 'mock'; // mock, openai, azure, gemini
    const apiKey = config?.apiKey;

    console.log(`Selecting AI Provider: ${providerName}`);

    switch (providerName.toLowerCase()) {
        case 'openai':
            return new OpenAIProvider(apiKey);
        case 'azure':
            // Azure might need more config fields (endpoint, deployment)
            // For now assuming config might be spread or we stick to env for these if not in UI
            // But user wanted "no code". 
            // We'll assume for now we only support OpenAI/Gemini via key in UI.
            return new OpenAIProvider(apiKey); // Fallback or need specific Azure logic
        case 'gemini':
            return new GeminiProvider(apiKey);
        case 'mock':
        default:
            return MockProvider;
    }
}

async function processSubmission(submission, formDefinition, aiConfig) {
    const provider = getProvider(aiConfig);

    console.log(`Processing submission ${submission.id} with ${provider.constructor.name}...`);

    try {
        const result = await provider.analyze(submission, formDefinition);
        console.log("Analysis complete:", result);
        return result;
    } catch (err) {
        console.error("Provider logic failed:", err.message);
        throw err;
    }
}

module.exports = processSubmission;
