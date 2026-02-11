import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { AnalyticsView } from './AnalyticsView';
import { ResultsGrid } from './ResultsGrid';
import { useToast } from './common/Toast';
import { CloseTheLoop } from './CloseTheLoop';

const ShareModal = React.memo(({ isOpen, onClose, shareUrl }) => {
    const toast = useToast();
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>Share Dashboard</h3>
                <p style={{ color: '#64748b', fontSize: '0.9em' }}>Use this link to share a read-only view of the dashboard.</p>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <input type="text" readOnly value={shareUrl} style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9em' }} />
                    <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Copied!'); }} style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Copy</button>
                </div>

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
});

export function ResultsViewer({ formId, onBack, onEditSubmission, initialView, onNavigate, publicToken, isPublic }) {
    const toast = useToast();
    const [rawSubmissions, setRawSubmissions] = useState([]);
    const [formMetadata, setFormMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSidebar, setActiveSidebar] = useState(initialView || 'dashboard');

    // Share state
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

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
        const controller = new AbortController();
        const fetchData = async () => {
            setLoading(true);
            try {
                if (publicToken) {
                    const res = await axios.get(`/api/shared/${publicToken}/view`, { signal: controller.signal });
                    const form = res.data.form;
                    setFormMetadata(form);
                    setRawSubmissions(res.data.submissions);

                    // Apply Theme for Public View
                    if (isPublic && form && form.tenant_theme) {
                        const theme = form.tenant_theme;
                        const root = document.documentElement;
                        const setVar = (key, val) => {
                            if (val) root.style.setProperty(key, val);
                        };
                        if (theme.primaryColor) setVar('--primary-color', theme.primaryColor);
                        if (theme.backgroundColor) setVar('--deep-bg', theme.backgroundColor);
                        if (theme.textColor) setVar('--text-color', theme.textColor);
                        if (theme.buttonBg) setVar('--button-bg', theme.buttonBg);
                        if (theme.buttonText) setVar('--button-text', theme.buttonText);
                        if (theme.bgPattern) setVar('--bg-pattern', theme.bgPattern);
                        if (theme.bgPatternSize) setVar('--bg-pattern-size', theme.bgPatternSize);
                        if (theme.fontFamily) setVar('--font-family', theme.fontFamily);
                        if (theme.borderRadius) setVar('--border-radius', theme.borderRadius);
                    }
                } else {
                    const [formRes, subRes] = await Promise.all([
                        axios.get(`/api/forms/${formId}`),
                        axios.get(`/api/submissions?formId=${formId}`)
                    ]);
                    setFormMetadata(formRes.data);
                    setRawSubmissions(subRes.data);
                }
                setLoading(false);
            } catch (err) {
                console.error("Data load error:", err);
                setLoading(false);
            }
        };
        fetchData();
        return () => controller.abort();
    }, [formId, publicToken]);

    const handleShare = async () => {
        if (shareUrl) {
            setIsShareModalOpen(true);
            return;
        }
        try {
            const res = await axios.post('/api/shared/create', { formId });
            const url = `${window.location.origin}/d/${res.data.token}`;
            setShareUrl(url);
            setIsShareModalOpen(true);
        } catch (err) {
            toast.error('Failed to generate share link: ' + err.message);
        }
    };

    // --- DERIVED DATA & FILTERING ---
    const submissions = useMemo(() => {
        if (!rawSubmissions) return [];
        return rawSubmissions.filter(sub => {
            // Check createdAt or created_at (API returns both sometimes)
            const dateStr = sub.created_at || sub.createdAt;
            if (!dateStr) return true; // Keep if no date available

            const date = new Date(dateStr);

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
                const strData = sub.data ? JSON.stringify(sub.data).toLowerCase() : '';
                const strId = String(sub.id);
                if (!strData.includes(searchLower) && !strId.includes(searchLower)) return false;
            }

            return true;
        }).map(sub => {
            // Enrich with Heuristic Sentiment for filtering/display
            let score = 0;
            let scorable = false;
            const subData = sub.data || {};

            // If backend already computed it, use it (Public API does this)
            if (sub.computed_sentiment) {
                return { ...sub, computedSentiment: sub.computed_sentiment };
            }

            if (subData) {
                Object.entries(subData).forEach(([key, val]) => {
                    // Handle Object Wrappers (SurveyJS sometimes stores {value: 1, text: "1"} or similar)
                    let extractVal = val;
                    if (val && typeof val === 'object' && val.hasOwnProperty('value')) {
                        extractVal = val.value;
                    }
                    const numVal = Number(extractVal);

                    if (!isNaN(numVal)) {
                        const lowerKey = key.toLowerCase();
                        // NPS Logic (0-10)
                        if (lowerKey.includes('nps')) {
                            scorable = true;
                            if (numVal >= 9) score++;
                            else if (numVal <= 6) score--;
                        }
                        // Generic Rating Logic (Likert 1-5 or similar)
                        // If it's a small number, assume low rating
                        else if (numVal <= 10 && numVal >= 0) {
                            // Only count as negative if <= 2 (on 5 scale) or <= 6 (on 10 scale if generic? - risky)
                            // Let's stick to strict low numbers for generic
                            if (numVal <= 2) { scorable = true; score--; }
                            else if (numVal >= 4 && numVal <= 5) { scorable = true; score++; }
                            // Note: We ignore 6-10 on generic to avoid false positives unless we know max.
                        }
                    } else {
                        // Text Analysis (Basic)
                        if (typeof extractVal === 'string') {
                            const lowerVal = extractVal.toLowerCase();
                            if (['detractor', 'bad', 'poor', 'terrible'].some(w => lowerVal.includes(w))) { scorable = true; score--; }
                            if (['promoter', 'good', 'excellent', 'great'].some(w => lowerVal.includes(w))) { scorable = true; score++; }
                        }
                    }
                });
            }
            const sentiment = scorable ? (score > 0 ? 'Positive' : (score < 0 ? 'Negative' : 'Neutral')) : 'Neutral';
            // console.log(`Sub ID ${sub.id} Score: ${score} Sentiment: ${sentiment}`);
            return { ...sub, computedSentiment: sentiment };
        }).filter(sub => {
            if (filters.sentiment === 'all') return true;
            return sub.computedSentiment.toLowerCase() === filters.sentiment.toLowerCase();
        });
    }, [rawSubmissions, filters]);


    // --- AI HANDLER ---
    const handleGenerateInsight = async () => {
        if (isPublic) { toast.warning("AI generation is available to dashboard owners only."); return; }

        setIsGeneratingAI(true);
        try {
            const questions = getQuestions();
            const response = await axios.post('/api/ai/analyze-survey', {
                formId: formMetadata.id,
                surveyTitle: formMetadata.title,
                questions: questions,
                submissions: submissions // Send currently filtered submissions
            });
            setAiAnalysis(response.data);
            // Reload form metadata to make sure we persist the AI state locally if needed, or just set it.
            // setFormMetadata(prev => ({...prev, ai: response.data})); 
        } catch (error) {
            console.error("AI Error:", error);
            toast.error("Failed to generate insights: " + (error.response?.data?.error || error.message));
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- EXPORTS ---
    const handleExportExcel = () => {
        if (!submissions.length) { toast.warning("No data to export."); return; }
        const questions = getQuestions();
        const data = submissions.map(sub => {
            const row = { ID: sub.id, Date: new Date(sub.createdAt || sub.created_at).toLocaleString() };
            questions.forEach(q => row[q.title || q.name] = (sub.data[q.name] && typeof sub.data[q.name] === 'object' ? JSON.stringify(sub.data[q.name]) : sub.data[q.name]));
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Responses");
        XLSX.writeFile(wb, `Survey_Export_${formMetadata.title.substring(0, 10)}.xlsx`);
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
            if (!sub.data) return;
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
        const posPct = Math.round((posCount / total) * 100);
        const negPct = Math.round((negCount / total) * 100);

        // Pre-load AI Analysis if available in metadata and not yet set
        if (formMetadata.ai && !aiAnalysis) {
            setAiAnalysis(formMetadata.ai);
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.5s' }}>
                {/* AI SUMMARY CARD (Top of Dashboard) */}
                <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', borderRadius: '16px', border: '1px solid #bbf7d0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dcfce7' }}>
                        <div>
                            <h2 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                ✨ Management Executive Report
                            </h2>
                            <p style={{ margin: '5px 0 0 0', color: '#15803d', fontSize: '0.9em' }}>
                                Powered by Gemini 2.0 Flash
                            </p>
                        </div>
                        {!aiAnalysis && !isPublic && (
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
                        {isPublic && <div style={{ fontSize: '0.8em', color: '#166534' }}>(Read Only)</div>}
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



    // ... other imports ...

    // ... inside ResultsViewer ...

    // --- DELETE HANDLER ---
    const handleDeleteSubmission = async (id) => {
        try {
            await axios.delete(`/api/submissions/${id}`);
            setRawSubmissions(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Delete failed", err);
            toast.error("Failed to delete submission: " + (err.response?.data?.error || err.message));
        }
    };

    // 2. DATA GRID VIEW
    const renderIndividual = () => {
        const questions = getQuestions();
        return (
            <ResultsGrid
                submissions={submissions}
                questions={questions}
                onEdit={!isPublic ? (subId) => onEditSubmission(subId, formId) : undefined}
                onDelete={!isPublic ? handleDeleteSubmission : undefined}
                readOnly={isPublic}
            />
        );
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ color: '#64748b' }}>Loading results...</div>
    </div>;

    const sidebarItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'individual', icon: '📝', label: 'Responses Grid' },
        ...(!isPublic ? [{ id: 'closeloop', icon: '🔔', label: 'Close the Loop' }] : []),
        { id: 'analytics', icon: '📈', label: 'Analytics' }
    ];

    return (
        <div style={{ background: 'var(--deep-bg, #f8fafc)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} shareUrl={shareUrl} />

            {/* HEADER */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {!isPublic && <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#64748b' }}>←</button>}
                    <div>
                        <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {formMetadata?.title || 'Survey Results'}
                            {isPublic && <span style={{ fontSize: '0.6em', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '10px' }}>Public View</span>}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#64748b' }}>{rawSubmissions.length} Total Submissions</div>
                    </div>
                </div>
                {!isPublic ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleShare} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', color: '#475569' }}>
                            🔗 Share
                        </button>
                        <button onClick={handleExportExcel} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', color: '#475569' }}>
                            📥 Export CSV
                        </button>
                    </div>
                ) : (
                    <div style={{ fontSize: '0.9em', color: '#64748b' }}>Read-only Access</div>
                )}
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
                    {sidebarItems.map(item => (
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
                    {activeSidebar === 'closeloop' && <CloseTheLoop formId={formId} />}
                    {activeSidebar === 'analytics' && <AnalyticsView form={formMetadata} submissions={submissions} onBack={!isPublic ? onBack : undefined} />}
                </div>
            </div>
        </div>
    );
}
