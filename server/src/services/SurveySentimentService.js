const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const SentimentAnalyzer = require('./ai/SentimentAnalyzer');
const LanguageDetector = require('./ai/LanguageDetector');

/**
 * Survey Response Sentiment Analysis Service
 *
 * Analyzes sentiment of open-ended survey responses using AI.
 * Features:
 * - Sentiment scoring (positive, negative, neutral)
 * - Emotion detection (happy, frustrated, angry, satisfied)
 * - Keyword extraction
 * - Theme identification
 * - Language detection
 * - Automatic CTL alert creation for negative sentiment
 */
class SurveySentimentService {
    /**
     * Analyze sentiment for a single response
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} submissionId - Submission ID
     * @param {number} questionId - Question ID
     * @param {string} responseText - Response text to analyze
     * @param {object} options - Additional options
     * @returns {Promise<object>} Sentiment analysis result
     */
    static async analyzeResponse(tenantId, submissionId, questionId, responseText, options = {}) {
        try {
            // Skip if response is too short (less than 10 characters)
            if (!responseText || responseText.trim().length < 10) {
                logger.debug('[SurveySentimentService] Skipping short response', {
                    submissionId,
                    questionId,
                    length: responseText?.length || 0
                });
                return null;
            }

            logger.info('[SurveySentimentService] Analyzing response', {
                tenantId,
                submissionId,
                questionId,
                textLength: responseText.length
            });

            // Check if already analyzed
            const existing = await query(
                'SELECT id FROM response_sentiment WHERE submission_id = $1 AND question_id = $2',
                [submissionId, questionId]
            );

            if (existing.rows.length > 0) {
                logger.debug('[SurveySentimentService] Response already analyzed', {
                    submissionId,
                    questionId
                });
                return existing.rows[0];
            }

            // 1. Detect language
            let language = 'en';
            try {
                const languageResult = await LanguageDetector.detect(responseText);
                language = languageResult.language;
            } catch (err) {
                logger.warn('[SurveySentimentService] Language detection failed, defaulting to English', {
                    error: err.message
                });
            }

            // 2. Analyze sentiment
            const sentimentResult = await SentimentAnalyzer.analyze(responseText);

            // 3. Extract keywords (simple extraction)
            const keywords = this.extractKeywords(responseText);

            // 4. Identify themes (basic categorization)
            const themes = this.identifyThemes(responseText, keywords);

            // 5. Map sentiment to label
            const sentimentLabel = this.getSentimentLabel(sentimentResult.score);

            // 6. Store sentiment analysis
            const result = await query(
                `INSERT INTO response_sentiment
                (tenant_id, submission_id, question_id, response_text, sentiment,
                 sentiment_score, confidence, emotions, keywords, themes, language, analyzed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                RETURNING *`,
                [
                    tenantId,
                    submissionId,
                    questionId,
                    responseText,
                    sentimentLabel,
                    sentimentResult.score,
                    sentimentResult.confidence,
                    JSON.stringify(sentimentResult.emotions || {}),
                    keywords,
                    themes,
                    language
                ]
            );

            const savedSentiment = result.rows[0];

            logger.info('[SurveySentimentService] Sentiment analysis complete', {
                submissionId,
                questionId,
                sentiment: sentimentLabel,
                score: sentimentResult.score,
                confidence: sentimentResult.confidence
            });

            // 7. Auto-create CTL alert for negative sentiment
            if (options.autoCreateCTL !== false && sentimentLabel === 'negative') {
                await this.createCTLAlertForNegativeSentiment(
                    tenantId,
                    submissionId,
                    questionId,
                    responseText,
                    sentimentResult,
                    savedSentiment.id
                );
            }

            return savedSentiment;
        } catch (error) {
            logger.error('[SurveySentimentService] Failed to analyze response', {
                error: error.message,
                submissionId,
                questionId
            });
            throw error;
        }
    }

    /**
     * Analyze sentiment for all text responses in a submission
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} submissionId - Submission ID
     * @param {array} responses - Array of response objects
     * @returns {Promise<array>} Array of sentiment results
     */
    static async analyzeSubmission(tenantId, submissionId, responses) {
        try {
            const results = [];

            // Filter for text responses only
            const textResponses = responses.filter(r =>
                r.answer && typeof r.answer === 'string' && r.answer.trim().length >= 10
            );

            logger.info('[SurveySentimentService] Analyzing submission', {
                tenantId,
                submissionId,
                totalResponses: responses.length,
                textResponses: textResponses.length
            });

            // Analyze each text response
            for (const response of textResponses) {
                try {
                    const sentimentResult = await this.analyzeResponse(
                        tenantId,
                        submissionId,
                        response.question_id,
                        response.answer
                    );

                    if (sentimentResult) {
                        results.push(sentimentResult);
                    }
                } catch (err) {
                    logger.error('[SurveySentimentService] Failed to analyze individual response', {
                        submissionId,
                        questionId: response.question_id,
                        error: err.message
                    });
                    // Continue with other responses
                }
            }

            logger.info('[SurveySentimentService] Submission analysis complete', {
                submissionId,
                analyzedCount: results.length
            });

            return results;
        } catch (error) {
            logger.error('[SurveySentimentService] Failed to analyze submission', {
                error: error.message,
                submissionId
            });
            throw error;
        }
    }

