import React, { useState } from 'react';
import axios from 'axios';
import { AlertCircle, Download, CheckCircle, Loader, ExternalLink, Key, FileText, Info, Type } from 'lucide-react';
import fontLoader from '../utils/fontLoader';

const FigmaThemeImporter = ({ onImportSuccess, onClose }) => {
    const [step, setStep] = useState(1); // 1: Input, 2: Preview, 3: Success
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        figmaFileUrl: '',
        figmaAccessToken: '',
        applyImmediately: false,
        saveAsPreset: true,
        presetName: ''
    });

    const [importedTheme, setImportedTheme] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [fonts, setFonts] = useState([]);
    const [fontInstructions, setFontInstructions] = useState([]);

    // Validate Figma token
    const validateToken = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/settings/theme/import/figma/validate', {
                figmaAccessToken: formData.figmaAccessToken
            });

            if (response.data.valid) {
                return { valid: true, user: response.data.user };
            } else {
                throw new Error('Invalid token');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to validate Figma token');
            return { valid: false };
        } finally {
            setLoading(false);
        }
    };

    // Import theme from Figma
    const handleImport = async () => {
        setLoading(true);
        setError(null);

        try {
            // Validate token first
            const validation = await validateToken();
            if (!validation.valid) {
                return;
            }

            // Import theme
            const response = await axios.post('/api/settings/theme/import/figma', formData);

            if (response.data.success) {
                setImportedTheme(response.data.theme);
                setMetadata(response.data.metadata);
                setFonts(response.data.fonts || []);
                setFontInstructions(response.data.fontInstructions || []);

                // Load Google Fonts automatically for preview
                if (response.data.fonts) {
                    response.data.fonts.forEach(font => {
                        if (font.config?.source === 'google-fonts') {
                            fontLoader.loadGoogleFont(font.processed, font.config.weights);
                        }
                    });
                }

                setStep(2); // Move to preview
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.details || 'Failed to import theme from Figma');
        } finally {
            setLoading(false);
        }
    };

    // Apply imported theme
    const handleApply = async () => {
        setLoading(true);
        setError(null);

        try {
            // Save theme
            if (formData.saveAsPreset) {
                const presetName = formData.presetName || `Figma Import - ${metadata.fileName}`;
                await axios.post('/api/settings/theme/saved', {
                    name: presetName,
                    config: importedTheme
                });
            }

            // Apply theme
            if (formData.applyImmediately) {
                await axios.post('/api/settings/theme', importedTheme);
            }

            setStep(3); // Success

            // Notify parent component
            if (onImportSuccess) {
                onImportSuccess(importedTheme);
            }

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save theme');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="figma-importer">
            <style>{`
                .figma-importer {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    max-width: 600px;
                    margin: 0 auto;
                }

                .figma-importer h3 {
                    margin: 0 0 8px 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #1e293b;
                }

                .figma-importer .subtitle {
                    color: #64748b;
                    margin-bottom: 24px;
                    font-size: 14px;
                }

                .figma-importer .form-group {
                    margin-bottom: 20px;
                }

                .figma-importer label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: #334155;
                    font-size: 14px;
                }

                .figma-importer input[type="text"],
                .figma-importer input[type="password"] {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .figma-importer input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .figma-importer .checkbox-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .figma-importer input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }

                .figma-importer .info-box {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 20px;
                    font-size: 13px;
                    color: #475569;
                    display: flex;
                    gap: 10px;
                }

                .figma-importer .info-box svg {
                    flex-shrink: 0;
                    margin-top: 2px;
                }

                .figma-importer .error-box {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 20px;
                    color: #dc2626;
                    font-size: 14px;
                    display: flex;
                    align-items: start;
                    gap: 10px;
                }

                .figma-importer .success-box {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 20px;
                    color: #16a34a;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .figma-importer .theme-preview {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 20px;
                }

                .figma-importer .theme-preview h4 {
                    margin: 0 0 12px 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #1e293b;
                }

                .figma-importer .color-swatches {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .figma-importer .color-swatch {
                    text-align: center;
                }

                .figma-importer .color-box {
                    width: 100%;
                    height: 50px;
                    border-radius: 6px;
                    margin-bottom: 6px;
                    border: 1px solid #e2e8f0;
                }

                .figma-importer .color-label {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 500;
                    text-transform: capitalize;
                }

                .figma-importer .metadata {
                    background: #f8fafc;
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    color: #475569;
                }

                .figma-importer .metadata div {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                }

                .figma-importer .metadata div:last-child {
                    margin-bottom: 0;
                }

                .figma-importer .button-group {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 24px;
                }

                .figma-importer button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .figma-importer button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .figma-importer .btn-secondary {
                    background: #f1f5f9;
                    color: #475569;
                }

                .figma-importer .btn-secondary:hover:not(:disabled) {
                    background: #e2e8f0;
                }

                .figma-importer .btn-primary {
                    background: #3b82f6;
                    color: white;
                }

                .figma-importer .btn-primary:hover:not(:disabled) {
                    background: #2563eb;
                }

                .figma-importer .help-link {
                    margin-top: 16px;
                    text-align: center;
                    font-size: 13px;
                }

                .figma-importer .help-link a {
                    color: #3b82f6;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .figma-importer .help-link a:hover {
                    text-decoration: underline;
                }
            `}</style>

            {/* Step 1: Input */}
            {step === 1 && (
                <>
                    <h3>Import Theme from Figma</h3>
                    <p className="subtitle">
                        Import colors, typography, and spacing from your Figma design file
                    </p>

                    {error && (
                        <div className="error-box">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="info-box">
                        <Info size={18} color="#3b82f6" />
                        <div>
                            <strong>Before you start:</strong>
                            <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                <li>Get your Figma Personal Access Token from Figma Account Settings</li>
                                <li>Open your design file and copy the URL</li>
                                <li>Make sure the file contains design tokens (colors, typography)</li>
                            </ol>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>
                            <FileText size={16} style={{ display: 'inline', marginRight: '6px' }} />
                            Figma File URL
                        </label>
                        <input
                            type="text"
                            placeholder="https://www.figma.com/file/ABC123/MyDesign"
                            value={formData.figmaFileUrl}
                            onChange={(e) => setFormData({ ...formData, figmaFileUrl: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            <Key size={16} style={{ display: 'inline', marginRight: '6px' }} />
                            Figma Access Token
                        </label>
                        <input
                            type="password"
                            placeholder="figd_xxxxxxxxxxxxxxxxxxxxx"
                            value={formData.figmaAccessToken}
                            onChange={(e) => setFormData({ ...formData, figmaAccessToken: e.target.value })}
                        />
                    </div>

                    <div className="checkbox-group">
                        <input
                            type="checkbox"
                            id="applyImmediately"
                            checked={formData.applyImmediately}
                            onChange={(e) => setFormData({ ...formData, applyImmediately: e.target.checked })}
                        />
                        <label htmlFor="applyImmediately" style={{ margin: 0 }}>
                            Apply theme immediately after import
                        </label>
                    </div>

                    <div className="checkbox-group">
                        <input
                            type="checkbox"
                            id="saveAsPreset"
                            checked={formData.saveAsPreset}
                            onChange={(e) => setFormData({ ...formData, saveAsPreset: e.target.checked })}
                        />
                        <label htmlFor="saveAsPreset" style={{ margin: 0 }}>
                            Save as theme preset
                        </label>
                    </div>

                    {formData.saveAsPreset && (
                        <div className="form-group">
                            <label>Preset Name (optional)</label>
                            <input
                                type="text"
                                placeholder="Auto-generated from file name"
                                value={formData.presetName}
                                onChange={(e) => setFormData({ ...formData, presetName: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="button-group">
                        {onClose && (
                            <button className="btn-secondary" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                        )}
                        <button
                            className="btn-primary"
                            onClick={handleImport}
                            disabled={!formData.figmaFileUrl || !formData.figmaAccessToken || loading}
                        >
                            {loading ? (
                                <>
                                    <Loader size={16} className="spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Import Theme
                                </>
                            )}
                        </button>
                    </div>

                    <div className="help-link">
                        <a
                            href="https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            How to get a Figma Access Token
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </>
            )}

            {/* Step 2: Preview */}
            {step === 2 && importedTheme && (
                <>
                    <h3>Preview Imported Theme</h3>
                    <p className="subtitle">Review the imported theme before applying</p>

                    {metadata && (
                        <div className="metadata">
                            <div>
                                <span>File Name:</span>
                                <strong>{metadata.fileName}</strong>
                            </div>
                            <div>
                                <span>Last Modified:</span>
                                <span>{new Date(metadata.lastModified).toLocaleDateString()}</span>
                            </div>
                            <div>
                                <span>Imported At:</span>
                                <span>{new Date(metadata.importedAt).toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    <div className="theme-preview">
                        <h4>Colors</h4>
                        <div className="color-swatches">
                            {Object.entries(importedTheme)
                                .filter(([key]) => key.toLowerCase().includes('color'))
                                .map(([key, value]) => (
                                    <div key={key} className="color-swatch">
                                        <div className="color-box" style={{ backgroundColor: value }} />
                                        <div className="color-label">
                                            {key.replace('Color', '').replace(/([A-Z])/g, ' $1').trim()}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Fonts Section */}
                    {fonts && fonts.length > 0 && (
                        <div className="theme-preview">
                            <h4><Type size={18} style={{ display: 'inline', marginRight: '8px' }} />Fonts</h4>
                            {fonts.map((font, idx) => (
                                <div key={idx} style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <strong style={{ fontSize: '14px' }}>{font.name}</strong>
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            background: font.config?.source === 'google-fonts' ? '#dcfce7' : font.config?.source === 'system' ? '#dbeafe' : '#fef3c7',
                                            color: font.config?.source === 'google-fonts' ? '#166534' : font.config?.source === 'system' ? '#1e40af' : '#92400e'
                                        }}>
                                            {font.config?.source === 'google-fonts' ? '✓ Google Fonts' :
                                             font.config?.source === 'system' ? '✓ System Font' :
                                             '⚠ Custom Font'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                                        {font.original} → {font.processed}
                                    </div>
                                    <div style={{ fontSize: '20px', fontFamily: font.processed, marginTop: '8px' }}>
                                        The quick brown fox jumps over the lazy dog
                                    </div>
                                    {font.config?.warning && (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
                                            ⚠ {font.config.warning}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Font Instructions */}
                    {fontInstructions && fontInstructions.length > 0 && (
                        <div className="info-box">
                            <Info size={18} color="#3b82f6" />
                            <div>
                                <strong>Font Loading:</strong>
                                {fontInstructions.map((instruction, idx) => (
                                    <div key={idx} style={{ marginTop: '8px' }}>
                                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{instruction.font}:</div>
                                        <ul style={{ margin: '4px 0 0 20px', paddingLeft: 0 }}>
                                            {instruction.steps.map((step, stepIdx) => (
                                                <li key={stepIdx} style={{ fontSize: '12px' }}>{step}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="button-group">
                        <button
                            className="btn-secondary"
                            onClick={() => setStep(1)}
                            disabled={loading}
                        >
                            Back
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleApply}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader size={16} className="spin" />
                                    Applying...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16} />
                                    Apply Theme
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <>
                    <div className="success-box">
                        <CheckCircle size={20} />
                        <span>Theme imported successfully!</span>
                    </div>

                    <p style={{ color: '#64748b', marginBottom: '24px' }}>
                        Your theme has been {formData.applyImmediately ? 'applied and ' : ''}
                        {formData.saveAsPreset ? 'saved as a preset' : 'imported'}.
                    </p>

                    <div className="button-group">
                        <button className="btn-primary" onClick={onClose || (() => window.location.reload())}>
                            Done
                        </button>
                    </div>
                </>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default FigmaThemeImporter;
