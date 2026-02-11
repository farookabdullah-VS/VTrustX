import React, { useState } from 'react';
import axios from 'axios';
import {
    Sparkles, Expand, Shrink, RefreshCw, Languages, SpellCheck,
    Lightbulb, X, Loader2, ChevronDown, ListPlus, Check
} from 'lucide-react';

const AI_ACTIONS = [
    { id: 'expand', label: 'Expand', icon: Expand, prompt: 'Expand and add more detail to the following content. Keep it concise but richer.' },
    { id: 'shorten', label: 'Shorten', icon: Shrink, prompt: 'Shorten and make this content more concise while keeping key points.' },
    { id: 'rephrase', label: 'Rephrase', icon: RefreshCw, prompt: 'Rephrase the following content in a clearer, more professional way.' },
    { id: 'fix_grammar', label: 'Fix Grammar', icon: SpellCheck, prompt: 'Fix any spelling and grammar errors. Return only the corrected content.' },
    { id: 'suggest', label: 'Suggest Content', icon: Lightbulb, prompt: 'Based on this persona context, suggest relevant and specific content for this section. Be detailed and actionable.' },
    { id: 'generate_items', label: 'Generate Items', icon: ListPlus, prompt: 'Generate 3-5 additional relevant list items for this persona section. Return each item on a new line, no bullets or numbers.' },
];

const LANGUAGES = ['Arabic', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Hindi', 'Portuguese'];

export function AIPersonaAssistant({ section, personaName, personaRole, onApply }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showLangs, setShowLangs] = useState(false);

    const getContentString = () => {
        if (section.type === 'list' && Array.isArray(section.data)) {
            return section.data.filter(i => typeof i === 'string').join('\n');
        }
        if (section.type === 'text' || section.type === 'quote') {
            return section.content || '';
        }
        if (section.type === 'demographic' && Array.isArray(section.data)) {
            return section.data.map(d => `${d.label}: ${d.value}`).join('\n');
        }
        if (section.type === 'skills' && Array.isArray(section.data)) {
            return section.data.map(s => `${s.label}: ${s.value}%`).join('\n');
        }
        return JSON.stringify(section.data || section.content || '');
    };

    const buildContext = () => {
        return `Persona Context:
- Persona Name: ${personaName || 'Unknown'}
- Persona Role: ${personaRole || 'Unknown'}
- Section Title: ${section.title || 'Unknown'}
- Section Type: ${section.type || 'text'}

Current section content:
"${getContentString()}"`;
    };

    const runAction = async (action) => {
        setLoading(true);
        setResult(null);
        setShowLangs(false);

        const prompt = `${buildContext()}

${action.prompt}

${action.id === 'generate_items' ? 'Return only the new items, one per line, no bullets or numbers. Do not repeat existing items.' : 'Return only the improved content, no explanations.'}`;

        try {
            const res = await axios.post('/api/ai/generate', { prompt });
            const text = res.data.text || res.data.definition || '';
            setResult(typeof text === 'string' ? text : JSON.stringify(text));
        } catch (e) {
            setResult(`Error: ${e.response?.data?.error || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const translateTo = async (lang) => {
        setLoading(true);
        setResult(null);
        setShowLangs(false);

        const content = getContentString();
        try {
            const res = await axios.post('/api/ai/generate', {
                prompt: `Translate the following text to ${lang}. Return only the translation, nothing else:\n\n"${content}"`
            });
            setResult(res.data.text || res.data.definition || '');
        } catch (e) {
            setResult(`Error: ${e.response?.data?.error || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (!result || !onApply) return;

        // Determine how to apply based on section type
        if (section.type === 'list') {
            // For "generate items", append new items to existing list
            const lines = result.split('\n').map(l => l.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
            const existingItems = Array.isArray(section.data) ? section.data : [];

            // Check if the action was "generate_items" - if result looks like new items, append
            if (lines.length > 1 && lines.every(l => l.length < 200)) {
                onApply({ data: [...existingItems, ...lines] });
            } else {
                // Replace - result is rephrased/translated version of entire list
                onApply({ data: lines });
            }
        } else if (section.type === 'text' || section.type === 'quote') {
            onApply({ content: result });
        } else if (section.type === 'demographic') {
            // Try to parse demographic fields
            try {
                const lines = result.split('\n').filter(Boolean);
                const newData = lines.map(line => {
                    const parts = line.split(':');
                    if (parts.length >= 2) {
                        return { label: parts[0].trim(), value: parts.slice(1).join(':').trim(), icon: 'user' };
                    }
                    return null;
                }).filter(Boolean);
                if (newData.length > 0) onApply({ data: newData });
            } catch {
                // Fallback - do nothing
            }
        } else {
            // Generic fallback
            onApply({ content: result });
        }

        setOpen(false);
        setResult(null);
    };

    // Determine which actions to show based on section type
    const visibleActions = AI_ACTIONS.filter(a => {
        if (a.id === 'generate_items') return section.type === 'list';
        return true;
    });

    if (!open) {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                title="AI Assistant"
                style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: '#a78bfa', padding: '2px', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0.6, transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#7c3aed'; }}
                onMouseOut={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = '#a78bfa'; }}
            >
                <Sparkles size={15} />
            </button>
        );
    }

    return (
        <div
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            style={{
                position: 'absolute', top: '40px', right: '10px', zIndex: 1000,
                background: 'white', borderRadius: '16px', width: '300px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0', overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#6d28d9' }}>
                    <Sparkles size={14} /> AI Assistant
                </span>
                <button onClick={() => { setOpen(false); setResult(null); }} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px'
                }}>
                    <X size={16} />
                </button>
            </div>

            {/* Actions */}
            <div style={{ padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {visibleActions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => runAction(action)}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 10px', borderRadius: '8px',
                            border: '1px solid #e2e8f0', background: 'white',
                            color: '#475569', fontSize: '0.78rem', fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.5 : 1, transition: 'all 0.15s'
                        }}
                        onMouseOver={e => { if (!loading) { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#a78bfa'; } }}
                        onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                        <action.icon size={13} />
                        {action.label}
                    </button>
                ))}

                {/* Translate */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowLangs(!showLangs)}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 10px', borderRadius: '8px',
                            border: '1px solid #e2e8f0', background: 'white',
                            color: '#475569', fontSize: '0.78rem', fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.5 : 1
                        }}
                    >
                        <Languages size={13} /> Translate <ChevronDown size={10} />
                    </button>
                    {showLangs && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                            background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 15px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '140px',
                            padding: '4px'
                        }}>
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => translateTo(lang)}
                                    style={{
                                        display: 'block', width: '100%', textAlign: 'left',
                                        padding: '6px 12px', border: 'none', background: 'transparent',
                                        fontSize: '0.8rem', color: '#475569', cursor: 'pointer',
                                        borderRadius: '6px'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = '#f5f3ff'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{
                    padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', color: '#7c3aed', fontSize: '0.85rem'
                }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* Result */}
            {result && !loading && (
                <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{
                        padding: '10px 12px', background: '#f8fafc', borderRadius: '8px',
                        fontSize: '0.85rem', color: '#334155', lineHeight: '1.6',
                        maxHeight: '150px', overflowY: 'auto', marginBottom: '10px',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                    }}>
                        {result}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleApply}
                            style={{
                                flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                background: '#7c3aed', color: 'white', fontSize: '0.82rem',
                                fontWeight: '600', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}
                        >
                            <Check size={14} /> Apply
                        </button>
                        <button
                            onClick={() => setResult(null)}
                            style={{
                                flex: 1, padding: '8px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', background: 'white',
                                color: '#64748b', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer'
                            }}
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
