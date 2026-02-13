const logger = require('../infrastructure/logger');

/**
 * Sentiment Analysis Service
 *
 * Provides AI-powered sentiment analysis for open-ended text responses.
 * Analyzes emotions, scores sentiment, and flags negative responses for CTL follow-up.
 */

/**
 * Extract text fields from submission data for sentiment analysis
 * @param {object} data - Submission data (key-value pairs)
 * @param {object} formDefinition - Form definition with field metadata
 * @returns {Array<{fieldName: string, label: string, text: string}>}
 */
function extractTextFields(data, formDefinition = {}) {
    if (!data || typeof data !== 'object') {
        return [];
    }

    const textFields = [];

    for (const [fieldName, rawValue] of Object.entries(data)) {
        // Unwrap SurveyJS object wrappers like { value: "text", text: "text" }
        let value = rawValue;
        if (value && typeof value === 'object' && value.hasOwnProperty('value')) {
            value = value.value;
        }

        // Only include string values longer than 10 characters
        if (typeof value === 'string' && value.trim().length > 10) {
            textFields.push({
                fieldName,
                label: getFieldLabel(fieldName, formDefinition),
                text: value.trim()
            });
        }

        // Handle nested objects (e.g., multi-part questions)
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                if (typeof nestedValue === 'string' && nestedValue.trim().length > 10) {
                    textFields.push({
                        fieldName: `${fieldName}.${nestedKey}`,
                        label: getFieldLabel(`${fieldName}.${nestedKey}`, formDefinition),
                        text: nestedValue.trim()
                    });
                }
            }
        }
    }

    return textFields;
}

/**
 * Build a sentiment analysis prompt for the AI provider
 * @param {Array<{fieldName: string, label: string, text: string}>} textFields
 * @returns {string}
 */
function buildSentimentPrompt(textFields) {
    if (!textFields || textFields.length === 0) {
        return '';
    }

    const fieldsText = textFields.map((field, index) => {
        return `${index + 1}. ${field.label} (${field.fieldName}):\n"${redactPII(field.text)}"`;
    }).join('\n\n');

    return `Analyze the sentiment of the following survey responses. Return a JSON object with this exact structure:

{
  "aggregate": {
    "score": <number between -1.0 and 1.0>,
    "emotion": "<one of: happy, satisfied, frustrated, angry, disappointed, confused, neutral>",
    "confidence": <number between 0.0 and 1.0>
  },
  "fields": {
    "<fieldName>": {
      "score": <number between -1.0 and 1.0>,
      "emotion": "<emotion>",
      "keywords": ["<keyword1>", "<keyword2>"],
      "confidence": <number between 0.0 and 1.0>
    }
  },
  "themes": ["<theme1>", "<theme2>", "<theme3>"],
  "summary": "<brief 1-2 sentence summary of overall sentiment>"
}

Scoring guidelines:
- -1.0 to -0.5: Very negative (angry, furious, terrible experience)
- -0.5 to -0.3: Negative (disappointed, frustrated, dissatisfied)
- -0.3 to 0.3: Neutral (mixed feelings, factual responses)
- 0.3 to 0.5: Positive (satisfied, pleased)
- 0.5 to 1.0: Very positive (delighted, extremely happy)

Survey Responses:
${fieldsText}

Return ONLY the JSON object, no additional text.`;
}

/**
 * Parse and validate sentiment response from AI
 * @param {string} aiResponse - Raw AI response text
 * @returns {object|null} Parsed sentiment object or null if invalid
 */
