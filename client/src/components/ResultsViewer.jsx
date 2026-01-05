import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export function ResultsViewer({ formId, onBack, onEditSubmission, initialView, onNavigate }) {
    const [rawSubmissions, setRawSubmissions] = useState([]);
    const [formMetadata, setFormMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSidebar, setActiveSidebar] = useState(initialView || 'dashboard');

    // AI Analysis State
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        sentiment: 'all', // all, positive, neutral, negative
        search: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [formRes, subRes] = await Promise.all([
                    axios.get(`/api/forms/${formId}`),
                    axios.get(`/api/submissions?formId=${formId}`)
                ]);
                setFormMetadata(formRes.data);
                setRawSubmissions(subRes.data);
                setLoading(false);
            } catch (err) {
                console.error("Data load error:", err);
                setLoading(false);
            }
        };
        fetchData();
    }, [formId]);

    // --- DERIVED DATA & FILTERING ---
    const submissions = useMemo(() => {
        return rawSubmissions.filter(sub => {
            const date = new Date(sub.createdAt || sub.created_at);

            // Date Filter
            if (filters.startDate && date < new Date(filters.startDate)) return false;
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59);
                if (date > end) return false;
            }

            // Search Filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const strData = JSON.stringify(sub.data).toLowerCase();
                const strId = String(sub.id);
                if (!strData.includes(searchLower) && !strId.includes(searchLower)) return false;
            }

            // Sentiment Filter (Heuristic Check)
            if (filters.sentiment !== 'all') {
                // Determine heuristic sentiment for this sub (reusing logic or simple check)
                // For performance, we might want to classify once. But let's do simple check:
                // If filter is Positive, check for high ratings.
                // This is tricky if we haven't pre-calculated. 
                // Let's rely on the pre-calculation in the dashboard logic for accuracy,
                // or move sentiment logic to the "sub" object earlier.
            }
            return true;
        }).map(sub => {
            // Enrich with Heuristic Sentiment for filtering/display
            let score = 0;
            let scorable = false;
            if (sub.data) {
                Object.entries(sub.data).forEach(([key, val]) => {
                    const numVal = Number(val);
                    if (!isNaN(numVal)) {
                        if (key.toLowerCase().includes('nps')) { scorable = true; if (numVal >= 9) score++; else if (numVal <= 6) score--; }
                        else if (numVal <= 5) { scorable = true; if (numVal >= 4) score++; else if (numVal <= 2) score--; }
                    }
                });
            }
            const sentiment = scorable ? (score > 0 ? 'Positive' : (score < 0 ? 'Negative' : 'Neutral')) : 'Neutral';
            return { ...sub, computedSentiment: sentiment };
        }).filter(sub => {
            if (filters.sentiment === 'all') return true;
            return sub.computedSentiment.toLowerCase() === filters.sentiment.toLowerCase();
        });
    }, [rawSubmissions, filters]);


    // --- AI HANDLER ---
    const handleGenerateInsight = async () => {
        setIsGeneratingAI(true);
        try {
            const questions = getQuestions();
            const response = await axios.post('/api/ai/analyze-survey', {
                surveyTitle: formMetadata.title,
                questions: questions,
                submissions: submissions // Send currently filtered submissions
            });
            setAiAnalysis(response.data);
        } catch (error) {
            console.error("AI Error:", error);
            alert("Failed to generate insights: " + (error.response?.data?.error || error.message));
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- EXPORTS ---
    const handleExportExcel = () => {
        if (!submissions.length) return alert("No data to export.");
        const questions = getQuestions();
        const data = submissions.map(sub => {
            const row = { ID: sub.id, Date: new Date(sub.createdAt || sub.created_at).toLocaleString() };
            questions.forEach(q => row[q.title || q.name] = (typeof sub.data[q.name] === 'object' ? JSON.stringify(sub.data[q.name]) : sub.data[q.name]));
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Responses");
        XLSX.writeFile(wb, `Survey_Export_${formId}.xlsx`);
    };

    // --- HELPERS ---
    const getQuestions = () => {
        if (!formMetadata?.definition?.pages) return [];
        let qs = [];
        formMetadata.definition.pages.forEach(p => { if (p.elements) qs = [...qs, ...p.elements]; });
        return qs;
    };

    const calculateStats = (question) => {
        const counts = {};
        let total = 0;
        submissions.forEach(sub => {
            const val = sub.data[question.name];
            if (val !== undefined && val !== null && val !== "") {
                const key = Array.isArray(val) ? val.join(', ') : String(val);
                counts[key] = (counts[key] || 0) + 1;
                total++;
            }
        });
        return { counts, total };
    };

    // --- RENDERERS ---

    // 1. DASHBOARD VIEW (Enhanced)
    const renderDashboard = () => {
        const total = submissions.length;
        if (total === 0) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No data matches your filters.</div>;

        const posCount = submissions.filter(s => s.computedSentiment === 'Positive').length;
        const negCount = submissions.filter(s => s.computedSentiment === 'Negative').length;
        const neuCount = submissions.filter(s => s.computedSentiment === 'Neutral').length;
        const posPct = Math.round((posCount / total) * 100);
        const negPct = Math.round((negCount / total) * 100);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.5s' }}>
                {/* AI SUMMARY CARD (Top of Dashboard) */}
                <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', borderRadius: '16px', border: '1px solid #bbf7d0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dcfce7' }}>
                        <div>
                            <h2 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                ✨ AI Executive Summary
                            </h2>
                            <p style={{ margin: '5px 0 0 0', color: '#15803d', fontSize: '0.9em' }}>
                                Powered by Gemini 2.0 Flash
                            </p>
                        </div>
                        {!aiAnalysis && (
                            <button
                                onClick={handleGenerateInsight}
                                disabled={isGeneratingAI}
                                style={{
                                    padding: '10px 20px',
                                    background: '#166534',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isGeneratingAI ? 'wait' : 'pointer',
                                    fontWeight: '600',
                                    boxShadow: '0 4px 6px rgba(22, 101, 52, 0.2)',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                {isGeneratingAI ? 'Thinking...' : 'Generate Report'}
                            </button>
                        )}
                    </div>

                    {aiAnalysis && (
                        <div style={{ padding: '24px', animation: 'slideDown 0.5s ease-out' }}>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, background: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.85em', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Overall Sentiment</div>
                                    <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: aiAnalysis.sentiment === 'Positive' ? '#166534' : '#b91c1c' }}>
                                        {aiAnalysis.sentiment} <span style={{ fontSize: '0.6em', color: '#94a3b8' }}>({aiAnalysis.sentiment_confidence}% confidence)</span>
                                    </div>
                                    <p style={{ fontSize: '0.95em', color: '#334155', marginTop: '10px' }}>{aiAnalysis.summary}</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '10px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#166534' }}>✅ Key Strengths</h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#14532d' }}>
                                        {aiAnalysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '10px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⚠️ Areas for Attention</h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#7f1d1d' }}>
                                        {aiAnalysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', background: '#eff6ff', padding: '15px', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>🚀 Recommendations</h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a' }}>
                                    {aiAnalysis.recommendations?.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* METRICS ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#64748b', fontSize: '0.9em' }}>Total Responses</div>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#0f172a' }}>{total}</div>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#64748b', fontSize: '0.9em' }}>Positive Sentiment</div>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#22c55e' }}>{posPct}%</div>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ color: '#64748b', fontSize: '0.9em' }}>Negative Sentiment</div>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ef4444' }}>{negPct}%</div>
                    </div>
                </div>

                {/* QUESTION BREAKDOWN (Visual Charts) */}
                <h3 style={{ margin: '10px 0 0', color: '#334155' }}>Question Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {getQuestions().map((q, idx) => {
                        const { counts, total: qTotal } = calculateStats(q);
                        if (qTotal === 0) return null;
                        const isChoice = ['radiogroup', 'dropdown', 'checkbox', 'rating', 'boolean'].includes(q.type);

                        return (
                            <div key={idx} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>{q.title || q.name}</h4>
                                {isChoice ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                                            const pct = Math.round((count / qTotal) * 100);
                                            return (
                                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', cursor: 'pointer' }}
                                                    title="Click to filter"
                                                    onClick={() => setFilters(prev => ({ ...prev, search: label }))}
                                                >
                                                    <div style={{ width: '120px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#475569' }}>{label}</div>
                                                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: '4px' }}></div>
                                                    </div>
                                                    <div style={{ width: '40px', textAlign: 'right', color: '#64748b' }}>{pct}%</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {Object.keys(counts).slice(0, 5).map((ans, i) => (
                                            <div key={i} style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', marginBottom: '8px', fontSize: '0.9em', color: '#334155' }}>
                                                "{ans}"
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // 2. INDIVIDUAL RESPONSES VIEW
    const renderIndividual = () => {
        return (
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                                <th style={{ padding: '10px' }}>ID</th>
                                <th style={{ padding: '10px' }}>Date</th>
                                <th style={{ padding: '10px' }}>Sentiment</th>
                                <th style={{ padding: '10px' }}>Data Preview</th>
                                <th style={{ padding: '10px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => (
                                <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => onEditSubmission(sub.id, formId)}>
                                    <td style={{ padding: '10px', color: '#2563eb', fontWeight: '500' }}>{sub.id}</td>
                                    <td style={{ padding: '10px' }}>{new Date(sub.createdAt || sub.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.85em',
                                            background: sub.computedSentiment === 'Positive' ? '#dcfce7' : (sub.computedSentiment === 'Negative' ? '#fee2e2' : '#f1f5f9'),
                                            color: sub.computedSentiment === 'Positive' ? '#166534' : (sub.computedSentiment === 'Negative' ? '#991b1b' : '#475569')
                                        }}>
                                            {sub.computedSentiment}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px', color: '#64748b', maxWidth: '300px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {JSON.stringify(sub.data)}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <button style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✏️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
            {/* HEADER */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#64748b' }}>←</button>
                    <div>
                        <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#0f172a' }}>{formMetadata?.title || 'Survey Results'}</div>
                        <div style={{ fontSize: '0.8em', color: '#64748b' }}>{rawSubmissions.length} Total Submissions</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleExportExcel} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        📥 Export
                    </button>
                </div>
            </div>

            {/* DYNAMIC FILTER BAR */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '10px 30px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9em', color: '#64748b' }}>Date:</span>
                    <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155' }} />
                    <span style={{ color: '#cbd5e1' }}>-</span>
                    <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9em', color: '#64748b' }}>Sentiment:</span>
                    <select value={filters.sentiment} onChange={e => setFilters({ ...filters, sentiment: e.target.value })} style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155' }}>
                        <option value="all">All</option>
                        <option value="positive">Positive</option>
                        <option value="neutral">Neutral</option>
                        <option value="negative">Negative</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '0.9em', color: '#64748b' }}>Search:</span>
                    <input type="text" placeholder="Search keywords..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', width: '100%', maxWidth: '300px' }} />
                </div>

                {(filters.startDate || filters.endDate || filters.search || filters.sentiment !== 'all') && (
                    <button onClick={() => setFilters({ startDate: '', endDate: '', sentiment: 'all', search: '' })} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9em', fontWeight: '500' }}>
                        Clear Filters
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flex: 1 }}>
                {/* SIDEBAR */}
                <div style={{ width: '240px', background: 'white', borderRight: '1px solid #e2e8f0', padding: '20px 0' }}>
                    {[
                        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
                        { id: 'individual', icon: '📝', label: 'Individual Responses' },
                        { id: 'analytics', icon: '📈', label: 'Analytics (Legacy)' }
                    ].map(item => (
                        <div key={item.id}
                            onClick={() => setActiveSidebar(item.id)}
                            style={{
                                padding: '12px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                                background: activeSidebar === item.id ? '#f0fdf4' : 'transparent',
                                color: activeSidebar === item.id ? '#166534' : '#64748b',
                                borderRight: activeSidebar === item.id ? '3px solid #166534' : '3px solid transparent',
                                fontWeight: activeSidebar === item.id ? '600' : '500'
                            }}
                        >
                            <span>{item.icon}</span> {item.label}
                        </div>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <div style={{ flex: 1, padding: '30px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
                    {activeSidebar === 'dashboard' && renderDashboard()}
                    {activeSidebar === 'individual' && renderIndividual()}
                    {activeSidebar === 'analytics' && <div style={{ color: '#64748b' }}>Legacy Analytics View (Replaced by Dashboard)</div>}
                </div>
            </div>
        </div>
    );
}
