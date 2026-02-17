import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, FileText, Type, Bold, Italic, Link as LinkIcon, Code, BookOpen, Save } from 'lucide-react';
import { MediaLibrary } from './MediaLibrary';
import axios from '../../axiosConfig';

/**
 * Rich Template Editor
 * Supports text formatting and media placeholders
 * For email: supports HTML
 * For SMS/WhatsApp: supports text only
 */
export function RichTemplateEditor({ value, onChange, channel = 'email', showMediaButton = true, subject, onSubjectChange }) {
    const [showMediaLibrary, setShowMediaLibrary] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saveDesc, setSaveDesc] = useState('');
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const textareaRef = React.useRef(null);

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const res = await axios.get('/api/templates', { params: { channel } });
            setSavedTemplates(res.data);
        } catch (e) {
            console.error('Failed to load templates', e);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!saveName.trim()) return;
        try {
            await axios.post('/api/templates', {
                name: saveName.trim(),
                description: saveDesc.trim() || undefined,
                channel,
                subject: subject || undefined,
                body: value,
            });
            setSaveName('');
            setSaveDesc('');
            setShowSaveDialog(false);
        } catch (e) {
            console.error('Failed to save template', e);
        }
    };

    const handleLoadTemplate = (tmpl) => {
        if (onSubjectChange && tmpl.subject) onSubjectChange(tmpl.subject);
        onChange(tmpl.body);
        setShowLoadDialog(false);
    };

    const insertPlaceholder = (placeholder) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = value || '';

        const before = text.substring(0, start);
        const after = text.substring(end);
        const newText = before + placeholder + after;

        onChange(newText);

        // Set cursor position after placeholder
        setTimeout(() => {
            textarea.focus();
            const newPos = start + placeholder.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleMediaSelect = (asset) => {
        if (Array.isArray(asset)) {
            // Multiple assets selected
            asset.forEach(a => {
                const placeholder = `{{${a.mediaType}:${a.id}}}`;
                insertPlaceholder(placeholder + ' ');
            });
        } else {
            // Single asset
            const placeholder = `{{${asset.mediaType}:${asset.id}}}`;
            insertPlaceholder(placeholder);
        }
        setShowMediaLibrary(false);
    };

    const placeholderButtons = [
        { label: 'Name', placeholder: '{{name}}', icon: Type },
        { label: 'Email', placeholder: '{{email}}', icon: Type },
        { label: 'Phone', placeholder: '{{phone}}', icon: Type },
        { label: 'Link', placeholder: '{{link}}', icon: LinkIcon },
        { label: 'Company', placeholder: '{{company}}', icon: Type }
    ];

    return (
        <div style={{ width: '100%' }}>
            {/* Toolbar */}
            <div style={{
                background: '#F9FAFB',
                border: '2px solid #E5E7EB',
                borderBottom: 'none',
                borderRadius: '12px 12px 0 0',
                padding: '12px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Text Placeholders */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {placeholderButtons.map(btn => (
                        <button
                            key={btn.label}
                            onClick={() => insertPlaceholder(btn.placeholder)}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '6px',
                                background: 'white',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                            }}
                            title={`Insert ${btn.label}`}
                        >
                            <btn.icon size={14} />
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                {showMediaButton && (
                    <div style={{ width: '1px', height: '24px', background: '#D1D5DB' }} />
                )}

                {/* Media Button */}
                {showMediaButton && (
                    <button
                        onClick={() => setShowMediaLibrary(true)}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid var(--primary)',
                            borderRadius: '6px',
                            background: 'white',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                        title="Insert Media"
                    >
                        <ImageIcon size={16} />
                        Add Media
                    </button>
                )}

                {/* Template divider */}
                <div style={{ width: '1px', height: '24px', background: '#D1D5DB' }} />

                {/* Load Template */}
                <button
                    onClick={() => { loadTemplates(); setShowLoadDialog(true); }}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                    title="Load a saved template"
                >
                    <BookOpen size={15} />
                    Load
                </button>

                {/* Save Template */}
                <button
                    onClick={() => setShowSaveDialog(true)}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                    title="Save as template"
                >
                    <Save size={15} />
                    Save
                </button>
            </div>

            {/* Editor */}
            <textarea
                ref={textareaRef}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={(e) => setCursorPosition(e.target.selectionStart)}
                placeholder="Enter your message template here...

Use placeholders like {{name}}, {{link}}, etc.
Insert media using the Add Media button above."
                style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '0 0 12px 12px',
                    fontSize: '0.95rem',
                    fontFamily: 'monospace',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    outline: 'none'
                }}
            />

            {/* Help Text */}
            <div style={{
                marginTop: '8px',
                padding: '12px',
                background: '#F0F9FF',
                borderRadius: '8px',
                border: '1px solid #BFDBFE'
            }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#1E40AF', fontWeight: '600' }}>
                    Template Syntax:
                </p>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '0.85rem', color: '#1E40AF' }}>
                    <li><code>{'{{name}}'}</code> - Recipient name</li>
                    <li><code>{'{{link}}'}</code> - Survey/form link</li>
                    <li><code>{'{{image:ID}}'}</code> - Inline image (email only)</li>
                    <li><code>{'{{video:ID}}'}</code> - Video attachment (WhatsApp/email)</li>
                    <li><code>{'{{document:ID}}'}</code> - Document attachment</li>
                </ul>
                {channel === 'sms' && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#DC2626', fontWeight: '600' }}>
                        Note: SMS does not support media. Media placeholders will be replaced with URLs.
                    </p>
                )}
            </div>

            {/* Preview */}
            {value && (
                <div style={{ marginTop: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-color)' }}>
                        Preview:
                    </h4>
                    <div style={{
                        padding: '16px',
                        background: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        fontSize: '0.9rem',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6'
                    }}>
                        {renderPreview(value)}
                    </div>
                </div>
            )}

            {/* Media Library Modal */}
            {showMediaLibrary && (
                <MediaLibrary
                    onSelect={handleMediaSelect}
                    onClose={() => setShowMediaLibrary(false)}
                    multiSelect={true}
                />
            )}

            {/* Save Template Dialog */}
            {showSaveDialog && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}
                    onClick={() => setShowSaveDialog(false)}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '420px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Save as Template</h3>
                        <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>Save the current message body for reuse in future distributions.</p>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Template Name *</label>
                        <input
                            type="text"
                            value={saveName}
                            onChange={e => setSaveName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                            placeholder="e.g. NPS Follow-up Email"
                            autoFocus
                            style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', boxSizing: 'border-box', marginBottom: '12px' }}
                        />
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>Description (optional)</label>
                        <input
                            type="text"
                            value={saveDesc}
                            onChange={e => setSaveDesc(e.target.value)}
                            placeholder="Short description…"
                            style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', boxSizing: 'border-box', marginBottom: '20px' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowSaveDialog(false)} style={{ padding: '10px 20px', border: '1px solid #D1D5DB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                            <button onClick={handleSaveTemplate} disabled={!saveName.trim()}
                                style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: saveName.trim() ? 'var(--primary)' : '#E5E7EB', color: 'white', cursor: saveName.trim() ? 'pointer' : 'not-allowed', fontWeight: '700' }}>
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Load Template Dialog */}
            {showLoadDialog && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}
                    onClick={() => setShowLoadDialog(false)}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '560px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Load Template</h3>
                        <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>Select a saved template to load into the editor.</p>
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {loadingTemplates && <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>Loading…</p>}
                            {!loadingTemplates && savedTemplates.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
                                    <BookOpen size={40} style={{ opacity: 0.3 }} />
                                    <p style={{ marginTop: '12px' }}>No saved templates for {channel} yet.<br />Write a message and click Save to create one.</p>
                                </div>
                            )}
                            {!loadingTemplates && savedTemplates.map(tmpl => (
                                <div key={tmpl.id}
                                    onClick={() => handleLoadTemplate(tmpl)}
                                    style={{ padding: '16px', border: '2px solid #E5E7EB', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem' }}>{tmpl.name}</p>
                                            {tmpl.description && <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#6B7280' }}>{tmpl.description}</p>}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#6B7280', whiteSpace: 'nowrap', marginLeft: '12px' }}>{new Date(tmpl.updated_at).toLocaleDateString()}</span>
                                    </div>
                                    {tmpl.subject && <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#374151' }}><strong>Subject:</strong> {tmpl.subject}</p>}
                                    <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tmpl.body}</p>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowLoadDialog(false)} style={{ marginTop: '16px', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '600' }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Render preview with highlighted placeholders
 */
function renderPreview(text) {
    if (!text) return null;

    // Split text by placeholders
    const parts = [];
    const regex = /{{([^}]+)}}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before placeholder
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        // Add highlighted placeholder
        parts.push(
            <span
                key={match.index}
                style={{
                    background: '#DBEAFE',
                    color: '#1E40AF',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: '600',
                    fontSize: '0.85rem'
                }}
            >
                {match[0]}
            </span>
        );

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
}

export default RichTemplateEditor;
