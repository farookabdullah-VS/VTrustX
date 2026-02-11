import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, X, Loader2, Check, RotateCcw, ChevronRight, Wand2 } from 'lucide-react';

const IMPROVEMENT_PRESETS = [
    { id: 'detailed', label: 'Make More Detailed', desc: 'Add depth and specificity to each section', prompt: 'Expand this section with more specific, realistic details. Add depth while keeping it authentic.' },
    { id: 'empathy', label: 'Add Empathy', desc: 'Make content more emotionally resonant', prompt: 'Rewrite this section to be more empathetic and emotionally resonant. Show understanding of the persona\'s feelings and experiences.' },
    { id: 'data_driven', label: 'Make Data-Driven', desc: 'Add metrics and specific data points', prompt: 'Enhance this section with specific data points, metrics, and quantifiable details. Make it more evidence-based and research-driven.' },
    { id: 'professional', label: 'Professional Tone', desc: 'Polish for stakeholder presentations', prompt: 'Rewrite this section in a polished, professional tone suitable for stakeholder presentations. Keep it clear and impactful.' },
];

export function AIPersonaImprover({ isOpen, onClose, sections, personaName, personaRole, onApplySectionUpdate }) {
    const [selectedSections, setSelectedSections] = useState({});
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState({}); // { sectionId: { original, improved, accepted: null } }
    const [step, setStep] = useState('select'); // select | improving | review

    if (!isOpen) return null;

    const improvableSections = (sections || []).filter(s => {
        if (s.type === 'header') return false;
        const hasContent = s.content && s.content.trim();
        const hasData = Array.isArray(s.data) && s.data.length > 0;
        return hasContent || hasData;
    });

    const toggleSection = (id) => {
        setSelectedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const selectAll = () => {
        const all = {};
        improvableSections.forEach(s => { all[s.id] = true; });
        setSelectedSections(all);
    };

    const selectedCount = Object.values(selectedSections).filter(Boolean).length;

    const getContentForSection = (section) => {
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
        return '';
    };

    const handleImprove = async () => {
        const sectionsToImprove = improvableSections.filter(s => selectedSections[s.id]);
        if (sectionsToImprove.length === 0) return;

        const improvementPrompt = selectedPreset
            ? IMPROVEMENT_PRESETS.find(p => p.id === selectedPreset)?.prompt
            : customPrompt;

        if (!improvementPrompt) return;

        setLoading(true);
        setStep('improving');
        const newResults = {};

        // Process sections sequentially to avoid rate limits
        for (const section of sectionsToImprove) {
            const content = getContentForSection(section);
            const prompt = `You are improving a customer persona section.

Persona: ${personaName || 'Unknown'} - ${personaRole || 'Unknown'}
Section: ${section.title} (type: ${section.type})

Current content:
"${content}"

Improvement instruction: ${improvementPrompt}

${section.type === 'list' ? 'Return the improved items as a list, one item per line, no bullets or numbers.' : 'Return only the improved content, no explanations or labels.'}`;

            try {
                const res = await axios.post('/api/ai/generate', { prompt });
                const text = res.data.text || res.data.definition || '';
                newResults[section.id] = {
                    original: content,
                    improved: typeof text === 'string' ? text : JSON.stringify(text),
                    accepted: null,
                    sectionType: section.type,
                    sectionTitle: section.title
                };
            } catch (e) {
                newResults[section.id] = {
                    original: content,
                    improved: `Error: ${e.response?.data?.error || e.message}`,
                    accepted: null,
                    sectionType: section.type,
                    sectionTitle: section.title
                };
            }
        }

        setResults(newResults);
        setLoading(false);
        setStep('review');
    };

    const acceptResult = (sectionId) => {
        setResults(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], accepted: true } }));

        const r = results[sectionId];
        if (!r || r.improved.startsWith('Error:')) return;

        const section = sections.find(s => s.id === sectionId);
        if (!section) return;

        if (section.type === 'list') {
            const items = r.improved.split('\n').map(l => l.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
            onApplySectionUpdate(sectionId, { data: items });
        } else if (section.type === 'text' || section.type === 'quote') {
            onApplySectionUpdate(sectionId, { content: r.improved });
        } else if (section.type === 'demographic') {
            const lines = r.improved.split('\n').filter(Boolean);
            const newData = lines.map(line => {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    return { label: parts[0].trim(), value: parts.slice(1).join(':').trim(), icon: 'user' };
                }
                return null;
            }).filter(Boolean);
            if (newData.length > 0) onApplySectionUpdate(sectionId, { data: newData });
        } else if (section.type === 'skills') {
            const lines = r.improved.split('\n').filter(Boolean);
            const newData = lines.map((line, i) => {
                const match = line.match(/^(.+?):\s*(\d+)%?$/);
                if (match) {
                    return { id: `s${i + 1}`, label: match[1].trim(), value: parseInt(match[2], 10) };
                }
                return null;
            }).filter(Boolean);
            if (newData.length > 0) onApplySectionUpdate(sectionId, { data: newData });
        }
    };

    const rejectResult = (sectionId) => {
        setResults(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], accepted: false } }));
    };

    const acceptAll = () => {
        Object.keys(results).forEach(id => {
            if (results[id].accepted === null && !results[id].improved.startsWith('Error:')) {
                acceptResult(id);
            }
        });
    };

    const handleClose = () => {
        setStep('select');
        setSelectedSections({});
        setSelectedPreset(null);
        setCustomPrompt('');
        setResults({});
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
            background: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            fontFamily: "'Inter', sans-serif", borderLeft: '1px solid #e2e8f0'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Wand2 size={20} color="#7c3aed" />
                    <div>
                        <div style={{ fontWeight: '700', color: '#4c1d95', fontSize: '1rem' }}>AI Improver</div>
                        <div style={{ fontSize: '0.75rem', color: '#7c3aed' }}>Enhance sections with AI</div>
                    </div>
                </div>
                <button onClick={handleClose} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px'
                }}>
                    <X size={20} />
                </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {step === 'select' && (
                    <>
                        {/* Section Selection */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'
                            }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#374151' }}>
                                    Select Sections ({selectedCount})
                                </label>
                                <button onClick={selectAll} style={{
                                    background: 'transparent', border: 'none', color: '#7c3aed',
                                    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
                                }}>
                                    Select All
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {improvableSections.map(s => (
                                    <label
                                        key={s.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '10px 12px', borderRadius: '8px',
                                            border: selectedSections[s.id] ? '1px solid #a78bfa' : '1px solid #e2e8f0',
                                            background: selectedSections[s.id] ? '#f5f3ff' : 'white',
                                            cursor: 'pointer', transition: 'all 0.15s'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={!!selectedSections[s.id]}
                                            onChange={() => toggleSection(s.id)}
                                            style={{ accentColor: '#7c3aed' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>{s.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {s.type} {Array.isArray(s.data) ? `(${s.data.length} items)` : ''}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Improvement Presets */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>
                                Improvement Style
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {IMPROVEMENT_PRESETS.map(preset => (
                                    <div
                                        key={preset.id}
                                        onClick={() => { setSelectedPreset(preset.id); setCustomPrompt(''); }}
                                        style={{
                                            padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                                            border: selectedPreset === preset.id ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                                            background: selectedPreset === preset.id ? '#f5f3ff' : 'white',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>{preset.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{preset.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Custom Prompt */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                                Or Custom Instruction
                            </label>
                            <textarea
                                value={customPrompt}
                                onChange={e => { setCustomPrompt(e.target.value); if (e.target.value) setSelectedPreset(null); }}
                                placeholder="e.g., Make the tone more casual, add tech industry jargon, focus on mobile experience..."
                                style={{
                                    width: '100%', minHeight: '80px', padding: '12px', borderRadius: '10px',
                                    border: '1px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit',
                                    resize: 'vertical', outline: 'none', boxSizing: 'border-box'
                                }}
                                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                    </>
                )}

                {step === 'improving' && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '60px 20px', gap: '20px'
                    }}>
                        <Loader2 size={40} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Improving Sections</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                Processing {selectedCount} section{selectedCount > 1 ? 's' : ''}...
                            </p>
                        </div>
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {step === 'review' && (
                    <>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'
                        }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#374151' }}>
                                Review Improvements
                            </div>
                            <button onClick={acceptAll} style={{
                                background: '#7c3aed', color: 'white', border: 'none',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem',
                                fontWeight: '600', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                <Check size={13} /> Accept All
                            </button>
                        </div>

                        {Object.entries(results).map(([sectionId, r]) => (
                            <div key={sectionId} style={{
                                marginBottom: '16px', borderRadius: '12px',
                                border: r.accepted === true ? '1px solid #86efac' : r.accepted === false ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                background: r.accepted === true ? '#f0fdf4' : r.accepted === false ? '#fef2f2' : 'white',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                                        {r.sectionTitle}
                                    </span>
                                    {r.accepted === true && <Check size={16} color="#16a34a" />}
                                    {r.accepted === false && <X size={16} color="#dc2626" />}
                                </div>

                                <div style={{ padding: '12px 14px' }}>
                                    {/* Original */}
                                    <div style={{ marginBottom: '10px' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>Original</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                            {r.original.substring(0, 150)}{r.original.length > 150 ? '...' : ''}
                                        </div>
                                    </div>

                                    {/* Improved */}
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#7c3aed', marginBottom: '4px', textTransform: 'uppercase' }}>Improved</div>
                                        <div style={{
                                            fontSize: '0.8rem', color: '#334155', lineHeight: '1.5',
                                            whiteSpace: 'pre-wrap', background: '#faf5ff',
                                            padding: '8px 10px', borderRadius: '6px',
                                            maxHeight: '120px', overflowY: 'auto'
                                        }}>
                                            {r.improved}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {r.accepted === null && (
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                            <button onClick={() => acceptResult(sectionId)} style={{
                                                flex: 1, padding: '6px', borderRadius: '6px', border: 'none',
                                                background: '#7c3aed', color: 'white', fontSize: '0.78rem',
                                                fontWeight: '600', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                            }}>
                                                <Check size={13} /> Accept
                                            </button>
                                            <button onClick={() => rejectResult(sectionId)} style={{
                                                flex: 1, padding: '6px', borderRadius: '6px',
                                                border: '1px solid #e2e8f0', background: 'white',
                                                color: '#64748b', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer'
                                            }}>
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Footer */}
            {step === 'select' && (
                <div style={{
                    padding: '16px 24px', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between'
                }}>
                    <button onClick={handleClose} style={{
                        padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                        background: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
                    }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleImprove}
                        disabled={selectedCount === 0 || (!selectedPreset && !customPrompt.trim())}
                        style={{
                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                            background: selectedCount > 0 && (selectedPreset || customPrompt.trim()) ? '#7c3aed' : '#e2e8f0',
                            color: selectedCount > 0 && (selectedPreset || customPrompt.trim()) ? 'white' : '#94a3b8',
                            cursor: selectedCount > 0 && (selectedPreset || customPrompt.trim()) ? 'pointer' : 'not-allowed',
                            fontWeight: '700', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Wand2 size={15} /> Improve {selectedCount > 0 ? `(${selectedCount})` : ''}
                    </button>
                </div>
            )}

            {step === 'review' && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={handleClose} style={{
                        width: '100%', padding: '10px 20px', borderRadius: '10px', border: 'none',
                        background: '#0f172a', color: 'white', cursor: 'pointer',
                        fontWeight: '700', fontSize: '0.85rem'
                    }}>
                        Done
                    </button>
                </div>
            )}
        </div>
    );
}
