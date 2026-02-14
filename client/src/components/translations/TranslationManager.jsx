/**
 * Translation Manager Component
 *
 * Manage multi-language translations for surveys
 * Features:
 * - View available translations
 * - Auto-translate to new languages
 * - Edit translations manually
 * - Delete translations
 * - Language switcher preview
 */

import React, { useState, useEffect } from 'react';
import {
    Globe,
    Plus,
    Trash2,
    Check,
    X,
    RefreshCw,
    Eye,
    Edit2,
    Languages
} from 'lucide-react';
import axios from '../../axiosConfig';
import './TranslationManager.css';

const TranslationManager = ({ formId, onClose }) => {
    const [supportedLanguages, setSupportedLanguages] = useState([]);
    const [translations, setTranslations] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);

    useEffect(() => {
        fetchSupportedLanguages();
        fetchTranslations();
    }, [formId]);

    const fetchSupportedLanguages = async () => {
        try {
            const response = await axios.get('/api/translations/languages');
            setSupportedLanguages(response.data.data);
        } catch (error) {
            console.error('Failed to fetch supported languages:', error);
        }
    };

    const fetchTranslations = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/translations/forms/${formId}`);
            setTranslations(response.data.data);
        } catch (error) {
            console.error('Failed to fetch translations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTranslate = async (languageCode) => {
        try {
            setTranslating(true);

            const response = await axios.post(
                `/api/translations/forms/${formId}/translate`,
                { targetLanguage: languageCode }
            );

            alert(`Translation to ${languageCode} completed successfully!`);
            fetchTranslations();
            setShowAddDialog(false);
        } catch (error) {
            console.error('Translation failed:', error);
            alert('Translation failed. Please try again.');
        } finally {
            setTranslating(false);
        }
    };

    const handleDeleteTranslation = async (languageCode) => {
        if (!confirm(`Are you sure you want to delete the ${languageCode} translation?`)) {
            return;
        }

        try {
            await axios.delete(`/api/translations/forms/${formId}/${languageCode}`);
            alert('Translation deleted successfully');
            fetchTranslations();
        } catch (error) {
            console.error('Failed to delete translation:', error);
            alert('Failed to delete translation');
        }
    };

    const getTranslatedLanguages = () => {
        return translations.map(t => t.language_code);
    };

    const getAvailableLanguages = () => {
        const translatedCodes = getTranslatedLanguages();
        return supportedLanguages.filter(lang => !translatedCodes.includes(lang.code));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="translation-manager">
            <div className="translation-manager-header">
                <div className="header-left">
                    <Globe size={24} />
                    <div>
                        <h2>Translation Management</h2>
                        <p>Manage multi-language versions of your survey</p>
                    </div>
                </div>
                <button className="btn-close" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className="translation-manager-body">
                {/* Add Translation Button */}
                <div className="add-translation-section">
                    <button
                        className="btn-add-translation"
                        onClick={() => setShowAddDialog(true)}
                        disabled={getAvailableLanguages().length === 0}
                    >
                        <Plus size={20} />
                        Add Translation
                    </button>
                    <span className="translation-count">
                        {translations.length} language{translations.length !== 1 ? 's' : ''} available
                    </span>
                </div>

                {/* Translations List */}
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading translations...</p>
                    </div>
                ) : translations.length === 0 ? (
                    <div className="empty-state">
                        <Languages size={48} color="#D1D5DB" />
                        <h3>No Translations Yet</h3>
                        <p>Add translations to make your survey available in multiple languages</p>
                    </div>
                ) : (
                    <div className="translations-grid">
                        {translations.map((translation) => (
                            <div key={translation.id} className="translation-card">
                                <div className="translation-header">
                                    <div className="language-info">
                                        <div className="language-flag">
                                            {translation.native_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4>{translation.language_name}</h4>
                                            <span className="native-name">{translation.native_name}</span>
                                        </div>
                                    </div>
                                    {translation.direction === 'rtl' && (
                                        <span className="rtl-badge">RTL</span>
                                    )}
                                </div>

                                <div className="translation-meta">
                                    <div className="meta-row">
                                        <span className="meta-label">Status:</span>
                                        <span className={`status-badge ${translation.translation_status}`}>
                                            {translation.translation_status}
                                        </span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-label">Translated By:</span>
                                        <span>{translation.translated_by || 'N/A'}</span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-label">Date:</span>
                                        <span>{formatDate(translation.translated_at)}</span>
                                    </div>
                                </div>

                                <div className="translation-actions">
                                    <button
                                        className="action-btn preview"
                                        onClick={() => setSelectedLanguage(translation)}
                                        title="Preview"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        className="action-btn refresh"
                                        onClick={() => handleTranslate(translation.language_code)}
                                        title="Re-translate"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                    <button
                                        className="action-btn delete"
                                        onClick={() => handleDeleteTranslation(translation.language_code)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Translation Dialog */}
            {showAddDialog && (
                <div className="dialog-overlay" onClick={() => setShowAddDialog(false)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>Add Translation</h3>
                            <button onClick={() => setShowAddDialog(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="dialog-body">
                            <p>Select a language to translate your survey into:</p>

                            <div className="language-list">
                                {getAvailableLanguages().map((language) => (
                                    <div
                                        key={language.code}
                                        className="language-option"
                                        onClick={() => handleTranslate(language.code)}
                                    >
                                        <div className="language-flag">
                                            {language.native_name.charAt(0)}
                                        </div>
                                        <div className="language-details">
                                            <h4>{language.name}</h4>
                                            <span>{language.native_name}</span>
                                        </div>
                                        {language.direction === 'rtl' && (
                                            <span className="rtl-badge">RTL</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {translating && (
                                <div className="translating-overlay">
                                    <div className="spinner"></div>
                                    <p>Translating...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Dialog */}
            {selectedLanguage && (
                <div className="dialog-overlay" onClick={() => setSelectedLanguage(null)}>
                    <div className="dialog preview-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>Preview: {selectedLanguage.language_name}</h3>
                            <button onClick={() => setSelectedLanguage(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="dialog-body preview-body">
                            <div className={`preview-content ${selectedLanguage.direction === 'rtl' ? 'rtl' : ''}`}>
                                <h2>{selectedLanguage.title}</h2>
                                {selectedLanguage.description && (
                                    <p className="description">{selectedLanguage.description}</p>
                                )}

                                {selectedLanguage.welcome_message && (
                                    <div className="welcome-message">
                                        {selectedLanguage.welcome_message}
                                    </div>
                                )}

                                <div className="questions-preview">
                                    {JSON.parse(selectedLanguage.questions || '[]').slice(0, 3).map((question, index) => (
                                        <div key={index} className="question-preview">
                                            <strong>Q{index + 1}:</strong> {question.text}
                                            {question.options && (
                                                <ul>
                                                    {question.options.slice(0, 3).map((option, i) => (
                                                        <li key={i}>
                                                            {typeof option === 'string' ? option : option.label}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TranslationManager;
