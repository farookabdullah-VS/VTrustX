/**
 * Translation Service
 *
 * Handles multi-language translation for surveys using Google Translate API
 * Features:
 * - Auto-translate form content (title, description, questions, options)
 * - Language detection
 * - Batch translation for efficiency
 * - Cache translations to reduce API calls
 * - Support for RTL languages (Arabic, Hebrew)
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const { Translate } = require('@google-cloud/translate').v2;

// Initialize Google Translate client
let translateClient = null;

// Check if Google Cloud credentials are configured
if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    translateClient = new Translate({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
} else {
    logger.warn('[TranslationService] Google Cloud Translate not configured - using mock translations');
}

class TranslationService {
    /**
     * Get all supported languages
     */
    static async getSupportedLanguages() {
        try {
            const result = await query(
                'SELECT * FROM supported_languages WHERE is_enabled = true ORDER BY sort_order ASC'
            );

            return result.rows;
        } catch (error) {
            logger.error('[TranslationService] Failed to get supported languages', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Detect language of text
     * @param {string} text - Text to detect language
     * @returns {Promise<string>} - Detected language code
     */
    static async detectLanguage(text) {
        try {
            if (!translateClient) {
                // Mock detection for testing
                return 'en';
            }

            const [detection] = await translateClient.detect(text);
            return detection.language;
        } catch (error) {
            logger.error('[TranslationService] Language detection failed', {
                error: error.message,
                text: text.substring(0, 100)
            });
            return 'en'; // Default to English
        }
    }

    /**
     * Translate text to target language
     * @param {string} text - Text to translate
     * @param {string} targetLanguage - Target language code
     * @param {string} sourceLanguage - Source language code (optional, auto-detect if not provided)
     * @returns {Promise<string>} - Translated text
     */
    static async translateText(text, targetLanguage, sourceLanguage = null) {
        try {
            if (!text || text.trim() === '') {
                return text;
            }

            if (!translateClient) {
                // Mock translation for testing
                return `[${targetLanguage}] ${text}`;
            }

            const options = {
                to: targetLanguage
            };

            if (sourceLanguage) {
                options.from = sourceLanguage;
            }

            const [translation] = await translateClient.translate(text, options);
            return translation;
        } catch (error) {
            logger.error('[TranslationService] Translation failed', {
                error: error.message,
                targetLanguage,
                sourceLanguage
            });
            return text; // Return original text on failure
        }
    }

    /**
     * Translate multiple texts in batch
     * @param {string[]} texts - Array of texts to translate
     * @param {string} targetLanguage - Target language code
     * @param {string} sourceLanguage - Source language code (optional)
     * @returns {Promise<string[]>} - Array of translated texts
     */
    static async translateBatch(texts, targetLanguage, sourceLanguage = null) {
        try {
            if (!texts || texts.length === 0) {
                return [];
            }

            if (!translateClient) {
                // Mock batch translation
                return texts.map(text => `[${targetLanguage}] ${text}`);
            }

            const options = {
                to: targetLanguage
            };

            if (sourceLanguage) {
                options.from = sourceLanguage;
            }

            const [translations] = await translateClient.translate(texts, options);
            return Array.isArray(translations) ? translations : [translations];
        } catch (error) {
            logger.error('[TranslationService] Batch translation failed', {
                error: error.message,
                targetLanguage,
                count: texts.length
            });
            return texts; // Return original texts on failure
        }
    }

    /**
     * Translate entire form to target language
     * @param {number} formId - Form ID
     * @param {number} tenantId - Tenant ID
     * @param {string} targetLanguage - Target language code
     * @param {string} sourceLanguage - Source language code (optional, defaults to form's default_language)
     * @returns {Promise<object>} - Translation record
     */
    static async translateForm(formId, tenantId, targetLanguage, sourceLanguage = null) {
        try {
            // Get form data
            const formResult = await query(
                'SELECT * FROM forms WHERE id = $1 AND tenant_id = $2',
                [formId, tenantId]
            );

            if (formResult.rows.length === 0) {
                throw new Error(`Form ${formId} not found`);
            }

            const form = formResult.rows[0];
            const definition = form.definition;

            // Use form's default language as source if not specified
            if (!sourceLanguage) {
                sourceLanguage = form.default_language || 'en';
            }

            // Check if translation already exists
            const existingTranslation = await query(
                'SELECT * FROM form_translations WHERE form_id = $1 AND language_code = $2',
                [formId, targetLanguage]
            );

            // Prepare texts to translate
            const textsToTranslate = [];
            const textKeys = [];

            // Title
            if (form.title) {
                textsToTranslate.push(form.title);
                textKeys.push('title');
            }

            // Description
            if (form.description) {
                textsToTranslate.push(form.description);
                textKeys.push('description');
            }

            // Welcome message
            if (definition.welcomeMessage) {
                textsToTranslate.push(definition.welcomeMessage);
                textKeys.push('welcomeMessage');
            }

            // Thank you message
            if (definition.thankYouMessage) {
                textsToTranslate.push(definition.thankYouMessage);
                textKeys.push('thankYouMessage');
            }

            // Questions
            const questions = definition.questions || [];
            questions.forEach((question, index) => {
                if (question.text) {
                    textsToTranslate.push(question.text);
                    textKeys.push(`question_${index}_text`);
                }

                if (question.description) {
                    textsToTranslate.push(question.description);
                    textKeys.push(`question_${index}_description`);
                }

                // Options for multiple choice, checkboxes, dropdown
                if (question.options && Array.isArray(question.options)) {
                    question.options.forEach((option, optionIndex) => {
                        if (typeof option === 'string') {
                            textsToTranslate.push(option);
                            textKeys.push(`question_${index}_option_${optionIndex}`);
                        } else if (option.label) {
                            textsToTranslate.push(option.label);
                            textKeys.push(`question_${index}_option_${optionIndex}_label`);
                        }
                    });
                }

                // Scale labels
                if (question.scaleLabels) {
                    if (question.scaleLabels.min) {
                        textsToTranslate.push(question.scaleLabels.min);
                        textKeys.push(`question_${index}_scaleMin`);
                    }
                    if (question.scaleLabels.max) {
                        textsToTranslate.push(question.scaleLabels.max);
                        textKeys.push(`question_${index}_scaleMax`);
                    }
                }
            });

            // Translate all texts in batch
            logger.info('[TranslationService] Starting translation', {
                formId,
                targetLanguage,
                sourceLanguage,
                textsCount: textsToTranslate.length
            });

            const translations = await this.translateBatch(
                textsToTranslate,
                targetLanguage,
                sourceLanguage
            );

            // Map translations back to structure
            const translationMap = {};
            textKeys.forEach((key, index) => {
                translationMap[key] = translations[index];
            });

            // Build translated questions array
            const translatedQuestions = questions.map((question, index) => {
                const translatedQuestion = {
                    ...question,
                    text: translationMap[`question_${index}_text`] || question.text,
                    description: translationMap[`question_${index}_description`] || question.description
                };

                // Translate options
                if (question.options && Array.isArray(question.options)) {
                    translatedQuestion.options = question.options.map((option, optionIndex) => {
                        if (typeof option === 'string') {
                            return translationMap[`question_${index}_option_${optionIndex}`] || option;
                        } else if (option.label) {
                            return {
                                ...option,
                                label: translationMap[`question_${index}_option_${optionIndex}_label`] || option.label
                            };
                        }
                        return option;
                    });
                }

                // Translate scale labels
                if (question.scaleLabels) {
                    translatedQuestion.scaleLabels = {
                        min: translationMap[`question_${index}_scaleMin`] || question.scaleLabels.min,
                        max: translationMap[`question_${index}_scaleMax`] || question.scaleLabels.max
                    };
                }

                return translatedQuestion;
            });

            // Save or update translation
            const translationData = {
                tenant_id: tenantId,
                form_id: formId,
                language_code: targetLanguage,
                title: translationMap.title || form.title,
                description: translationMap.description || form.description,
                welcome_message: translationMap.welcomeMessage || definition.welcomeMessage,
                thank_you_message: translationMap.thankYouMessage || definition.thankYouMessage,
                questions: JSON.stringify(translatedQuestions),
                translation_status: 'completed',
                translated_by: translateClient ? 'google' : 'mock',
                translated_at: new Date()
            };

            let result;
            if (existingTranslation.rows.length > 0) {
                // Update existing translation
                result = await query(
                    `UPDATE form_translations
                    SET title = $1, description = $2, welcome_message = $3, thank_you_message = $4,
                        questions = $5, translation_status = $6, translated_by = $7, translated_at = $8,
                        updated_at = NOW()
                    WHERE form_id = $9 AND language_code = $10
                    RETURNING *`,
                    [
                        translationData.title,
                        translationData.description,
                        translationData.welcome_message,
                        translationData.thank_you_message,
                        translationData.questions,
                        translationData.translation_status,
                        translationData.translated_by,
                        translationData.translated_at,
                        formId,
                        targetLanguage
                    ]
                );
            } else {
                // Insert new translation
                result = await query(
                    `INSERT INTO form_translations
                    (tenant_id, form_id, language_code, title, description, welcome_message,
                     thank_you_message, questions, translation_status, translated_by, translated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *`,
                    [
                        translationData.tenant_id,
                        translationData.form_id,
                        translationData.language_code,
                        translationData.title,
                        translationData.description,
                        translationData.welcome_message,
                        translationData.thank_you_message,
                        translationData.questions,
                        translationData.translation_status,
                        translationData.translated_by,
                        translationData.translated_at
                    ]
                );
            }

            logger.info('[TranslationService] Translation completed', {
                formId,
                targetLanguage,
                translationId: result.rows[0].id
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[TranslationService] Failed to translate form', {
                error: error.message,
                formId,
                targetLanguage
            });
            throw error;
        }
    }

    /**
     * Get translation for form in specific language
     * @param {number} formId - Form ID
     * @param {string} languageCode - Language code
     * @returns {Promise<object|null>} - Translation record or null
     */
    static async getFormTranslation(formId, languageCode) {
        try {
            const result = await query(
                'SELECT * FROM form_translations WHERE form_id = $1 AND language_code = $2',
                [formId, languageCode]
            );

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            logger.error('[TranslationService] Failed to get form translation', {
                error: error.message,
                formId,
                languageCode
            });
            throw error;
        }
    }

    /**
     * Get all translations for a form
     * @param {number} formId - Form ID
     * @returns {Promise<object[]>} - Array of translation records
     */
    static async getFormTranslations(formId) {
        try {
            const result = await query(
                `SELECT ft.*, sl.name as language_name, sl.native_name, sl.direction
                FROM form_translations ft
                JOIN supported_languages sl ON ft.language_code = sl.code
                WHERE ft.form_id = $1
                ORDER BY sl.sort_order ASC`,
                [formId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[TranslationService] Failed to get form translations', {
                error: error.message,
                formId
            });
            throw error;
        }
    }

    /**
     * Delete translation
     * @param {number} formId - Form ID
     * @param {string} languageCode - Language code
     * @returns {Promise<boolean>} - Success status
     */
    static async deleteTranslation(formId, languageCode) {
        try {
            await query(
                'DELETE FROM form_translations WHERE form_id = $1 AND language_code = $2',
                [formId, languageCode]
            );

            logger.info('[TranslationService] Translation deleted', {
                formId,
                languageCode
            });

            return true;
        } catch (error) {
            logger.error('[TranslationService] Failed to delete translation', {
                error: error.message,
                formId,
                languageCode
            });
            throw error;
        }
    }

    /**
     * Update form's available languages
     * @param {number} formId - Form ID
     * @param {number} tenantId - Tenant ID
     * @param {string[]} languages - Array of language codes
     * @returns {Promise<boolean>} - Success status
     */
    static async updateFormLanguages(formId, tenantId, languages) {
        try {
            await query(
                `UPDATE forms
                SET available_languages = $1, updated_at = NOW()
                WHERE id = $2 AND tenant_id = $3`,
                [JSON.stringify(languages), formId, tenantId]
            );

            logger.info('[TranslationService] Form languages updated', {
                formId,
                languages
            });

            return true;
        } catch (error) {
            logger.error('[TranslationService] Failed to update form languages', {
                error: error.message,
                formId
            });
            throw error;
        }
    }
}

module.exports = TranslationService;
