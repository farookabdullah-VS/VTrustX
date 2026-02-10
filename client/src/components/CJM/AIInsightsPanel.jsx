import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, X, Loader2, AlertTriangle, Lightbulb, FileText, RefreshCw, TrendingUp } from 'lucide-react';

const INSIGHT_TYPES = [
    { id: 'executive_summary', label: 'Executive Summary', icon: FileText, color: '#3b82f6' },
    { id: 'pain_points', label: 'Pain Point Analysis', icon: AlertTriangle, color: '#ef4444' },
    { id: 'opportunities', label: 'Improvement Opportunities', icon: Lightbulb, color: '#f59e0b' },
    { id: 'recommendations', label: 'Strategic Recommendations', icon: TrendingUp, color: '#10b981' },
];

function buildMapSummary(mapData) {
    const stages = mapData.stages || [];
    const sections = mapData.sections || [];
    let summary = `Journey Map: "${mapData.project_name}"\n\n`;
    summary += `Stages: ${stages.map(s => s.name).join(' → ')}\n\n`;

    sections.forEach(sec => {
        summary += `--- ${sec.title || sec.type} (${sec.type}) ---\n`;
        stages.forEach(stage => {
            const cell = sec.cells?.[stage.id];
            if (!cell) return;
            let text = '';
            if (cell.value !== undefined) text = String(cell.value);
            if (cell.thought) text = `Thinks: "${cell.thought}" Feels: ${cell.feeling || ''}`;
            if (cell.items && Array.isArray(cell.items)) {
                text = cell.items.map(i => typeof i === 'string' ? i : (i.text || i.label || JSON.stringify(i))).join(', ');
            }
            if (cell.channels) text = cell.channels.map(c => c.label || c.id).join(', ');
            if (cell.steps) text = cell.steps.join(' → ');
            if (cell.note) text += ` (${cell.note})`;
            if (text) summary += `  ${stage.name}: ${text}\n`;
        });
        summary += '\n';
    });

    return summary;
}

const PROMPTS = {
    executive_summary: (summary) => `You are a CX strategy expert. Based on this customer journey map data, write a concise executive summary (3-4 paragraphs) covering:
1. Overview of the journey and key stages
2. Overall customer sentiment and experience quality
3. Critical moments of truth
4. High-level strategic implications

Journey Map Data:
${summary}

Write a professional executive summary:`,

    pain_points: (summary) => `You are a CX analyst. Analyze this customer journey map and identify ALL pain points, frustrations, and friction points. For each pain point:
- Describe the issue
- Identify which stage it occurs in
- Rate severity (Critical / High / Medium / Low)
- Suggest a quick fix

Format as a numbered list.

Journey Map Data:
${summary}

Pain Point Analysis:`,

    opportunities: (summary) => `You are a CX strategist. Analyze this customer journey map and identify improvement opportunities. For each opportunity:
- Describe the opportunity
- Which stage it applies to
- Expected impact (High / Medium / Low)
- Effort required (High / Medium / Low)
- Priority score (impact vs effort)

Prioritize quick wins first. Format as a numbered list.

Journey Map Data:
${summary}

Improvement Opportunities:`,

    recommendations: (summary) => `You are a senior CX consultant. Based on this customer journey map, provide strategic recommendations. Include:
1. Top 3 immediate actions (quick wins)
2. Top 3 medium-term improvements (1-3 months)
3. Top 3 long-term strategic initiatives (3-12 months)
4. Key metrics to track for each recommendation

Be specific and actionable.

Journey Map Data:
${summary}

Strategic Recommendations:`
};

export function AIInsightsPanel({ mapData, onClose }) {
    const [activeInsight, setActiveInsight] = useState(null);
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(null);

    const generateInsight = async (type) => {
        setLoading(type);
        setActiveInsight(type);

        const summary = buildMapSummary(mapData);
        const prompt = PROMPTS[type](summary);

        try {
            const res = await axios.post('/api/ai/generate', { prompt });
            const text = res.data.text || res.data.definition || '';
            setResults(prev => ({ ...prev, [type]: typeof text === 'string' ? text : JSON.stringify(text) }));
        } catch (e) {
            setResults(prev => ({ ...prev, [type]: `Error: ${e.response?.data?.error || e.message}` }));
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="cjm-panel" style={{
            width: '380px', borderLeft: '1px solid #e2e8f0', background: 'white',
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{
                padding: '16px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(135deg, #faf5ff, #f0f9ff)'
            }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} style={{ color: '#8b5cf6' }} />
                    AI Insights
                </h3>
                <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={18} />
                </button>
            </div>

            {/* Insight type buttons */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                {INSIGHT_TYPES.map(type => (
                    <button
                        key={type.id}
                        onClick={() => results[type.id] ? setActiveInsight(type.id) : generateInsight(type.id)}
                        disabled={loading === type.id}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                            padding: '10px 12px', marginBottom: '6px', borderRadius: '8px',
                            border: activeInsight === type.id ? `1px solid ${type.color}` : '1px solid #e2e8f0',
                            background: activeInsight === type.id ? `${type.color}08` : 'white',
                            cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left',
                            transition: 'all 0.15s'
                        }}
                    >
                        <type.icon size={16} style={{ color: type.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
                            {type.label}
                        </span>
                        {loading === type.id && <Loader2 size={14} className="ai-spinner" />}
                        {results[type.id] && loading !== type.id && (
                            <button
                                onClick={(e) => { e.stopPropagation(); generateInsight(type.id); }}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                                title="Regenerate"
                            >
                                <RefreshCw size={12} />
                            </button>
                        )}
                    </button>
                ))}
            </div>

            {/* Results area */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {!activeInsight && !loading && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '0.85rem' }}>
                        <Sparkles size={32} style={{ color: '#e2e8f0', marginBottom: '12px' }} />
                        <div>Click an insight type above to generate AI-powered analysis of your journey map</div>
                    </div>
                )}

                {loading && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: '10px', padding: '40px 0', color: '#8b5cf6'
                    }}>
                        <Loader2 size={24} className="ai-spinner" />
                        <span style={{ fontSize: '0.85rem' }}>Analyzing your journey map...</span>
                    </div>
                )}

                {activeInsight && results[activeInsight] && !loading && (
                    <div>
                        <div style={{
                            fontSize: '0.8rem', fontWeight: 600, color: '#64748b',
                            textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '12px'
                        }}>
                            {INSIGHT_TYPES.find(t => t.id === activeInsight)?.label}
                        </div>
                        <div style={{
                            fontSize: '0.85rem', color: '#334155', lineHeight: 1.7,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                        }}>
                            {results[activeInsight]}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
