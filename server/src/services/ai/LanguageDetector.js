/**
 * Language Detector Service
 *
 * Detects the language of text content
 * Returns: { language: string (ISO 639-1), confidence: number, script: string }
 */

const logger = require('../../infrastructure/logger');

class LanguageDetector {
  constructor() {
    // Common word patterns for different languages (simplified)
    this.languagePatterns = {
      en: {
        name: 'English',
        commonWords: ['the', 'is', 'and', 'to', 'a', 'of', 'in', 'that', 'it', 'for', 'you', 'was', 'with', 'on', 'are', 'this', 'have', 'from', 'or', 'be'],
        characterRange: /^[a-zA-Z\s\d\p{P}]+$/u
      },
      es: {
        name: 'Spanish',
        commonWords: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le'],
        characterRange: /^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s\d\p{P}]+$/u
      },
      fr: {
        name: 'French',
        commonWords: ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans', 'en', 'du', 'elle', 'au'],
        characterRange: /^[a-zàâäæçéèêëïîôùûüÿœA-ZÀÂÄÆÇÉÈÊËÏÎÔÙÛÜŸŒ\s\d\p{P}]+$/u
      },
      de: {
        name: 'German',
        commonWords: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als'],
        characterRange: /^[a-zäöüßA-ZÄÖÜ\s\d\p{P}]+$/u
      },
      ar: {
        name: 'Arabic',
        commonWords: ['في', 'من', 'على', 'إلى', 'هذا', 'أن', 'كان', 'قد', 'لا', 'ما', 'هو', 'عن', 'مع', 'أو', 'التي', 'كل', 'لم', 'لن', 'بعد', 'حتى'],
        characterRange: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
      },
      zh: {
        name: 'Chinese',
        commonWords: ['的', '是', '在', '了', '和', '有', '人', '我', '中', '大', '为', '上', '个', '国', '你', '以', '要', '他', '时', '来'],
        characterRange: /[\u4E00-\u9FFF\u3400-\u4DBF]/
      },
      ja: {
        name: 'Japanese',
        commonWords: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として'],
        characterRange: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/
      },
      ko: {
        name: 'Korean',
        commonWords: ['이', '의', '가', '을', '는', '에', '와', '한', '하다', '있다', '되다', '수', '그', '나', '것', '들', '그리고', '또한', '때문', '대하'],
        characterRange: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
      },
      hi: {
        name: 'Hindi',
        commonWords: ['के', 'का', 'की', 'में', 'है', 'और', 'को', 'ने', 'से', 'पर', 'एक', 'यह', 'था', 'हो', 'कि', 'जो', 'कर', 'ही', 'उन', 'दो'],
        characterRange: /[\u0900-\u097F]/
      },
      pt: {
        name: 'Portuguese',
        commonWords: ['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais'],
        characterRange: /^[a-záàâãéêíóôõúüçA-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ\s\d\p{P}]+$/u
      }
    };

    // Script detection patterns
    this.scripts = {
      latin: /[a-zA-Z]/,
      arabic: /[\u0600-\u06FF]/,
      cyrillic: /[\u0400-\u04FF]/,
      greek: /[\u0370-\u03FF]/,
      hebrew: /[\u0590-\u05FF]/,
      cjk: /[\u4E00-\u9FFF]/,
      hangul: /[\uAC00-\uD7AF]/,
      devanagari: /[\u0900-\u097F]/,
      thai: /[\u0E00-\u0E7F]/
    };
  }

  /**
   * Detect language of text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Language detection result
   */
  async detect(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length < 3) {
        return { language: 'unknown', confidence: 0, script: 'unknown', languageName: 'Unknown' };
      }

      const normalized = text.toLowerCase();
      const words = normalized.match(/\b\w+\b/g) || [];

      if (words.length === 0) {
        return { language: 'unknown', confidence: 0, script: 'unknown', languageName: 'Unknown' };
      }

      // Detect script first
      const detectedScript = this._detectScript(text);

      // Calculate scores for each language
      const scores = {};
      for (const [langCode, langData] of Object.entries(this.languagePatterns)) {
        let score = 0;

        // Check for common words
        for (const word of words) {
          if (langData.commonWords.includes(word)) {
            score += 1;
          }
        }

        // Check character range (bonus points if text matches expected characters)
        if (langData.characterRange.test(text)) {
          score += words.length * 0.1; // 10% bonus
        }

        scores[langCode] = score;
      }

      // Find language with highest score
      const sortedLanguages = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, score]) => score > 0);

      if (sortedLanguages.length === 0) {
        return {
          language: 'unknown',
          confidence: 0,
          script: detectedScript,
          languageName: 'Unknown'
        };
      }

      const [detectedLang, topScore] = sortedLanguages[0];

      // Calculate confidence
      const maxPossibleScore = words.length;
      const confidence = Math.min(1, topScore / (maxPossibleScore * 0.3)); // 30% match = 100% confidence

      return {
        language: detectedLang,
        confidence: parseFloat(confidence.toFixed(3)),
        script: detectedScript,
        languageName: this.languagePatterns[detectedLang].name,
        details: {
          scores,
          wordCount: words.length,
          alternativeLanguages: sortedLanguages.slice(1, 3).map(([lang]) => ({
            language: lang,
            name: this.languagePatterns[lang].name
          }))
        }
      };

    } catch (error) {
      logger.error('[LanguageDetector] Detection failed', { error: error.message });
      return { language: 'unknown', confidence: 0, script: 'unknown', languageName: 'Unknown' };
    }
  }

  /**
   * Detect script (writing system)
   * @param {string} text - Text to analyze
   * @returns {string} Detected script
   */
  _detectScript(text) {
    for (const [script, pattern] of Object.entries(this.scripts)) {
      if (pattern.test(text)) {
        return script;
      }
    }
    return 'unknown';
  }

  /**
   * Get language name from code
   * @param {string} langCode - ISO 639-1 language code
   * @returns {string} Language name
   */
  getLanguageName(langCode) {
    return this.languagePatterns[langCode]?.name || langCode;
  }

  /**
   * Batch detect languages
   * @param {Array<string>} texts - Array of texts
   * @returns {Promise<Array<Object>>} Array of detection results
   */
  async detectBatch(texts) {
    return Promise.all(texts.map(text => this.detect(text)));
  }
}

module.exports = new LanguageDetector();
