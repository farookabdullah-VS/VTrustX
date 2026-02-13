const MockProvider = require('../providers/MockAIProvider');
const OpenAIProvider = require('../providers/OpenAIProvider');
const AzureOpenAIProvider = require('../providers/AzureOpenAIProvider');
const GeminiProvider = require('../providers/GeminiProvider');
const GroqProvider = require('../providers/GroqProvider');

/**
 * Sentiment Analysis Handler
 *
 * Handles sentiment analysis requests using configured AI providers.
 * Supports Gemini, OpenAI, Groq, and mock providers.
 */

/**
 * Get AI provider instance based on configuration
 * @param {object} config - AI provider configuration
 * @returns {object} Provider instance
 */
function getProvider(config) {
    const providerName = config?.provider || 'mock';
    const apiKey = config?.apiKey;

    console.log(`[SentimentHandler] Selecting AI Provider: ${providerName}`);

    switch (providerName.toLowerCase()) {
        case 'openai':
            return new OpenAIProvider(apiKey);
        case 'azure':
            return new AzureOpenAIProvider(apiKey);
        case 'gemini':
            return new GeminiProvider(apiKey);
        case 'groq':
            return new GroqProvider(apiKey);
        case 'mock':
        default:
            return MockProvider;
    }
}

/**
 * Analyze sentiment using AI provider
 * @param {string} prompt - Sentiment analysis prompt
 * @param {object} aiConfig - AI provider configuration
 * @returns {Promise<string>} Sentiment analysis result as JSON string
 */
async function analyzeSentiment(prompt, aiConfig) {
    const provider = getProvider(aiConfig);

    console.log(`[SentimentHandler] Analyzing sentiment with ${provider.constructor.name}...`);

    try {
        // Use provider's completion method for sentiment analysis
        let result;

        if (provider === MockProvider) {
            // Mock provider returns static sentiment data for testing
            result = getMockSentiment();
        } else if (provider.complete) {
            // Use completion method if available (more suitable for structured outputs)
            result = await provider.complete(prompt, aiConfig);
        } else {
            // Fallback to analyze method
            const analysis = await provider.analyze({ data: { feedback: prompt } }, {});
            result = analysis.insights || analysis.summary || '';
        }

        console.log('[SentimentHandler] Sentiment analysis complete');
        return result;

    } catch (error) {
        console.error('[SentimentHandler] Analysis failed:', error.message);
        throw error;
    }
}

/**
 * Generate mock sentiment data for testing
 * @returns {string} JSON string with mock sentiment data
 */
function getMockSentiment() {
    return JSON.stringify({
        aggregate: {
            score: 0.7,
            emotion: 'satisfied',
            confidence: 0.85
        },
        fields: {
            feedback: {
                score: 0.7,
                emotion: 'satisfied',
                keywords: ['good', 'helpful', 'efficient'],
                confidence: 0.85
            }
        },
        themes: ['customer service', 'product quality', 'user experience'],
        summary: 'Overall positive sentiment with satisfaction expressed about the service and product quality.'
    });
}

module.exports = {
    analyzeSentiment,
    getProvider
};
