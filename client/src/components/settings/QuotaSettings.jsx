import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Search, ChevronDown, Trash2 } from 'lucide-react';

export function QuotaSettings({ formId }) {
    const [enabled, setEnabled] = useState(false);
    const [quotas, setQuotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);

    // UI State for "New Quota" card
    const [isAdding, setIsAdding] = useState(false);
    const [newQuota, setNewQuota] = useState({
        label: '',
        limit: '',
        filters: [],
        action: 'default', // default, termination, thank_you
        resetPeriod: 'never' // never, daily, weekly, monthly
    });
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Filter Builder State
    const [selectedQuestion, setSelectedQuestion] = useState(null); // When user clicks a question from dropdown
    const [answerOptions, setAnswerOptions] = useState([]); // Choices for that question
    const [filterSearch, setFilterSearch] = useState('');

    useEffect(() => {
        loadData();
    }, [formId]);

    const loadData = async () => {
        try {
            // Load Quotas
            const qRes = await axios.get(`/api/quotas?formId=${formId}`);
            setQuotas(qRes.data);
            if (qRes.data.length > 0) setEnabled(true);

            // Load Form Structure for Questions
            const fRes = await axios.get(`/api/forms/${formId}`);
            if (fRes.data && fRes.data.definition) {
                extractQuestions(fRes.data.definition);
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const extractQuestions = (def) => {
        const qs = [];
        if (def.pages) {
            def.pages.forEach(p => {
                if (p.elements) {
                    p.elements.forEach(e => {
                        if (e.type !== 'html' && e.type !== 'panel') {
                            qs.push({ name: e.name, title: e.title || e.name, type: e.type });
                        }
                    });
                }
            });
        }
        setQuestions(qs);
    };

    const handleSaveQuota = async () => {
        if (!newQuota.label || !newQuota.limit) return alert("Label and Limit are required");

        try {
            // Save to Backend
            const payload = {
                form_id: formId,
                label: newQuota.label,
                limit_count: parseInt(newQuota.limit),
                criteria: newQuota.filters,
                action: newQuota.action,
                reset_period: newQuota.resetPeriod,
                is_active: true
            };
            await axios.post('/api/quotas', payload);
            setIsAdding(false);
            setNewQuota({ label: '', limit: '', filters: [], action: 'default', resetPeriod: 'never' });
            loadData(); // Refresh
        } catch (err) {
            alert("Failed to save quota");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this quota?")) return;
        try {
            await axios.delete(`/api/quotas/${id}`);
            loadData();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    return (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1em', color: '#1e293b' }}>SET QUOTAS</h3>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ color: '#64748b', fontWeight: '500' }}>Limit the number of responses for each criteria</span>
                    <label className="switch">
                        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                        <span className="slider round"></span>
                    </label>
                </div>

                {enabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        {/* Existing Quotas List */}
                        {quotas.map(q => (
                            <div key={q.id} style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{q.label}</div>
                                    <div style={{ fontSize: '0.9em', color: '#64748b' }}>Limit: {q.limit_count} | Current: {q.current_count}</div>
                                </div>
                                <button onClick={() => handleDelete(q.id)} style={{ padding: '8px', color: '#ef4444', background: '#fee2e2', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {/* Add New Quota UI (Matches Screenshot) */}
                        {isAdding ? (
                            <div style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Quota Label</label>
                                        <input
                                            value={newQuota.label}
                                            onChange={e => setNewQuota({ ...newQuota, label: e.target.value })}
                                            placeholder="Test"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Quota Limit ⓘ</label>
                                        <input
                                            type="number"
                                            value={newQuota.limit}
                                            onChange={e => setNewQuota({ ...newQuota, limit: e.target.value })}
                                            placeholder="Ex. 100"
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9em', color: '#64748b', marginBottom: '10px' }}>Choose Questions</label>

                                    {/* Selected Filters Chips */}
                                    {newQuota.filters.length > 0 && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                            {newQuota.filters.map((f, i) => (
                                                <div key={i} style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {f.question} = {f.answer}
                                                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => {
                                                        const nf = [...newQuota.filters];
                                                        nf.splice(i, 1);
                                                        setNewQuota({ ...newQuota, filters: nf });
                                                    }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action & Reset Section */}
                                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>On Breach (Redirect To)</label>
                                            <select
                                                value={newQuota.action}
                                                onChange={e => setNewQuota({ ...newQuota, action: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                            >
                                                <option value="default">Default "Quota Full" Page</option>
                                                <option value="termination">Custom Termination Page</option>
                                                <option value="thank_you">Thank You Page</option>
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Auto Reset Limit</label>
                                            <select
                                                value={newQuota.resetPeriod}
                                                onChange={e => setNewQuota({ ...newQuota, resetPeriod: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                            >
                                                <option value="never">Never (Absoute Limit)</option>
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => { setShowFilterMenu(!showFilterMenu); setSelectedQuestion(null); setFilterSearch(''); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '10px 16px', background: 'white', border: '1px solid #cbd5e1',
                                                borderRadius: '20px', cursor: 'pointer', color: '#1e293b', fontWeight: '600',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                            }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0e7490', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></div>
                                            Add Filter Group
                                        </button>

                                        {/* Filter Dropdown Menu (Matches Screenshot) */}
                                        {showFilterMenu && (
                                            <div style={{
                                                position: 'absolute', top: '50px', left: 0, width: '320px',
                                                background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                border: '1px solid #e2e8f0', zIndex: 100, padding: '10px'
                                            }}>
                                                {!selectedQuestion ? (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '8px 12px', marginBottom: '10px' }}>
                                                            <Search size={14} color="#94a3b8" />
                                                            <input
                                                                placeholder="Search Questions..."
                                                                value={filterSearch}
                                                                onChange={e => setFilterSearch(e.target.value)}
                                                                autoFocus
                                                                style={{ border: 'none', padding: 0, fontSize: '0.9em', outline: 'none', width: '100%' }}
                                                            />
                                                        </div>

                                                        <div style={{ fontSize: '0.75em', color: '#94a3b8', fontWeight: '700', padding: '5px 10px', letterSpacing: '0.5px' }}>SELECT QUESTION / CRITERIA</div>

                                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                            {questions.filter(q => q.title.toLowerCase().includes(filterSearch.toLowerCase())).map(q => (
                                                                <div
                                                                    key={q.name}
                                                                    onClick={() => {
                                                                        // If question has choices, allow selecting answers. If text/rating, simple add.
                                                                        // For now, let's just assume we want to pick an answer if possible.
                                                                        // But we need the definition to get choices.
                                                                        // Simple Mock for now:
                                                                        setSelectedQuestion(q);
                                                                    }}
                                                                    style={{ padding: '8px 10px', fontSize: '0.9em', color: '#1e293b', cursor: 'pointer', borderRadius: '6px' }}
                                                                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                                                    onMouseOut={e => e.currentTarget.style.background = 'white'}
                                                                >
                                                                    {q.title}
                                                                </div>
                                                            ))}

                                                            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '5px', paddingTop: '5px' }}>
                                                                <div
                                                                    onClick={() => alert("AI Quota Generator: Coming Soon")}
                                                                    style={{ padding: '8px 10px', fontSize: '0.9em', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '6px' }}
                                                                    onMouseOver={e => e.currentTarget.style.background = '#f5f3ff'}
                                                                    onMouseOut={e => e.currentTarget.style.background = 'white'}
                                                                >
                                                                    ✨ Wing it with AI!
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    // ANSWER SELECTION MODE
                                                    <div>
                                                        <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }} onClick={() => setSelectedQuestion(null)}>
                                                            <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} />
                                                            <span style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{selectedQuestion.title}</span>
                                                        </div>
                                                        <div style={{ padding: '5px', color: '#64748b', fontSize: '0.85em' }}>
                                                            Enter exact answer to match:
                                                        </div>
                                                        {/* Ideally we list choices here if available. For MVP, text input. */}
                                                        <input
                                                            placeholder="Answer value (e.g. Yes)"
                                                            id="answer-input"
                                                            style={{ width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = e.target.value;
                                                                    if (val) {
                                                                        setNewQuota({ ...newQuota, filters: [...newQuota.filters, { question: selectedQuestion.title, answer: val }] });
                                                                        setShowFilterMenu(false);
                                                                        setSelectedQuestion(null);
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                const val = document.getElementById('answer-input').value;
                                                                if (val) {
                                                                    setNewQuota({ ...newQuota, filters: [...newQuota.filters, { question: selectedQuestion.title, answer: val }] });
                                                                    setShowFilterMenu(false);
                                                                    setSelectedQuestion(null);
                                                                }
                                                            }}
                                                            style={{ width: '100%', padding: '6px', background: '#0e7490', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            Add Criterion
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={handleSaveQuota} style={{ padding: '8px 24px', background: '#0e7490', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Save</button>
                                    <button onClick={() => setIsAdding(false)} style={{ padding: '8px 20px', background: 'transparent', color: '#0e7490', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAdding(true)}
                                style={{
                                    width: '100%', padding: '12px', border: '2px dashed #cbd5e1', borderRadius: '10px',
                                    background: 'transparent', color: '#64748b', fontWeight: '600', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}>
                                <Plus size={18} /> Add Quota
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
