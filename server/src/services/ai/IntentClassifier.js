/**
 * Intent Classifier Service
 *
 * Classifies text into intent categories: inquiry, complaint, praise, feature_request, general
 * Returns: { intent: string, confidence: number, subIntents: array }
 */

const logger = require('../../infrastructure/logger');

class IntentClassifier {
  constructor() {
    // Intent patterns (keywords and phrases)
    this.intentPatterns = {
      inquiry: {
        keywords: [
          'how', 'what', 'when', 'where', 'why', 'which', 'who', 'can', 'could', 'would',
          'is', 'are', 'does', 'do', 'help', 'question', 'wondering', 'curious', 'know',
          'explain', 'clarify', 'information', 'details', 'about', '?'
        ],
        phrases: [
          'how do i', 'how can i', 'what is', 'where is', 'can you', 'could you',
          'i need help', 'need help with', 'i want to know', 'tell me'
        ]
      },
      complaint: {
        keywords: [
          'issue', 'problem', 'bug', 'error', 'broken', 'not working', 'doesnt work',
          "doesn't work", 'failed', 'failure', 'wrong', 'incorrect', 'missing',
          'disappointed', 'frustrating', 'frustrated', 'annoying', 'annoyed',
          'complaint', 'complain', 'unhappy', 'dissatisfied', 'terrible', 'awful',
          'worst', 'bad', 'poor', 'horrible', 'unacceptable', 'ridiculous'
        ],
        phrases: [
          'not working', 'doesnt work', "doesn't work", 'not able to', 'unable to',
          'this is broken', 'having issues', 'having problems', 'not happy',
          'very disappointed', 'very frustrated'
        ]
      },
      praise: {
        keywords: [
          'love', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
          'good', 'best', 'perfect', 'brilliant', 'outstanding', 'impressive',
          'thank', 'thanks', 'appreciate', 'grateful', 'pleased', 'satisfied',
          'delighted', 'happy', 'enjoy', 'recommend', 'highly'
        ],
        phrases: [
          'thank you', 'thanks for', 'love this', 'love it', 'this is great',
          'highly recommend', 'really happy', 'so happy', 'absolutely love',
          'best ever', 'best service', 'great job', 'well done'
        ]
      },
      feature_request: {
        keywords: [
          'feature', 'add', 'need', 'want', 'wish', 'should', 'could', 'would',
          'suggest', 'suggestion', 'idea', 'request', 'requesting', 'enhance',
          'improvement', 'improve', 'better', 'option', 'ability', 'support'
        ],
        phrases: [
          'would be great', 'would be nice', 'it would be', 'i wish', 'i need',
          'please add', 'can you add', 'could you add', 'feature request',
          'i suggest', 'my suggestion', 'why dont you', "why don't you",
          'you should', 'would love to see'
        ]
      },
      general: {
        keywords: [], // Catch-all category
        phrases: []
      }
    };
  }

  /**
   * Classify intent of text
   * @param {string} text - Text to classify
   * @returns {Promise<Object>} Intent classification result
   */
  async classify(text) {
    try {
      if (!text || typeof text !== 'string') {
        return { intent: 'general', confidence: 0, subIntents: [] };
      }

      const normalized = text.toLowerCase();

      // Calculate scores for each intent
      const scores = {};
      for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
        if (intent === 'general') continue; // Skip general for now

        let score = 0;

        // Check phrases (higher weight)
        for (const phrase of patterns.phrases) {
          if (normalized.includes(phrase)) {
            score += 3;
          }
        }

        // Check keywords
        for (const keyword of patterns.keywords) {
          const regex = new RegExp(`\\b${keyword}\\b`, 'g');
          const matches = normalized.match(regex);
          if (matches) {
            score += matches.length;
          }
        }

        scores[intent] = score;
      }

      // Find top intents
      const sortedIntents = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, score]) => score > 0);

      if (sortedIntents.length === 0) {
        return { intent: 'general', confidence: 0.5, subIntents: [] };
      }

      const [primaryIntent, primaryScore] = sortedIntents[0];

      // Calculate confidence (normalize score)
      const maxPossibleScore = 10; // Rough estimate
      const confidence = Math.min(1, primaryScore / maxPossibleScore);

      // Extract sub-intents (secondary classifications with score > 30% of primary)
      const subIntents = sortedIntents
        .slice(1)
        .filter(([_, score]) => score >= primaryScore * 0.3)
        .map(([intent, score]) => ({
          intent,
          score,
          confidence: Math.min(1, score / maxPossibleScore)
        }));

      // Special case: Check for mixed intent (e.g., complaint + feature request)
      const isMixedIntent = subIntents.length > 0 && subIntents[0].confidence > 0.5;

      return {
        intent: primaryIntent,
        confidence: parseFloat(confidence.toFixed(3)),
        subIntents: subIntents.map(si => si.intent),
        details: {
          scores,
          isMixedIntent,
          allIntentsDetected: sortedIntents.map(([intent]) => intent)
        }
      };

    } catch (error) {
      logger.error('[IntentClassifier] Classification failed', { error: error.message });
      return { intent: 'general', confidence: 0, subIntents: [] };
    }
  }

  /**
   * Get intent human-readable label
   * @param {string} intent - Intent code
   * @returns {string} Human-readable label
   */
  getIntentLabel(intent) {
    const labels = {
      inquiry: 'Question / Inquiry',
      complaint: 'Complaint / Issue',
      praise: 'Praise / Positive Feedback',
      feature_request: 'Feature Request / Suggestion',
      general: 'General Mention'
    };
    return labels[intent] || intent;
  }

  /**
   * Batch classify multiple texts
   * @param {Array<string>} texts - Array of texts to classify
   * @returns {Promise<Array<Object>>} Array of intent results
   */
  async classifyBatch(texts) {
    return Promise.all(texts.map(text => this.classify(text)));
  }
}

module.exports = new IntentClassifier();