function parseSentimentResponse(aiResponse) {
    if (!aiResponse || typeof aiResponse !== 'string') {
        logger.error('Invalid AI response for sentiment analysis', { aiResponse });
        return null;
    }

    try {
        // Extract JSON from response (handles cases where AI adds extra text)
        let jsonText = aiResponse.trim();

        // Find JSON object boundaries
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        }

        const parsed = JSON.parse(jsonText);

        // Validate structure
        if (!parsed.aggregate || typeof parsed.aggregate.score !== 'number') {
            logger.error('Invalid sentiment structure: missing aggregate.score', { parsed });
            return null;
        }

        // Clamp scores to [-1, 1] range
        if (parsed.aggregate) {
            parsed.aggregate.score = clampScore(parsed.aggregate.score);
            parsed.aggregate.confidence = clampConfidence(parsed.aggregate.confidence);
        }

        if (parsed.fields) {
            for (const fieldName in parsed.fields) {
                const field = parsed.fields[fieldName];
                if (field.score !== undefined) {
                    field.score = clampScore(field.score);
                }
                if (field.confidence !== undefined) {
                    field.confidence = clampConfidence(field.confidence);
                }
            }
        }

        // Validate emotion values
        const validEmotions = ['happy', 'satisfied', 'frustrated', 'angry', 'disappointed', 'confused', 'neutral'];
        if (parsed.aggregate.emotion && !validEmotions.includes(parsed.aggregate.emotion)) {
            parsed.aggregate.emotion = 'neutral';
        }

        return parsed;

    } catch (error) {
        logger.error('Failed to parse sentiment response', { error: error.message, aiResponse });
        return null;
    }
}

/**
 * Determine CTL alert level based on sentiment score
 * @param {number} sentimentScore - Score from -1.0 to 1.0
 * @returns {string|null} Alert level (critical, high, medium) or null
 */
function getCTLAlertLevel(sentimentScore) {
    if (typeof sentimentScore !== 'number' || isNaN(sentimentScore)) {
        return null;
    }

    // Threshold mapping matches existing CTL classifier severity
    if (sentimentScore <= -0.7) {
        return 'critical'; // Very negative sentiment
    }
    if (sentimentScore <= -0.5) {
        return 'high'; // Significantly negative
    }
    if (sentimentScore <= -0.3) {
        return 'medium'; // Moderately negative
    }

    return null; // Neutral or positive - no alert needed
}

/**
 * Get human-readable label for a field
 * @param {string} fieldName - Field name from form data
 * @param {object} formDefinition - Form definition with field metadata
 * @returns {string}
 */
function getFieldLabel(fieldName, formDefinition = {}) {
    // Try to get label from form definition
    if (formDefinition.elements) {
        const element = formDefinition.elements.find(el => el.name === fieldName);
        if (element && element.title) {
            return element.title;
        }
    }

    // Fallback: convert field name to readable format
    return fieldName
        .replace(/[_-]/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Redact personally identifiable information from text
 * @param {string} text - Text to redact
 * @returns {string}
 */
function redactPII(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let redacted = text;

    // Redact email addresses
    redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

    // Redact phone numbers (various formats)
    redacted = redacted.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]');
    redacted = redacted.replace(/\b\d{10,}\b/g, '[PHONE]');

    return redacted;
}

/**
 * Clamp score to valid range [-1, 1]
 * @param {number} score
 * @returns {number}
 */
function clampScore(score) {
    if (typeof score !== 'number' || isNaN(score)) {
        return 0;
    }
    return Math.max(-1, Math.min(1, score));
}

/**
 * Clamp confidence to valid range [0, 1]
 * @param {number} confidence
 * @returns {number}
 */
function clampConfidence(confidence) {
    if (typeof confidence !== 'number' || isNaN(confidence)) {
        return 0.5; // Default medium confidence
    }
    return Math.max(0, Math.min(1, confidence));
}

/**
 * Check if sentiment should trigger a CTL alert
 * @param {object} sentimentData - Parsed sentiment data
 * @returns {boolean}
 */
function shouldTriggerAlert(sentimentData) {
    if (!sentimentData || !sentimentData.aggregate) {
        return false;
    }

    const score = sentimentData.aggregate.score;
    return getCTLAlertLevel(score) !== null;
}

/**
 * Generate flag reason text for CTL alert
 * @param {object} sentimentData - Parsed sentiment data
 * @returns {string}
 */
function getFlagReason(sentimentData) {
    if (!sentimentData || !sentimentData.aggregate) {
        return 'Negative sentiment detected';
    }

    const { score, emotion, confidence } = sentimentData.aggregate;
    const confidenceText = confidence > 0.8 ? 'High confidence' : confidence > 0.6 ? 'Medium confidence' : 'Low confidence';

    return `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} sentiment detected (score: ${score.toFixed(2)}, ${confidenceText})`;
}

module.exports = {
    extractTextFields,
    buildSentimentPrompt,
    parseSentimentResponse,
    getCTLAlertLevel,
    getFieldLabel,
    shouldTriggerAlert,
    getFlagReason,
    redactPII,
    clampScore,
    clampConfidence
};
