import React, { useMemo, useState } from 'react';
import { QuestionChart } from './analytics/QuestionChart'; // Ensure path is correct
import ExportModal from './ExportModal';
import { EmptyAnalytics } from './common/EmptyState';

export function AnalyticsView({ form, onBack, submissions }) {
    // const [viewMode, setViewMode] = useState('standard'); // Removed dynamic view mode

    const [isSentimentCollapsed, setIsSentimentCollapsed] = useState(false);
    const [allChartsCollapsed, setAllChartsCollapsed] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // Flatten questions from form definition
    const questions = useMemo(() => {
        if (!form?.definition?.pages) return [];
        let qs = [];
        form.definition.pages.forEach(p => {
            if (p.elements) {
                p.elements.forEach(e => {
                    // Filter out html or layout only elements if strictly data questions are needed
                    if (['html', 'image'].includes(e.type)) return;
                    qs.push(e);
                });
            }
        });
        return qs;
    }, [form]);

    // Calculate Overall Sentiment (if not calculated in ResultsViewer, calculate here)
    const sentimentStats = useMemo(() => {
        if (!submissions) return { positive: 0, neutral: 0, negative: 0, total: 0 };
        const stats = { positive: 0, neutral: 0, negative: 0, total: submissions.length };
        submissions.forEach(sub => {
            // Check computedSentiment if exists, else default
            const s = (sub.computedSentiment || 'Neutral').toLowerCase();
            if (s === 'positive') stats.positive++;
            else if (s === 'negative') stats.negative++;
            else stats.neutral++;
        });
        return stats;
    }, [submissions]);

    // Handle Export (open modal)
    const handleOpenExport = () => {
        setIsExportModalOpen(true);
    };

    // Handle no data
    if (!submissions || submissions.length === 0) {
        return (
            <div>
                {onBack && (
                    <button onClick={onBack} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>⬅ Back</button>
                )}
                <EmptyAnalytics message="Share your survey to start collecting responses" />
            </div>
        );
    }



    return (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1em' }}>
                    ⬅ Back to Builder
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => {
                            const newState = !allChartsCollapsed;
                            setAllChartsCollapsed(newState);
                            setIsSentimentCollapsed(newState);
                        }}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            color: '#1e293b',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    >
                        {allChartsCollapsed ? '➕ Expand All Views' : '➖ Collapse All Views'}
                    </button>
                    <button onClick={handleOpenExport} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '500', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📥 Export
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2em', marginBottom: '8px', color: '#1e293b', fontWeight: '700' }}>Analytics Dashboard</h1>
                    <p style={{ color: '#64748b', margin: 0 }}>Deep dive into your survey performance and user sentiment.</p>
                </div>
                <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 20px', borderRadius: '12px', fontWeight: '600' }}>
                    {submissions.length} Total Responses
                </div>
            </div>

            {/* SENTIMENT OVERVIEW CARD */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isSentimentCollapsed ? '0' : '20px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b' }}>🧠 Sentiment Analysis</h3>
                    <button
                        onClick={() => setIsSentimentCollapsed(!isSentimentCollapsed)}
                        style={{
                            padding: '6px 12px',
                            background: 'none',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#64748b',
                            fontSize: '0.9em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                        {isSentimentCollapsed ? '➕ Expand' : '➖ Collapse'}
                    </button>
                </div>
                {!isSentimentCollapsed && (
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', animation: 'fadeIn 0.3s ease-out' }}>
                        {/* Big Score */}
                        <div style={{ flex: 1, minWidth: '200px', textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
                            <div style={{ fontSize: '3em', fontWeight: '800', color: sentimentStats.positive > sentimentStats.negative ? '#059669' : '#b91c1c' }}>
                                {Math.round((sentimentStats.positive / sentimentStats.total) * 100)}%
                            </div>
                            <div style={{ color: '#64748b', fontWeight: '500' }}>Positive Response Rate</div>
                        </div>
                        {/* Bars */}
                        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '15px' }}>
                            <SentimentBar label="Positive" count={sentimentStats.positive} total={sentimentStats.total} color="#059669" bg="#ecfdf5" />
                            <SentimentBar label="Neutral" count={sentimentStats.neutral} total={sentimentStats.total} color="#64748b" bg="#f1f5f9" />
                            <SentimentBar label="Negative" count={sentimentStats.negative} total={sentimentStats.total} color="#dc2626" bg="#fef2f2" />
                        </div>
                    </div>
                )}
            </div>

            {/* QUESTION GRIDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px' }}>
                {questions.map((q, idx) => (
                    <QuestionChart key={idx} question={q} submissions={submissions} forceCollapsed={allChartsCollapsed} />
                ))}
            </div>

            {questions.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8' }}>No questions found in definition.</div>}

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                formId={form?.id}
                formTitle={form?.title}
            />
        </div>
    );
}

function SentimentBar({ label, count, total, color, bg }) {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '80px', fontWeight: '600', color: color }}>{label}</div>
            <div style={{ flex: 1, height: '12px', background: bg, borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 1s ease-out' }}></div>
            </div>
            <div style={{ width: '50px', textAlign: 'right', fontWeight: '600', color: color }}>{pct}%</div>
            <div style={{ width: '40px', textAlign: 'right', color: '#94a3b8', fontSize: '0.9em' }}>({count})</div>
        </div>
    );
}
