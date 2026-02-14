/**
 * Tests for Sentiment Analyzer
 */

const SentimentAnalyzer = require('../SentimentAnalyzer');

describe('SentimentAnalyzer', () => {
  describe('analyze()', () => {
    test('should detect positive sentiment', async () => {
      const text = 'I love this product! It is amazing and wonderful.';
      const result = await SentimentAnalyzer.analyze(text);

      expect(result.sentiment).toBe('positive');
      expect(result.score).toBeGreaterThan(0.3);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect negative sentiment', async () => {
      const text = 'This is terrible! I hate it. Very disappointed and frustrated.';
      const result = await SentimentAnalyzer.analyze(text);

      expect(result.sentiment).toBe('negative');
      expect(result.score).toBeLessThan(-0.3);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect neutral sentiment', async () => {
      const text = 'The product arrived today. It is blue.';
      const result = await SentimentAnalyzer.analyze(text);

      expect(result.sentiment).toBe('neutral');
      expect(result.score).toBeGreaterThanOrEqual(-0.3);
      expect(result.score).toBeLessThanOrEqual(0.3);
    });

    test('should handle negation correctly', async () => {
      const text = 'This is not good at all.';
      const result = await SentimentAnalyzer.analyze(text);

      expect(result.sentiment).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    test('should handle intensifiers', async () => {
      const text1 = 'This is good.';
      const text2 = 'This is very good.';

      const result1 = await SentimentAnalyzer.analyze(text1);
      const result2 = await SentimentAnalyzer.analyze(text2);

      expect(result2.score).toBeGreaterThan(result1.score);
    });

    test('should handle emojis', async () => {
      const text = 'Great product! 😊👍🎉';
      const result = await SentimentAnalyzer.analyze(text);

      expect(result.sentiment).toBe('positive');
      expect(result.details.emojisDetected).toBe(true);
    });

    test('should return neutral for empty text', async () => {
      const result = await SentimentAnalyzer.analyze('');

      expect(result.sentiment).toBe('neutral');
      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0);
    });

    test('should handle mixed sentiment', async () => {
      const text = 'The product is good but the service is terrible.';
      const result = await SentimentAnalyzer.analyze(text);

      // Should be closer to neutral due to mixed signals
      expect(result.score).toBeGreaterThan(-0.5);
      expect(result.score).toBeLessThan(0.5);
    });
  });

  describe('analyzeBatch()', () => {
    test('should analyze multiple texts', async () => {
      const texts = [
        'I love this!',
        'This is terrible.',
        'The product is okay.'
      ];

      const results = await SentimentAnalyzer.analyzeBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].sentiment).toBe('positive');
      expect(results[1].sentiment).toBe('negative');
      expect(results[2].sentiment).toBe('neutral');
    });
  });
});
