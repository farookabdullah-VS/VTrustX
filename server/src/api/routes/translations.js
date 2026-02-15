/**
 * Translation API Routes
 *
 * Endpoints for managing multi-language translations
 * - Get supported languages
 * - Translate forms
 * - Manage translations (CRUD)
 * - Language detection
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const TranslationService = require('../../services/TranslationService');
const logger = require('../../infrastructure/logger');

/**
 * @route   GET /api/translations/languages
 * @desc    Get list of supported languages
 * @access  Public (for respondents to see available languages)
 */
router.get('/languages', async (req, res) => {
    try {
        const languages = await TranslationService.getSupportedLanguages();

        res.json({
            success: true,
            data: languages
        });
    } catch (error) {
        logger.error('[Translations] GET /languages failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/translations/detect
 * @desc    Detect language of text
 * @access  Public
 */
router.post('/detect', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }

        const language = await TranslationService.detectLanguage(text);

        res.json({
            success: true,
            data: { language }
        });
    } catch (error) {
        logger.error('[Translations] POST /detect failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/translations/translate
 * @desc    Translate single text
 * @access  Private
 */
router.post('/translate', authenticate, async (req, res) => {
    try {
        const { text, targetLanguage, sourceLanguage } = req.body;

        if (!text || !targetLanguage) {
            return res.status(400).json({
                success: false,
                error: 'Text and targetLanguage are required'
            });
        }

        const translation = await TranslationService.translateText(
            text,
            targetLanguage,
            sourceLanguage
        );

        res.json({
            success: true,
            data: { translation }
        });
    } catch (error) {
        logger.error('[Translations] POST /translate failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/translations/forms/:formId/translate
 * @desc    Translate entire form to target language
 * @access  Private
 */
router.post('/forms/:formId/translate', authenticate, async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);
        const tenantId = req.user.tenantId;
        const { targetLanguage, sourceLanguage } = req.body;

        if (!targetLanguage) {
            return res.status(400).json({
                success: false,
                error: 'targetLanguage is required'
            });
        }

        const translation = await TranslationService.translateForm(
            formId,
            tenantId,
            targetLanguage,
            sourceLanguage
        );

        res.json({
            success: true,
            data: translation
        });
    } catch (error) {
        logger.error('[Translations] POST /forms/:formId/translate failed', {
            error: error.message,
            formId: req.params.formId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/translations/forms/:formId
 * @desc    Get all translations for a form
 * @access  Private
 */
router.get('/forms/:formId', authenticate, async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);

        const translations = await TranslationService.getFormTranslations(formId);

        res.json({
            success: true,
            data: translations
        });
    } catch (error) {
        logger.error('[Translations] GET /forms/:formId failed', {
            error: error.message,
            formId: req.params.formId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/translations/forms/:formId/:languageCode
 * @desc    Get specific translation for a form
 * @access  Public (for respondents)
 */
router.get('/forms/:formId/:languageCode', async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);
        const languageCode = req.params.languageCode;

        const translation = await TranslationService.getFormTranslation(formId, languageCode);

        if (!translation) {
            return res.status(404).json({
                success: false,
                error: 'Translation not found'
            });
        }

        res.json({
            success: true,
            data: translation
        });
    } catch (error) {
        logger.error('[Translations] GET /forms/:formId/:languageCode failed', {
            error: error.message,
            formId: req.params.formId,
            languageCode: req.params.languageCode
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/translations/forms/:formId/:languageCode
 * @desc    Delete a translation
 * @access  Private
 */
router.delete('/forms/:formId/:languageCode', authenticate, async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);
        const languageCode = req.params.languageCode;

        await TranslationService.deleteTranslation(formId, languageCode);

        res.json({
            success: true,
            message: 'Translation deleted successfully'
        });
    } catch (error) {
        logger.error('[Translations] DELETE /forms/:formId/:languageCode failed', {
            error: error.message,
            formId: req.params.formId,
            languageCode: req.params.languageCode
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/translations/forms/:formId/languages
 * @desc    Update available languages for a form
 * @access  Private
 */
router.put('/forms/:formId/languages', authenticate, async (req, res) => {
    try {
        const formId = parseInt(req.params.formId);
        const tenantId = req.user.tenantId;
        const { languages } = req.body;

        if (!Array.isArray(languages)) {
            return res.status(400).json({
                success: false,
                error: 'languages must be an array'
            });
        }

        await TranslationService.updateFormLanguages(formId, tenantId, languages);

        res.json({
            success: true,
            message: 'Form languages updated successfully'
        });
    } catch (error) {
        logger.error('[Translations] PUT /forms/:formId/languages failed', {
            error: error.message,
            formId: req.params.formId
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
