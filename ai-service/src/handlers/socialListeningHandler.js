const GeminiProvider = require('../providers/GeminiProvider');

/**
 * Social Listening Handler
 * 
 * Handles analysis of social media mentions.
 * Currently defaults to Gemini as it has the specialized method.
 */

async function analyzeSocialMention(text, platform, author, config) {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    const provider = new GeminiProvider(apiKey);

    console.log(`[SocialListeningHandler] Analyzing mention from ${platform} using Gemini...`);

    try {
        const result = await provider.analyzeSocialMention(text, platform, author);
        console.log('[SocialListeningHandler] Analysis complete');
        return result;
    } catch (error) {
        console.error('[SocialListeningHandler] Analysis failed:', error.message);
        // Return fallback structure on error
        return {
            sentiment: "neutral",
            sentiment_score: 0.0,
            intent: "general",
            topics: [],
            entities: { brands: [], products: [], people: [], locations: [] },
            language: "en",
            is_spam: false,
            is_bot: false,
            error: error.message
        };
    }
}

module.exports = {
    analyzeSocialMention
};
