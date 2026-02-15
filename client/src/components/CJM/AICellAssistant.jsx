import React, { useState } from 'react';
import axios from 'axios';
import {
    Sparkles, Expand, Shrink, RefreshCw, Languages, SpellCheck,
    Quote, Lightbulb, X, Loader2, ChevronDown
} from 'lucide-react';

const AI_ACTIONS = [
    { id: 'expand', label: 'Expand', icon: Expand, prompt: 'Expand and add more detail to the following text. Keep it concise but richer:' },
    { id: 'shorten', label: 'Shorten', icon: Shrink, prompt: 'Shorten and make this text more concise while keeping key points:' },
    { id: 'rephrase', label: 'Rephrase', icon: RefreshCw, prompt: 'Rephrase the following text in a clearer, more professional way:' },
    { id: 'fix_grammar', label: 'Fix Grammar', icon: SpellCheck, prompt: 'Fix any spelling and grammar errors in this text, return only the corrected text:' },
    { id: 'customer_quote', label: 'Customer Quote', icon: Quote, prompt: 'Generate a realistic customer quote/verbatim that a customer might say in this context. Return only the quote in quotation marks:' },
    { id: 'suggest', label: 'Suggest Content', icon: Lightbulb, prompt: 'Based on this customer journey context, suggest relevant content for this cell. Be specific and actionable:' },
];

const LANGUAGES = ['Arabic', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Hindi', 'Portuguese'];

export function AICellAssistant({ cellText, sectionType, sectionTitle, stageName, onApply }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showLangs, setShowLangs] = useState(false);

    const runAction = async (action, extra = '') => {
        setLoading(true);
        setResult(null);
        setShowLangs(false);

        const context = `Journey Map Context:\n- Stage: ${stageName || 'Unknown'}\n- Section: ${sectionTitle || sectionType || 'Unknown'}\n- Section Type: ${sectionType || 'text'}\n\nCurrent cell content: "${cellText || '(empty)'}"\n\n`;
        const fullPrompt = context + action.prompt + (extra ? ` ${extra}` : '') + `\n\n"${cellText || ''}"`;

        try {
            const res = await axios.post('/api/ai/generate', { prompt: fullPrompt });
            const text = res.data.text || res.data.definition || '';
            const cleaned = typeof text === 'string' ? text : JSON.stringify(text);
            setResult(cleaned);
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
        try {
            const res = await axios.post('/api/ai/generate', {
                prompt: `Translate the following text to ${lang}. Return only the translation, nothing else:\n\n"${cellText || ''}"`
            });
            setResult(res.data.text || res.data.definition || '');
        } catch (e) {
            setResult(`Error: ${e.response?.data?.error || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <button
                className="ai-cell-trigger"
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                aria-label="Open AI Assistant"
            >
                <Sparkles size={12} aria-hidden="true" />
            </button>
        );
    }

    return (
        <div className="ai-cell-panel" onClick={e => e.stopPropagation()}>
            <div className="ai-cell-header">
                <span className="ai-cell-title"><Sparkles size={12} /> AI Assistant</span>
                <button className="ai-cell-close" onClick={() => { setOpen(false); setResult(null); }} aria-label="Close AI Assistant"><X size={14} aria-hidden="true" /></button>
            </div>

            <div className="ai-cell-actions">
                {AI_ACTIONS.map(action => (
                    <button
                        key={action.id}
                        className="ai-action-btn"
                        onClick={() => runAction(action)}
                        disabled={loading}
                    >
                        <action.icon size={13} />
                        <span>{action.label}</span>
                    </button>
                ))}

                {/* Translate dropdown */}
                <div className="ai-translate-wrapper">
                    <button
                        className="ai-action-btn"
                        onClick={() => setShowLangs(!showLangs)}
                        disabled={loading}
                    >
                        <Languages size={13} />
                        <span>Translate</span>
                        <ChevronDown size={10} />
                    </button>
                    {showLangs && (
                        <div className="ai-lang-dropdown">
                            {LANGUAGES.map(lang => (
                                <button key={lang} className="ai-lang-btn" onClick={() => translateTo(lang)}>{lang}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {loading && (
                <div className="ai-cell-loading">
                    <Loader2 size={16} className="ai-spinner" /> Generating...
                </div>
            )}

            {result && !loading && (
                <div className="ai-cell-result">
                    <div className="ai-result-text">{result}</div>
                    <div className="ai-result-actions">
                        <button className="ai-apply-btn" onClick={() => { onApply(result); setOpen(false); setResult(null); }}>
                            Apply
                        </button>
                        <button className="ai-discard-btn" onClick={() => setResult(null)}>
                            Discard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
