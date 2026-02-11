import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const FONT = 'var(--font-family, "Outfit", "Google Sans", system-ui, sans-serif)';
const RADIUS = 'var(--border-radius, 24px)';
const TRANSITION = 'var(--transition-fast, 0.2s cubic-bezier(0.2, 0, 0, 1))';

const BTN_RESET = {
    backgroundImage: 'none', textTransform: 'none', letterSpacing: 'normal',
    boxShadow: 'none', fontFamily: FONT, fontSize: 'inherit', fontWeight: 'inherit',
    padding: 0, border: 'none', borderRadius: 0, cursor: 'pointer', background: 'none',
};

export function CrmDashboard({ user }) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language?.startsWith('ar');

    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [trends, setTrends] = useState([]);
    const [agents, setAgents] = useState([]);
    const [slaData, setSlaData] = useState(null);
    const [loading, setLoading] = useState(true);

    // AI Insights
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // Agent sort
    const [agentSort, setAgentSort] = useState('total_tickets');
    const [agentSortDir, setAgentSortDir] = useState('desc');

    useEffect(() => {
        const fetch = async () => {
            try {
                const [statsRes, trendsRes, agentsRes, slaRes] = await Promise.all([
                    axios.get('/api/reports/crm-stats'),
                    axios.get('/api/reports/crm-trends'),
                    axios.get('/api/reports/agent-performance').catch(() => ({ data: [] })),
                    axios.get('/api/reports/sla-compliance').catch(() => ({ data: null })),
                ]);
                setStats(statsRes.data);
                setTrends(trendsRes.data);
                setAgents(agentsRes.data);
                setSlaData(slaRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const handleAiChat = async (prompt) => {
        const text = prompt || aiPrompt;
        if (!text.trim()) return;
        setAiLoading(true);
        setAiResponse('');
        try {
            const res = await axios.post('/api/agent-chat/platform-agent', { message: text });
            setAiResponse(res.data.response || res.data.message || JSON.stringify(res.data));
        } catch (err) {
            setAiResponse('Failed to get AI response. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleAgentSort = (col) => {
        if (agentSort === col) setAgentSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setAgentSort(col); setAgentSortDir('desc'); }
    };

    const sortedAgents = [...agents].sort((a, b) => {
        const va = parseFloat(a[agentSort]) || 0;
        const vb = parseFloat(b[agentSort]) || 0;
        return agentSortDir === 'asc' ? va - vb : vb - va;
    });

    // Styles
    const glassCard = {
        background: 'var(--glass-bg, rgba(255,255,255,0.85))',
        backdropFilter: 'blur(var(--glass-blur, 24px))',
        WebkitBackdropFilter: 'blur(var(--glass-blur, 24px))',
        border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
        borderRadius: `calc(${RADIUS} * 0.67)`,
        padding: '24px',
        transition: TRANSITION,
    };

    const kpiLabel = { fontSize: '0.78em', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px' };
    const kpiValue = { fontSize: '2.2em', fontWeight: 800, marginTop: 8 };

    if (loading) {
        return (
            <div style={{ padding: 30, fontFamily: FONT, direction: isRtl ? 'rtl' : 'ltr', maxWidth: 1400, margin: '0 auto' }}>
                <div style={{ ...glassCard, textAlign: 'center', padding: 60 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.1em' }}>Loading analytics...</div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div style={{ padding: 30, fontFamily: FONT, direction: isRtl ? 'rtl' : 'ltr', maxWidth: 1400, margin: '0 auto' }}>
                <div style={{ ...glassCard, textAlign: 'center', padding: 60 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.1em' }}>No report data available</div>
                </div>
            </div>
        );
    }

    const totalTickets = Object.values(stats.stats).reduce((a, b) => a + b, 0);
    const openCount = (stats.stats.open || 0) + (stats.stats.new || 0) + (stats.stats.pending || 0);
    const avgResolution = Number(stats.performance?.avgResolutionUrl || 0).toFixed(1);
    const complianceRate = stats.sla?.complianceRate || 100;
    const breaches = stats.sla?.breached || 0;

    // SVG Trend Chart renderer
    const renderTrendChart = () => {
        if (!trends || trends.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No trend data</div>;
        const max = Math.max(...trends.map(t => t.count), 5);
        const points = trends.map((t, i) => {
            const x = trends.length > 1 ? (i / (trends.length - 1)) * 100 : 50;
            const y = 100 - (t.count / max) * 90 - 5;
            return `${x},${y}`;
        }).join(' ');

        return (
            <div style={{ position: 'relative' }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 200, overflow: 'visible' }}>
                    {[0, 25, 50, 75, 100].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--glass-border, rgba(0,0,0,0.06))" strokeWidth="0.3" />)}
                    <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    <polygon points={`0,100 ${points} 100,100`} fill="url(#areaGrad)" />
                    <polyline points={points} fill="none" stroke="var(--primary-color)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                    {trends.map((t, i) => {
                        const x = trends.length > 1 ? (i / (trends.length - 1)) * 100 : 50;
                        const y = 100 - (t.count / max) * 90 - 5;
                        return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--primary-color)" vectorEffect="non-scaling-stroke"><title>{new Date(t.date).toLocaleDateString()}: {t.count}</title></circle>;
                    })}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.78em', color: 'var(--text-muted)' }}>
                    <span>{trends[0] ? new Date(trends[0].date).toLocaleDateString() : ''}</span>
                    <span>{trends.length > 0 ? new Date(trends[trends.length - 1].date).toLocaleDateString() : ''}</span>
                </div>
            </div>
        );
    };

    // SLA Compliance bar chart
    const renderSlaChart = () => {
        if (!slaData?.byWeek || slaData.byWeek.length === 0) return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9em' }}>No SLA data</div>;
        const maxVal = Math.max(...slaData.byWeek.map(w => w.total), 5);
        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
                    {slaData.byWeek.map((w, i) => {
                        const h = (w.total / maxVal) * 100;
                        const metH = w.total > 0 ? ((w.met / w.total) * h) : 0;
                        return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                <div style={{ width: '100%', maxWidth: 40, position: 'relative', height: `${h}%`, borderRadius: `calc(${RADIUS} * 0.15)`, overflow: 'hidden', background: 'color-mix(in srgb, #ef4444 20%, transparent)' }} title={`Total: ${w.total}, Met: ${w.met}, Breached: ${w.breached}`}>
                                    <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${w.total > 0 ? (w.met / w.total) * 100 : 100}%`, background: 'var(--primary-color)', borderRadius: `calc(${RADIUS} * 0.15)`, transition: 'height 0.3s ease' }} />
                                </div>
                                <span style={{ fontSize: '0.65em', color: 'var(--text-muted)', marginTop: 6, whiteSpace: 'nowrap' }}>
                                    W{i + 1}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: '0.78em', color: 'var(--text-muted)' }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--primary-color)', marginInlineEnd: 4, verticalAlign: 'middle' }} />Met SLA</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'color-mix(in srgb, #ef4444 30%, transparent)', marginInlineEnd: 4, verticalAlign: 'middle' }} />Breached</span>
                </div>
            </div>
        );
    };

    // Simple markdown rendering
    const renderMarkdown = (text) => {
        if (!text) return null;
        const lines = text.split('\n');
        return lines.map((line, i) => {
            if (line.startsWith('### ')) return <h4 key={i} style={{ margin: '12px 0 6px', fontWeight: 700, color: 'var(--text-color)' }}>{line.slice(4)}</h4>;
            if (line.startsWith('## ')) return <h3 key={i} style={{ margin: '14px 0 8px', fontWeight: 800, color: 'var(--text-color)' }}>{line.slice(3)}</h3>;
            if (line.startsWith('# ')) return <h2 key={i} style={{ margin: '16px 0 10px', fontWeight: 800, color: 'var(--text-color)' }}>{line.slice(2)}</h2>;
            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} style={{ marginInlineStart: 16, marginBottom: 4, fontSize: '0.92em', lineHeight: 1.6 }}>{line.slice(2)}</li>;
            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ fontWeight: 700, margin: '6px 0' }}>{line.slice(2, -2)}</p>;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} style={{ margin: '4px 0', fontSize: '0.92em', lineHeight: 1.6, color: 'var(--text-color)' }}>{line}</p>;
        });
    };

    const quickInsights = [
        { label: 'Ticket Trends Analysis', prompt: 'Analyze our ticket volume trends over the past month. What patterns do you see? Are there any concerning spikes or recurring issues?' },
        { label: 'SLA Performance Review', prompt: 'Review our SLA compliance performance. Which areas are we meeting targets and where are we falling short? Suggest improvements.' },
        { label: 'Agent Workload Balance', prompt: 'Analyze our agent workload distribution. Are tickets distributed evenly? Which agents might be overloaded or underutilized?' },
    ];

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '10px 20px', fontFamily: FONT, direction: isRtl ? 'rtl' : 'ltr', color: 'var(--text-color, #1a1c1e)' }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: '1.8em', fontWeight: 800, color: 'var(--text-color)' }}>{t('dashboard.analytics', 'Analytics Dashboard')}</h1>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.95em' }}>{t('dashboard.analyticsSubtitle', 'Performance metrics and ticket intelligence')}</p>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--glass-border, rgba(0,0,0,0.06))' }}>
                {['overview', 'ai-insights'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        ...BTN_RESET, padding: '12px 28px', fontWeight: activeTab === tab ? 700 : 500, fontSize: '0.95em',
                        color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-muted)',
                        borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                        marginBottom: -2, transition: TRANSITION,
                    }}>
                        {tab === 'overview' ? t('dashboard.overview', 'Overview') : t('dashboard.aiInsights', 'AI Insights')}
                    </button>
                ))}
            </div>

            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === 'overview' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                        {[
                            { label: t('dashboard.kpi.total', 'Total Tickets'), value: totalTickets, color: 'var(--primary-color)' },
                            { label: t('dashboard.kpi.open', 'Open'), value: openCount, color: '#3b82f6' },
                            { label: t('dashboard.kpi.avgRes', 'Avg Resolution'), value: `${avgResolution}h`, color: '#f59e0b' },
                            { label: t('dashboard.kpi.sla', 'SLA Compliance'), value: `${complianceRate}%`, color: '#22c55e' },
                            { label: t('dashboard.kpi.breaches', 'Breaches'), value: breaches, color: '#ef4444' },
                        ].map((kpi, i) => (
                            <div key={i} style={glassCard}>
                                <div style={kpiLabel}>{kpi.label}</div>
                                <div style={{ ...kpiValue, color: kpi.color }}>{kpi.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                        {/* Ticket Volume Trend */}
                        <div style={glassCard}>
                            <h3 style={{ margin: '0 0 16px', fontWeight: 700, color: 'var(--text-color)' }}>{t('dashboard.volumeTrend', 'Ticket Volume Trend')}</h3>
                            {renderTrendChart()}
                        </div>

                        {/* Status Distribution */}
                        <div style={glassCard}>
                            <h3 style={{ margin: '0 0 16px', fontWeight: 700, color: 'var(--text-color)' }}>{t('dashboard.statusDist', 'Status Distribution')}</h3>
                            {Object.entries(stats.stats).map(([status, count]) => {
                                const pct = totalTickets > 0 ? (count / totalTickets) * 100 : 0;
                                const colors = { new: '#3b82f6', open: '#22c55e', pending: '#f59e0b', resolved: '#64748b', closed: '#0f172a' };
                                return (
                                    <div key={status} style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.88em' }}>
                                            <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-color)' }}>{status}</span>
                                            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{count} ({pct.toFixed(0)}%)</span>
                                        </div>
                                        <div style={{ width: '100%', height: 8, background: 'var(--input-bg, #f0f2f5)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: colors[status] || 'var(--primary-color)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority Breakdown */}
                    {stats.byPriority && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                            {['urgent', 'high', 'medium', 'low'].map(p => {
                                const count = stats.byPriority[p] || 0;
                                const colors = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8' };
                                return (
                                    <div key={p} style={{ ...glassCard, borderInlineStart: `4px solid ${colors[p]}` }}>
                                        <div style={{ ...kpiLabel, textTransform: 'capitalize' }}>{p}</div>
                                        <div style={{ fontSize: '1.8em', fontWeight: 800, color: colors[p], marginTop: 6 }}>{count}</div>
                                        <div style={{ fontSize: '0.78em', color: 'var(--text-muted)', marginTop: 4 }}>
                                            {totalTickets > 0 ? `${((count / totalTickets) * 100).toFixed(0)}%` : '0%'} of total
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* SLA Compliance & Agent Performance */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* SLA Compliance Trend */}
                        <div style={glassCard}>
                            <h3 style={{ margin: '0 0 16px', fontWeight: 700, color: 'var(--text-color)' }}>{t('dashboard.slaTrend', 'SLA Compliance Trend')}</h3>
                            {renderSlaChart()}
                        </div>

                        {/* Agent Performance Table */}
                        <div style={glassCard}>
                            <h3 style={{ margin: '0 0 16px', fontWeight: 700, color: 'var(--text-color)' }}>{t('dashboard.agentPerf', 'Agent Performance')}</h3>
                            {sortedAgents.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: '0.9em' }}>No agent data available</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--glass-border, rgba(0,0,0,0.08))' }}>
                                                {[
                                                    { key: 'username', label: 'Agent' },
                                                    { key: 'total_tickets', label: 'Assigned' },
                                                    { key: 'resolved', label: 'Resolved' },
                                                    { key: 'avg_resolution_hours', label: 'Avg Time' },
                                                    { key: 'sla_breaches', label: 'SLA %' },
                                                ].map(col => (
                                                    <th key={col.key} onClick={() => handleAgentSort(col.key)} style={{
                                                        padding: '10px 12px', textAlign: isRtl ? 'right' : 'left', fontWeight: 700, fontSize: '0.85em',
                                                        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
                                                        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                                                    }}>
                                                        {col.label}
                                                        {agentSort === col.key && <span style={{ marginInlineStart: 4 }}>{agentSortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedAgents.map(agent => {
                                                const slaRate = parseInt(agent.total_tickets) > 0 ? Math.round(((parseInt(agent.total_tickets) - parseInt(agent.sla_breaches)) / parseInt(agent.total_tickets)) * 100) : 100;
                                                return (
                                                    <tr key={agent.user_id} style={{ borderBottom: '1px solid var(--glass-border, rgba(0,0,0,0.06))' }}>
                                                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: `color-mix(in srgb, var(--primary-color) 15%, transparent)`, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7em', fontWeight: 700 }}>
                                                                    {(agent.username || 'A')[0].toUpperCase()}
                                                                </div>
                                                                {agent.username}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 12px' }}>{agent.total_tickets}</td>
                                                        <td style={{ padding: '10px 12px' }}>{agent.resolved}</td>
                                                        <td style={{ padding: '10px 12px' }}>{agent.avg_resolution_hours ? `${agent.avg_resolution_hours}h` : '-'}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <span style={{ fontWeight: 700, color: slaRate >= 90 ? '#22c55e' : slaRate >= 70 ? '#f59e0b' : '#ef4444' }}>
                                                                {slaRate}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== AI INSIGHTS TAB ===== */}
            {activeTab === 'ai-insights' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* Quick Insight Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        {quickInsights.map((insight, i) => (
                            <div
                                key={i}
                                onClick={() => { setAiPrompt(insight.prompt); handleAiChat(insight.prompt); }}
                                style={{
                                    ...glassCard, cursor: 'pointer',
                                    borderInlineStart: '4px solid var(--primary-color)',
                                    transition: TRANSITION,
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ fontWeight: 700, fontSize: '0.95em', color: 'var(--text-color)', marginBottom: 8 }}>{insight.label}</div>
                                <div style={{ fontSize: '0.82em', color: 'var(--text-muted)', lineHeight: 1.5 }}>{insight.prompt.substring(0, 100)}...</div>
                            </div>
                        ))}
                    </div>

                    {/* Custom AI Chat */}
                    <div style={glassCard}>
                        <h3 style={{ margin: '0 0 16px', fontWeight: 700, color: 'var(--text-color)' }}>{t('dashboard.aiChat', 'Ask AI About Your Data')}</h3>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            <input
                                value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAiChat(); }}
                                placeholder={t('dashboard.aiPlaceholder', 'Ask a question about your ticketing data...')}
                                style={{
                                    flex: 1, background: 'var(--input-bg, #f0f2f5)',
                                    border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
                                    borderRadius: `calc(${RADIUS} * 0.33)`,
                                    padding: '12px 16px', fontSize: '0.92em', color: 'var(--text-color)', fontFamily: FONT, outline: 'none',
                                }}
                            />
                            <button onClick={() => handleAiChat()} disabled={aiLoading || !aiPrompt.trim()} style={{
                                ...BTN_RESET, background: 'var(--primary-color)', color: '#fff',
                                padding: '12px 28px', borderRadius: `calc(${RADIUS} * 0.33)`,
                                fontWeight: 700, fontSize: '0.9em',
                                opacity: (aiLoading || !aiPrompt.trim()) ? 0.5 : 1,
                            }}>
                                {aiLoading ? t('dashboard.aiThinking', 'Thinking...') : t('dashboard.aiAsk', 'Ask')}
                            </button>
                        </div>

                        {/* Response */}
                        {(aiResponse || aiLoading) && (
                            <div style={{
                                background: 'var(--input-bg, #f8fafc)',
                                borderRadius: `calc(${RADIUS} * 0.5)`,
                                padding: '20px 24px',
                                border: '1px solid var(--glass-border, rgba(0,0,0,0.06))',
                                minHeight: 100,
                            }}>
                                {aiLoading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--primary-color)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                                        <span style={{ fontSize: '0.9em' }}>Analyzing your data...</span>
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-color)', lineHeight: 1.7 }}>
                                        {renderMarkdown(aiResponse)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
