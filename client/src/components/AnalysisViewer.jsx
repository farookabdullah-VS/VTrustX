import React from 'react';

export function AnalysisViewer({ analysis }) {
    if (!analysis) return null;

    const { provider, summary, insights, timestamp } = analysis;

    // AI Service might return `insights` as array (Mock) or string (OpenAI)
    // We need to handle both.

    const renderInsights = () => {
        if (Array.isArray(insights)) {
            return (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {insights.map((insight, idx) => (
                        <div key={idx} style={{
                            padding: '10px',
                            borderRadius: '6px',
                            background: insight.value === 'negative' ? '#fef2f2' : '#f0fdf4',
                            border: `1px solid ${insight.value === 'negative' ? '#fecaca' : '#bbf7d0'}`,
                            minWidth: '200px'
                        }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#555' }}>
                                {insight.type.toUpperCase()}: {insight.field}
                            </div>
                            <div style={{ marginTop: '5px' }}>{insight.summary}</div>
                        </div>
                    ))}
                </div>
            );
        } else if (typeof insights === 'string') {
            return (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {insights}
                </div>
            );
        }
        return JSON.stringify(insights);
    };

    return (
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ✨ AI Analysis
                    <span style={{ fontSize: '0.7em', fontWeight: 'normal', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '12px' }}>
                        {provider}
                    </span>
                </h3>
                <span style={{ fontSize: '0.8em', color: '#888' }}>
                    {new Date(timestamp).toLocaleString()}
                </span>
            </div>

            {summary && <div style={{ marginBottom: '15px', fontStyle: 'italic', color: '#555' }}>{summary}</div>}

            {renderInsights()}
        </div>
    );
}
