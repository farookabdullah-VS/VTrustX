/**
 * Social Listening Classifier (Fallback)
 * 
 * A lightweight rule-based classifier to use when the AI service is unavailable
 * or for high-throughput initial tagging.
 */

// Simple Sentiment Keywords
const SENTIMENT_KEYWORDS = {
    positive: ['love', 'great', 'awesome', 'amazing', 'good', 'happy', 'thanks', 'cool', 'excellent', 'best', 'perfect'],
    negative: ['hate', 'bad', 'terrible', 'awful', 'slow', 'broken', 'worst', 'fail', 'angry', 'sad', 'ignore', 'stupid', 'sucks', 'disappointing', 'issue', 'problem', 'garbage', 'scam', 'terrible']
};

// Intent Heuristics
const INTENT_PATTERNS = {
    complaint: ['broken', 'fail', 'fix', 'issue', 'problem', 'bug', 'error', 'worst', 'bad service', 'not working', 'unhappy', 'cancel', 'refund', 'scam'],
    inquiry: ['how', 'when', 'where', 'why', 'what', '?', 'help', 'question', 'support', 'anyone knows', 'can i'],
    praise: ['love this', 'great job', 'thank you', 'amazing feature', 'best app', 'congrats'],
    news: ['announced', 'launched', 'new feature', 'update released', 'coming soon', 'release notes']
};

// Topic Dictionary
const TOPIC_KEYWORDS = {
    'Customer Service': ['support', 'service', 'agent', 'help desk', 'call center', 'representative', 'response time', 'waiting'],
    'Product Quality': ['bug', 'crash', 'slow', 'fast', 'ui', 'ux', 'feature', 'app', 'website', 'glitch'],
    'Pricing': ['price', 'cost', 'expensive', 'cheap', 'subscription', 'billing', 'invoice', 'charge', 'renew'],
    'Delivery': ['shipping', 'delivery', 'tracking', 'package', 'courier', 'late', 'arrive'],
    'General': []
};

/**
 * Classify social media text using rule-based heuristics
 * @param {string} text - The post content
 * @returns {object} Analysis result
 */
function classify(text) {
    if (!text) return null;

    const lowerText = text.toLowerCase();

    // 1. Sentiment Scoring
    let score = 0;

    SENTIMENT_KEYWORDS.positive.forEach(word => {
        if (lowerText.includes(word)) score += 0.2;
    });

    SENTIMENT_KEYWORDS.negative.forEach(word => {
        if (lowerText.includes(word)) score -= 0.3; // Negatives weigh more
    });

    // Clamp score
    score = Math.max(-1, Math.min(1, parseFloat(score.toFixed(2))));

    let sentiment = 'neutral';
    if (score > 0.1) sentiment = 'positive';
    else if (score < -0.1) sentiment = 'negative';

    // 2. Intent Classification
    let intent = 'general';
    for (const [type, keywords] of Object.entries(INTENT_PATTERNS)) {
        if (keywords.some(k => lowerText.includes(k))) {
            intent = type;
            // Prioritize Complaint if found, as it's critical
            if (intent === 'complaint') break;
        }
    }

    // 3. Topic Extraction
    const topics = [];
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        if (keywords.some(k => lowerText.includes(k))) {
            topics.push(topic);
        }
    }
    if (topics.length === 0) topics.push('General');

    return {
        sentiment,
        sentiment_score: score,
        intent,
        topics: topics.slice(0, 3), // Top 3
        entities: { brands: [], products: [], people: [], locations: [] }, // Advanced NER requires AI
        language: 'en', // Default assumption for fallback
        is_spam: false,
        is_bot: false,
        provider: 'rule-based-fallback',
        analyzed_at: new Date()
    };
}

module.exports = {
    classify
};
