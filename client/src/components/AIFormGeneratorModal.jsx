import React, { useState } from 'react';

export function AIFormGeneratorModal({ isOpen, onClose, onGenerate }) {
    const [prompt, setPrompt] = useState('');

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(2px)'
        }}>
            <div style={{
                background: 'white',
                width: '600px',
                maxWidth: '90%',
                borderRadius: '16px',
                padding: '30px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                fontFamily: "'Outfit', sans-serif"
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>✨</span> AI Form Generator
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#94a3b8' }}
                    >
                        ×
                    </button>
                </div>

                <p style={{ color: '#64748b', lineHeight: '1.5', marginBottom: '20px' }}>
                    Describe the survey you want to build in natural language. The AI will generate a structured questionnaire for you automatically.
                </p>

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Create a customer satisfaction survey for a hotel with questions about check-in experience, room cleanliness, breakfast quality, and staff friendliness."
                    style={{
                        width: '100%',
                        height: '150px',
                        padding: '15px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '1em',
                        fontFamily: 'inherit',
                        resize: 'none',
                        outline: 'none',
                        marginBottom: '20px',
                        color: '#334155',
                        boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px', fontSize: '0.9em', color: '#f59e0b' }}>
                    <span>⚠️</span>
                    <span>This will generate a new form structure based on your description.</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            color: '#475569',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '1em'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onGenerate(prompt)}
                        disabled={!prompt.trim()}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            background: prompt.trim() ? '#8b5cf6' : '#cbd5e1',
                            color: 'white',
                            cursor: prompt.trim() ? 'pointer' : 'not-allowed',
                            fontWeight: '500',
                            fontSize: '1em',
                            boxShadow: prompt.trim() ? '0 4px 6px -1px rgba(139, 92, 246, 0.3)' : 'none'
                        }}
                    >
                        Generate Survey
                    </button>
                </div>
            </div>
        </div>
    );
}
