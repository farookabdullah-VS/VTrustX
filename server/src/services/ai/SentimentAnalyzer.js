/**
 * Sentiment Analyzer Service
 *
 * Analyzes text content to determine sentiment polarity and intensity
 * Returns: { sentiment: 'positive'|'neutral'|'negative', score: -1 to +1, confidence: 0 to 1 }
 */

const logger = require('../../infrastructure/logger');

class SentimentAnalyzer {
  constructor() {
    // Sentiment lexicon (simplified - in production, use comprehensive lexicon)
    this.positiveWords = new Set([
      'love', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
      'good', 'best', 'happy', 'perfect', 'beautiful', 'brilliant', 'outstanding',
      'delighted', 'pleased', 'satisfied', 'enjoy', 'impressed', 'recommend',
      'thanks', 'thank', 'appreciate', 'helpful', 'reliable', 'quality', 'fast'
    ]);

    this.negativeWords = new Set([
      'hate', 'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor', 'disappointing',
      'disappointed', 'angry', 'frustrated', 'useless', 'broken', 'failed', 'problem',
      'issue', 'complaint', 'unhappy', 'annoyed', 'slow', 'expensive', 'waste',
      'never', 'nothing', 'nobody', 'worse', 'regret', 'upset'
    ]);

    this.intensifiers = new Set([
      'very', 'extremely', 'absolutely', 'really', 'totally', 'completely',
      'utterly', 'highly', 'so', 'too', 'incredibly', 'amazingly'
    ]);

    this.negators = new Set([
      'not', 'no', 'never', 'neither', 'nobody', 'nothing', "n't", 'hardly', 'barely'
    ]);
  }

  /**
   * Analyze sentiment of text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyze(text) {
    try {
      if (!text || typeof text !== 'string') {
        return { sentiment: 'neutral', score: 0, confidence: 0 };
      }

      // Preprocess text
      const normalized = text.toLowerCase();
      const words = normalized.match(/\b\w+\b/g) || [];

      if (words.length === 0) {
        return { sentiment: 'neutral', score: 0, confidence: 0 };
      }

      // Calculate sentiment score
      let score = 0;
      let sentimentWordsCount = 0;
      let intensifierMultiplier = 1.0;
      let negated = false;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const prevWord = i > 0 ? words[i - 1] : null;

        // Check for negation
        if (this.negators.has(word)) {
          negated = true;
          continue;
        }

        // Check for intensifiers
        if (this.intensifiers.has(word)) {
          intensifierMultiplier = 1.5;
          continue;
        }

        // Calculate word sentiment
        let wordScore = 0;
        if (this.positiveWords.has(word)) {
          wordScore = 1.0;
          sentimentWordsCount++;
        } else if (this.negativeWords.has(word)) {
          wordScore = -1.0;
          sentimentWordsCount++;
        }

        // Apply modifiers
        if (wordScore !== 0) {
          wordScore *= intensifierMultiplier;

          // Apply negation (flips polarity)
          if (negated) {
            wordScore *= -1;
          }

          score += wordScore;

          // Reset modifiers
          intensifierMultiplier = 1.0;
          negated = false;
        }
      }

      // Normalize score to -1 to +1 range
      const normalizedScore = sentimentWordsCount > 0
        ? Math.max(-1, Math.min(1, score / Math.sqrt(sentimentWordsCount)))
        : 0;

      // Determine sentiment category
      let sentiment = 'neutral';
      if (normalizedScore > 0.3) {
        sentiment = 'positive';
      } else if (normalizedScore < -0.3) {
        sentiment = 'negative';
      }

      // Calculate confidence based on number of sentiment words found
      const confidence = Math.min(1, sentimentWordsCount / (words.length * 0.1));

      // Check for emojis (bonus sentiment indicators)
      const emojiSentiment = this._analyzeEmojis(text);
      if (emojiSentiment !== 0) {
        score += emojiSentiment * 0.2; // Emojis contribute 20% to final score
      }

      return {
        sentiment,
        score: parseFloat(normalizedScore.toFixed(3)),
        confidence: parseFloat(confidence.toFixed(3)),
        details: {
          sentimentWordsCount,
          totalWords: words.length,
          emojisDetected: emojiSentiment !== 0
        }
      };

    } catch (error) {
      logger.error('[SentimentAnalyzer] Analysis failed', { error: error.message });
      return { sentiment: 'neutral', score: 0, confidence: 0 };
    }
  }

  /**
   * Analyze emoji sentiment
   * @param {string} text - Text containing emojis
   * @returns {number} Emoji sentiment contribution (-1 to +1)
   */
  _analyzeEmojis(text) {
    const positiveEmojis = ['😀', '😃', '😄', '😁', '😊', '🙂', '😍', '🥰', '😘', '🤗', '🤩', '😎', '👍', '👏', '🎉', '❤️', '💖', '✨', '🌟', '⭐'];
    const negativeEmojis = ['😠', '😡', '🤬', '😤', '😒', '🙄', '😔', '😞', '😢', '😭', '😖', '😣', '😩', '👎', '💔', '😰', '😱'];

    let emojiScore = 0;
    for (const emoji of positiveEmojis) {
      if (text.includes(emoji)) emojiScore += 0.5;
    }
    for (const emoji of negativeEmojis) {
      if (text.includes(emoji)) emojiScore -= 0.5;
    }

    return Math.max(-1, Math.min(1, emojiScore));
  }

  /**
   * Batch analyze multiple texts
   * @param {Array<string>} texts - Array of texts to analyze
   * @returns {Promise<Array<Object>>} Array of sentiment results
   */
  async analyzeBatch(texts) {
    return Promise.all(texts.map(text => this.analyze(text)));
  }
}

module.exports = new SentimentAnalyzer();
