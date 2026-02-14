/**
 * Topic Clustering Service
 *
 * Extracts topics and themes from text using TF-IDF and keyword extraction
 * Returns: { topics: array, keywords: array, themes: array }
 */

const logger = require('../../infrastructure/logger');

class TopicClusterer {
  constructor() {
    // Stopwords to filter out (common words with no semantic value)
    this.stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
      'them', 'my', 'your', 'his', 'its', 'our', 'their', 'am', 'just', 'so',
      'than', 'not', 'very', 'too', 'also', 'if', 'when', 'where', 'how', 'what'
    ]);

    // Common topic categories
    this.topicCategories = {
      product: ['product', 'feature', 'service', 'app', 'software', 'tool', 'platform'],
      support: ['support', 'help', 'customer', 'service', 'team', 'agent', 'representative'],
      pricing: ['price', 'cost', 'expensive', 'cheap', 'free', 'pricing', 'plan', 'subscription'],
      quality: ['quality', 'performance', 'speed', 'fast', 'slow', 'reliable', 'stable'],
      usability: ['easy', 'difficult', 'simple', 'complicated', 'intuitive', 'user', 'interface', 'ux'],
      technical: ['bug', 'error', 'issue', 'problem', 'broken', 'crash', 'fix', 'update']
    };
  }

  /**
   * Extract topics from text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Topic extraction result
   */
  async extractTopics(text) {
    try {
      if (!text || typeof text !== 'string') {
        return { topics: [], keywords: [], themes: [] };
      }

      // Preprocess text
      const normalized = text.toLowerCase();
      const words = this._tokenize(normalized);
      const filteredWords = words.filter(word =>
        word.length > 2 && !this.stopwords.has(word)
      );

      if (filteredWords.length === 0) {
        return { topics: [], keywords: [], themes: [] };
      }

      // Calculate word frequencies
      const wordFreq = {};
      for (const word of filteredWords) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }

      // Extract keywords (top frequent non-stopwords)
      const keywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, freq]) => ({
          word,
          frequency: freq,
          relevance: freq / filteredWords.length
        }));

      // Detect topics from categories
      const detectedTopics = [];
      for (const [category, categoryWords] of Object.entries(this.topicCategories)) {
        let score = 0;
        const matchedWords = [];

        for (const categoryWord of categoryWords) {
          if (wordFreq[categoryWord]) {
            score += wordFreq[categoryWord];
            matchedWords.push(categoryWord);
          }
        }

        if (score > 0) {
          detectedTopics.push({
            category,
            score,
            matchedWords,
            confidence: Math.min(1, score / filteredWords.length * 10)
          });
        }
      }

      // Sort topics by score
      detectedTopics.sort((a, b) => b.score - a.score);

      // Extract bigrams (two-word phrases)
      const bigrams = this._extractBigrams(filteredWords);

      // Combine into themes
      const themes = [
        ...detectedTopics.slice(0, 3).map(t => t.category),
        ...bigrams.slice(0, 2).map(b => b.phrase)
      ];

      return {
        topics: detectedTopics.slice(0, 5).map(t => ({
          name: t.category,
          score: t.score,
          confidence: parseFloat(t.confidence.toFixed(3)),
          keywords: t.matchedWords
        })),
        keywords: keywords.slice(0, 5).map(k => k.word),
        themes: [...new Set(themes)], // Remove duplicates
        details: {
          totalWords: words.length,
          uniqueWords: Object.keys(wordFreq).length,
          bigramsFound: bigrams.length
        }
      };

    } catch (error) {
      logger.error('[TopicClusterer] Extraction failed', { error: error.message });
      return { topics: [], keywords: [], themes: [] };
    }
  }

  /**
   * Extract topics from multiple texts (batch)
   * @param {Array<string>} texts - Array of texts
   * @returns {Promise<Object>} Aggregated topic analysis
   */
  async extractTopicsFromBatch(texts) {
    try {
      const allResults = await Promise.all(
        texts.map(text => this.extractTopics(text))
      );

      // Aggregate keywords across all texts
      const keywordFreq = {};
      const topicScores = {};
      const allThemes = [];

      for (const result of allResults) {
        // Aggregate keywords
        for (const keyword of result.keywords) {
          keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
        }

        // Aggregate topics
        for (const topic of result.topics) {
          if (!topicScores[topic.name]) {
            topicScores[topic.name] = { score: 0, count: 0 };
          }
          topicScores[topic.name].score += topic.score;
          topicScores[topic.name].count += 1;
        }

        // Collect themes
        allThemes.push(...result.themes);
      }

      // Sort aggregated results
      const topKeywords = Object.entries(keywordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, freq]) => ({ word, frequency: freq }));

      const topTopics = Object.entries(topicScores)
        .map(([name, data]) => ({
          name,
          totalScore: data.score,
          averageScore: data.score / data.count,
          mentionCount: data.count
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10);

      // Count theme frequencies
      const themeFreq = {};
      for (const theme of allThemes) {
        themeFreq[theme] = (themeFreq[theme] || 0) + 1;
      }

      const topThemes = Object.entries(themeFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([theme, freq]) => ({ theme, frequency: freq }));

      return {
        keywords: topKeywords,
        topics: topTopics,
        themes: topThemes,
        totalTextsAnalyzed: texts.length
      };

    } catch (error) {
      logger.error('[TopicClusterer] Batch extraction failed', { error: error.message });
      return { keywords: [], topics: [], themes: [], totalTextsAnalyzed: 0 };
    }
  }

  /**
   * Tokenize text into words
   * @param {string} text - Text to tokenize
   * @returns {Array<string>} Array of words
   */
  _tokenize(text) {
    return text.match(/\b\w+\b/g) || [];
  }

  /**
   * Extract bigrams (two-word phrases)
   * @param {Array<string>} words - Array of words
   * @returns {Array<Object>} Array of bigrams with frequencies
   */
  _extractBigrams(words) {
    const bigrams = {};

    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigrams[bigram] = (bigrams[bigram] || 0) + 1;
    }

    return Object.entries(bigrams)
      .filter(([_, freq]) => freq > 1) // Only bigrams that appear more than once
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase, frequency]) => ({ phrase, frequency }));
  }
}

module.exports = new TopicClusterer();
