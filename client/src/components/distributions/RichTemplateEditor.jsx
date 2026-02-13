import React, { useState } from 'react';
import { Image as ImageIcon, Video, FileText, Type, Bold, Italic, Link as LinkIcon, Code } from 'lucide-react';
import { MediaLibrary } from './MediaLibrary';

/**
 * Rich Template Editor
 * Supports text formatting and media placeholders
 * For email: supports HTML
 * For SMS/WhatsApp: supports text only
 */
export function RichTemplateEditor({ value, onChange, channel = 'email', showMediaButton = true }) {
    const [showMediaLibrary, setShowMediaLibrary] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = React.useRef(null);

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
