/**
 * Entity Extractor Service
 *
 * Extracts named entities from text: people, organizations, locations, products
 * Returns: { people: array, organizations: array, locations: array, products: array }
 */

const logger = require('../../infrastructure/logger');

class EntityExtractor {
  constructor() {
    // Common entity patterns (simplified - in production, use NLP libraries)
    this.patterns = {
      // Email pattern
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

      // URL pattern
      url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,

      // Hashtag pattern
      hashtag: /#\w+/g,

      // Mention pattern (@username)
      mention: /@\w+/g,

      // Phone pattern (simplified)
      phone: /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

      // Money pattern
      money: /[$€£¥]\s?\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:dollars?|euros?|pounds?|yen)/gi
    };

    // Common organization keywords
    this.orgKeywords = [
      'inc', 'corp', 'corporation', 'company', 'llc', 'ltd', 'limited',
      'co', 'group', 'associates', 'partners', 'ventures', 'holdings'
    ];

    // Common location keywords
    this.locationKeywords = [
      'city', 'state', 'country', 'street', 'avenue', 'road', 'boulevard',
      'building', 'airport', 'station', 'center', 'mall', 'park'
    ];

    // Common title prefixes (for person detection)
    this.titlePrefixes = [
      'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'professor',
      'ceo', 'cto', 'cfo', 'president', 'director', 'manager'
    ];
  }

  /**
   * Extract entities from text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Entity extraction result
   */
  async extract(text) {
    try {
      if (!text || typeof text !== 'string') {
        return this._emptyResult();
      }

      const entities = {
        people: [],
        organizations: [],
        locations: [],
        products: [],
        hashtags: [],
        mentions: [],
        emails: [],
        urls: [],
        phones: [],
        monetary: []
      };

      // Extract pattern-based entities
      entities.hashtags = this._extractMatches(text, this.patterns.hashtag);
      entities.mentions = this._extractMatches(text, this.patterns.mention);
      entities.emails = this._extractMatches(text, this.patterns.email);
      entities.urls = this._extractMatches(text, this.patterns.url);
      entities.phones = this._extractMatches(text, this.patterns.phone);
      entities.monetary = this._extractMatches(text, this.patterns.money);

      // Extract capitalized words (potential proper nouns)
      const properNouns = this._extractProperNouns(text);

      // Classify proper nouns into categories
      for (const noun of properNouns) {
        const classification = this._classifyProperNoun(noun, text);

        switch (classification) {
          case 'person':
            entities.people.push(noun);
            break;
          case 'organization':
            entities.organizations.push(noun);
            break;
          case 'location':
            entities.locations.push(noun);
            break;
          case 'product':
            entities.products.push(noun);
            break;
        }
      }

      // Remove duplicates
      for (const key of Object.keys(entities)) {
        entities[key] = [...new Set(entities[key])];
      }

      return {
        ...entities,
        summary: {
          totalEntities: Object.values(entities).flat().length,
          peopleCount: entities.people.length,
          organizationsCount: entities.organizations.length,
          locationsCount: entities.locations.length,
          productsCount: entities.products.length
        }
      };

    } catch (error) {
      logger.error('[EntityExtractor] Extraction failed', { error: error.message });
      return this._emptyResult();
    }
  }

  /**
   * Extract pattern matches
   * @param {string} text - Text to search
   * @param {RegExp} pattern - Regex pattern
   * @returns {Array<string>} Matched entities
   */
  _extractMatches(text, pattern) {
    const matches = text.match(pattern);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Extract proper nouns (capitalized words)
   * @param {string} text - Text to analyze
   * @returns {Array<string>} Proper nouns
   */
  _extractProperNouns(text) {
    // Match words that start with capital letter (excluding sentence starts)
    const sentences = text.split(/[.!?]+/);
    const properNouns = [];

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);

      // Skip first word of each sentence (it's capitalized anyway)
      for (let i = 1; i < words.length; i++) {
        const word = words[i];

        // Check if word starts with capital and has more than 2 letters
        if (/^[A-Z][a-z]{2,}/.test(word)) {
          // Remove punctuation
          const cleaned = word.replace(/[^\w]/g, '');
          if (cleaned.length > 2) {
            properNouns.push(cleaned);
          }
        }

        // Check for multi-word proper nouns (e.g., "New York")
        if (i < words.length - 1 && /^[A-Z][a-z]+/.test(word) && /^[A-Z][a-z]+/.test(words[i + 1])) {
          const multiWord = `${word} ${words[i + 1]}`.replace(/[^\w\s]/g, '');
          properNouns.push(multiWord);
        }
      }
    }

    return [...new Set(properNouns)];
  }

  /**
   * Classify a proper noun into entity type
   * @param {string} noun - Proper noun to classify
   * @param {string} context - Full text for context
   * @returns {string} Entity type
   */
  _classifyProperNoun(noun, context) {
    const lowerNoun = noun.toLowerCase();
    const lowerContext = context.toLowerCase();

    // Check for organization keywords
    for (const keyword of this.orgKeywords) {
      if (lowerNoun.includes(keyword) || lowerContext.includes(`${lowerNoun} ${keyword}`)) {
        return 'organization';
      }
    }

    // Check for location keywords
    for (const keyword of this.locationKeywords) {
      if (lowerContext.includes(`${lowerNoun} ${keyword}`) || lowerContext.includes(`${keyword} ${lowerNoun}`)) {
        return 'location';
      }
    }

    // Check for person indicators (titles)
    for (const title of this.titlePrefixes) {
      if (lowerContext.includes(`${title} ${lowerNoun}`) || lowerContext.includes(`${title}. ${lowerNoun}`)) {
        return 'person';
      }
    }

    // Heuristics: Short proper nouns are likely products or brands
    if (noun.length <= 10 && !noun.includes(' ')) {
      return 'product';
    }

    // Default: organization (safest assumption for unknown proper nouns)
    return 'organization';
  }

  /**
   * Empty result template
   * @returns {Object} Empty entities object
   */
  _emptyResult() {
    return {
      people: [],
      organizations: [],
      locations: [],
      products: [],
      hashtags: [],
      mentions: [],
      emails: [],
      urls: [],
      phones: [],
      monetary: [],
      summary: {
        totalEntities: 0,
        peopleCount: 0,
        organizationsCount: 0,
        locationsCount: 0,
        productsCount: 0
      }
    };
  }

  /**
   * Batch extract entities from multiple texts
   * @param {Array<string>} texts - Array of texts
   * @returns {Promise<Array<Object>>} Array of entity results
   */
  async extractBatch(texts) {
    return Promise.all(texts.map(text => this.extract(text)));
  }
}

module.exports = new EntityExtractor();