    /**
     * Get sentiment statistics for a form
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} formId - Form ID
     * @returns {Promise<object>} Sentiment statistics
     */
    static async getFormSentimentStats(tenantId, formId) {
        try {
            const result = await query(
                `SELECT
                    COUNT(*) as total_analyzed,
                    COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_count,
                    COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
                    COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral_count,
                    AVG(sentiment_score) as avg_sentiment_score,
                    AVG(confidence) as avg_confidence
                FROM response_sentiment rs
                JOIN submissions s ON s.id = rs.submission_id
                WHERE s.form_id = $1 AND rs.tenant_id = $2`,
                [formId, tenantId]
            );

            const stats = result.rows[0];

            // Calculate percentages
            const total = parseInt(stats.total_analyzed) || 0;
            if (total === 0) {
                return {
                    totalAnalyzed: 0,
                    positive: { count: 0, percentage: 0 },
                    negative: { count: 0, percentage: 0 },
                    neutral: { count: 0, percentage: 0 },
                    avgSentimentScore: 0,
                    avgConfidence: 0
                };
            }

            return {
                totalAnalyzed: total,
                positive: {
                    count: parseInt(stats.positive_count),
                    percentage: (parseInt(stats.positive_count) / total) * 100
                },
                negative: {
                    count: parseInt(stats.negative_count),
                    percentage: (parseInt(stats.negative_count) / total) * 100
                },
                neutral: {
                    count: parseInt(stats.neutral_count),
                    percentage: (parseInt(stats.neutral_count) / total) * 100
                },
                avgSentimentScore: parseFloat(stats.avg_sentiment_score) || 0,
                avgConfidence: parseFloat(stats.avg_confidence) || 0
            };
        } catch (error) {
            logger.error('[SurveySentimentService] Failed to get form sentiment stats', {
                error: error.message,
                formId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get sentiment trend over time for a form
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} formId - Form ID
     * @param {number} days - Number of days to analyze (default: 30)
     * @returns {Promise<array>} Daily sentiment counts
     */
    static async getSentimentTrend(tenantId, formId, days = 30) {
        try {
            const result = await query(
                `SELECT
                    DATE(rs.created_at) as date,
                    COUNT(*) FILTER (WHERE sentiment = 'positive') as positive,
                    COUNT(*) FILTER (WHERE sentiment = 'negative') as negative,
                    COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral,
                    AVG(sentiment_score) as avg_score
                FROM response_sentiment rs
                JOIN submissions s ON s.id = rs.submission_id
                WHERE s.form_id = $1
                    AND rs.tenant_id = $2
                    AND rs.created_at >= NOW() - INTERVAL '${days} days'
                GROUP BY DATE(rs.created_at)
                ORDER BY date ASC`,
                [formId, tenantId]
            );

            return result.rows.map(row => ({
                date: row.date,
                positive: parseInt(row.positive),
                negative: parseInt(row.negative),
                neutral: parseInt(row.neutral),
                avgScore: parseFloat(row.avg_score) || 0
            }));
        } catch (error) {
            logger.error('[SurveySentimentService] Failed to get sentiment trend', {
                error: error.message,
                formId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get top keywords from responses
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} formId - Form ID
     * @param {number} limit - Number of keywords to return
     * @returns {Promise<array>} Top keywords with counts
     */
    static async getTopKeywords(tenantId, formId, limit = 20) {
        try {
            const result = await query(
                `SELECT
                    UNNEST(keywords) as keyword,
                    COUNT(*) as frequency
                FROM response_sentiment rs
                JOIN submissions s ON s.id = rs.submission_id
                WHERE s.form_id = $1 AND rs.tenant_id = $2
                GROUP BY keyword
                ORDER BY frequency DESC
                LIMIT $3`,
                [formId, tenantId, limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('[SurveySentimentService] Failed to get top keywords', {
                error: error.message,
                formId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Create CTL alert for negative sentiment
     *
     * @param {number} tenantId - Tenant ID
     * @param {number} submissionId - Submission ID
     * @param {number} questionId - Question ID
     * @param {string} responseText - Response text
     * @param {object} sentimentResult - Sentiment analysis result
     * @param {number} sentimentId - Sentiment record ID
     * @returns {Promise<object>} Created CTL alert
     */
    static async createCTLAlertForNegativeSentiment(
        tenantId,
        submissionId,
        questionId,
        responseText,
        sentimentResult,
        sentimentId
    ) {
        try {
            // Get submission and form details
            const submissionResult = await query(
                `SELECT s.id, s.form_id, f.title as form_title
                FROM submissions s
                JOIN forms f ON f.id = s.form_id
                WHERE s.id = $1`,
                [submissionId]
            );

            if (submissionResult.rows.length === 0) {
                throw new Error(`Submission ${submissionId} not found`);
            }

            const submission = submissionResult.rows[0];

            // Get question text
            const questionResult = await query(
                'SELECT text FROM questions WHERE id = $1',
                [questionId]
            );

            const questionText = questionResult.rows[0]?.text || 'Unknown Question';

            // Create CTL alert
            const alertResult = await query(
                `INSERT INTO ctl_alerts
                (tenant_id, submission_id, source_channel, severity, status, title, description, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING *`,
                [
                    tenantId,
                    submissionId,
                    'survey',
                    'medium', // Default severity
                    'new',
                    `Negative Feedback: ${submission.form_title}`,
                    `Negative sentiment detected in survey response.\n\nQuestion: ${questionText}\n\nResponse: ${responseText.substring(0, 500)}`,
                    JSON.stringify({
                        questionId,
                        sentiment: sentimentResult.label || 'negative',
                        sentimentScore: sentimentResult.score,
                        confidence: sentimentResult.confidence,
                        emotions: sentimentResult.emotions,
                        sentimentId,
                        formId: submission.form_id
                    })
                ]
            );

            // Update sentiment record to mark CTL alert created
            await query(
                'UPDATE response_sentiment SET ctl_alert_created = TRUE WHERE id = $1',
                [sentimentId]
            );

            logger.info('[SurveySentimentService] CTL alert created for negative sentiment', {
                alertId: alertResult.rows[0].id,
                submissionId,
                questionId,
                sentimentScore: sentimentResult.score
            });

            return alertResult.rows[0];
        } catch (error) {
            logger.error('[SurveySentimentService] Failed to create CTL alert', {
                error: error.message,
                submissionId,
                questionId
            });
            // Don't throw - CTL alert creation shouldn't block sentiment analysis
            return null;
        }
    }

    /**
     * Extract keywords from text (simple implementation)
     *
     * @param {string} text - Text to extract keywords from
     * @returns {array} Array of keywords
     */
    static extractKeywords(text) {
        // Remove common stop words
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'should', 'could', 'may', 'might', 'must', 'can', 'it', 'this', 'that',
            'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what',
            'which', 'who', 'when', 'where', 'why', 'how', 'very', 'too', 'so'
        ]);

        // Extract words, filter stop words, and get unique keywords
        const words = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));

        // Get unique keywords
        const uniqueKeywords = [...new Set(words)];

        // Return top 10 keywords
        return uniqueKeywords.slice(0, 10);
    }

    /**
     * Identify themes from text and keywords
     *
     * @param {string} text - Text to analyze
     * @param {array} keywords - Extracted keywords
     * @returns {array} Array of identified themes
     */
    static identifyThemes(text, keywords) {
        const themes = [];
        const lowerText = text.toLowerCase();

        // Define theme patterns
        const themePatterns = {
            'pricing': ['price', 'cost', 'expensive', 'cheap', 'affordable', 'payment', 'billing'],
            'customer_service': ['service', 'support', 'help', 'staff', 'representative', 'agent'],
            'product_quality': ['quality', 'product', 'broken', 'defect', 'works', 'functioning'],
            'delivery': ['delivery', 'shipping', 'arrived', 'late', 'fast', 'slow'],
            'usability': ['easy', 'difficult', 'user', 'interface', 'navigate', 'confusing'],
            'performance': ['performance', 'speed', 'fast', 'slow', 'responsive', 'lag']
        };

        // Check for theme matches
        for (const [theme, patterns] of Object.entries(themePatterns)) {
            for (const pattern of patterns) {
                if (lowerText.includes(pattern) || keywords.includes(pattern)) {
                    if (!themes.includes(theme)) {
                        themes.push(theme);
                    }
                    break;
                }
            }
        }

        return themes;
    }

    /**
     * Map sentiment score to label
     *
     * @param {number} score - Sentiment score (-1.00 to 1.00)
     * @returns {string} Sentiment label (positive, negative, neutral)
     */
    static getSentimentLabel(score) {
        if (score >= 0.3) return 'positive';
        if (score <= -0.3) return 'negative';
        return 'neutral';
    }
}

module.exports = SurveySentimentService;
