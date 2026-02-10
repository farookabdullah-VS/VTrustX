import React, { useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, BarChart3, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444' };

export function CJMAnalytics({ mapData }) {
    const analytics = useMemo(() => {
        if (!mapData || !mapData.stages || !mapData.sections) return null;

        const stages = mapData.stages;
        const sections = mapData.sections;

        // Emotion / Sentiment trend by stage
        const sentimentByStage = stages.map(stage => {
            const sentimentSections = sections.filter(s => s.type === 'sentiment_graph');
            let avgSentiment = 0;
            let count = 0;
            sentimentSections.forEach(sec => {
                const cell = sec.cells?.[stage.id];
                if (cell && cell.value !== undefined) {
                    avgSentiment += Number(cell.value) || 0;
                    count++;
                }
            });
            return {
                stage: stage.name,
                sentiment: count > 0 ? Math.round(avgSentiment / count) : 50
            };
        });

        // Pain points by stage
        const painByStage = stages.map(stage => {
            const painSections = sections.filter(s => s.type === 'pain_point');
            let maxSeverity = 0;
            let painTexts = [];
            painSections.forEach(sec => {
                const cell = sec.cells?.[stage.id];
                if (cell) {
                    const sev = Number(cell.severity) || 0;
                    if (sev > maxSeverity) maxSeverity = sev;
                    if (cell.value) painTexts.push(cell.value);
                }
            });
            return { stage: stage.name, severity: maxSeverity, count: painTexts.length };
        });

        // Touchpoints by stage
        const touchpointsByStage = stages.map(stage => {
            const tpSections = sections.filter(s => s.type === 'touchpoints');
            let tpCount = 0;
            tpSections.forEach(sec => {
                const cell = sec.cells?.[stage.id];
                if (cell && Array.isArray(cell.items)) {
                    tpCount += cell.items.length;
                }
            });
            return { stage: stage.name, touchpoints: tpCount };
        });

        // Channel distribution (from touchpoint types)
        const channelCounts = {};
        sections.filter(s => s.type === 'touchpoints').forEach(sec => {
            stages.forEach(stage => {
                const cell = sec.cells?.[stage.id];
                if (cell && Array.isArray(cell.items)) {
                    cell.items.forEach(tp => {
                        const cat = tp.category || 'Other';
                        channelCounts[cat] = (channelCounts[cat] || 0) + 1;
                    });
                }
            });
        });
        const channelData = Object.entries(channelCounts).map(([name, value]) => ({ name, value }));

        // KPI summary
        const kpis = [];
        sections.filter(s => s.type === 'kpi').forEach(sec => {
            stages.forEach(stage => {
                const cell = sec.cells?.[stage.id];
                if (cell && cell.value) {
                    kpis.push({
                        stage: stage.name,
                        label: cell.label || sec.title || 'KPI',
                        value: cell.value,
                        trend: cell.trend || 'flat'
                    });
                }
            });
        });

        // Opportunities summary
        const opportunities = [];
        sections.filter(s => s.type === 'opportunity').forEach(sec => {
            stages.forEach(stage => {
                const cell = sec.cells?.[stage.id];
                if (cell && cell.value) {
                    opportunities.push({
                        stage: stage.name,
                        text: cell.value,
                        impact: Number(cell.impact) || 0
                    });
                }
            });
        });
        opportunities.sort((a, b) => b.impact - a.impact);

        // Cell completeness
        let totalCells = stages.length * sections.length;
        let filledCells = 0;
        sections.forEach(sec => {
            stages.forEach(stage => {
                const cell = sec.cells?.[stage.id];
                if (cell && (cell.value || cell.items?.length || cell.steps?.length)) filledCells++;
            });
        });
        const completeness = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

        return { sentimentByStage, painByStage, touchpointsByStage, channelData, kpis, opportunities, completeness, totalCells, filledCells };
    }, [mapData]);

    if (!analytics) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No data to analyze</div>;
    }

    const TrendIcon = ({ trend }) => {
        if (trend === 'up') return <TrendingUp size={14} style={{ color: '#10b981' }} />;
        if (trend === 'down') return <TrendingDown size={14} style={{ color: '#ef4444' }} />;
        return <Minus size={14} style={{ color: '#94a3b8' }} />;
    };

    return (
        <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={22} /> Journey Analytics
            </h2>

            {/* Completeness bar */}
            <div style={{
                background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Map Completeness</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>{analytics.completeness}%</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', width: `${analytics.completeness}%`,
                        background: analytics.completeness > 75 ? '#10b981' : analytics.completeness > 40 ? '#f59e0b' : '#ef4444',
                        borderRadius: '4px', transition: 'width 0.5s ease'
                    }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                    {analytics.filledCells} of {analytics.totalCells} cells populated
                </div>
            </div>

            {/* Charts grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Emotion trend */}
                <div style={{
                    background: 'white', borderRadius: '12px', padding: '16px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={14} /> Emotion Trend
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analytics.sentimentByStage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="sentiment" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Pain point heatmap */}
                <div style={{
                    background: 'white', borderRadius: '12px', padding: '16px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} /> Pain Points by Stage
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analytics.painByStage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="severity" name="Severity">
                                {analytics.painByStage.map((entry, i) => (
                                    <Cell key={i} fill={entry.severity >= 4 ? '#ef4444' : entry.severity >= 2 ? '#f59e0b' : '#10b981'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Touchpoints bar */}
                <div style={{
                    background: 'white', borderRadius: '12px', padding: '16px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={14} /> Touchpoints by Stage
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analytics.touchpointsByStage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="touchpoints" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Channel distribution pie */}
                <div style={{
                    background: 'white', borderRadius: '12px', padding: '16px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                        Channel Distribution
                    </h4>
                    {analytics.channelData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={analytics.channelData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {analytics.channelData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                            No touchpoint data yet
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Summary */}
            {analytics.kpis.length > 0 && (
                <div style={{
                    background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>KPI Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                        {analytics.kpis.map((kpi, i) => (
                            <div key={i} style={{
                                padding: '12px', background: '#f8fafc', borderRadius: '8px',
                                border: '1px solid #e2e8f0', textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3b82f6' }}>{kpi.value}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>{kpi.label}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <TrendIcon trend={kpi.trend} />
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{kpi.stage}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Opportunities */}
            {analytics.opportunities.length > 0 && (
                <div style={{
                    background: 'white', borderRadius: '12px', padding: '16px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Top Opportunities</h4>
                    {analytics.opportunities.slice(0, 5).map((opp, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 10px', borderRadius: '6px', marginBottom: '6px',
                            background: '#fefce8', border: '1px solid #fef08a'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: '#334155' }}>{opp.text}</div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{opp.stage}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                    <span key={s} style={{ color: s <= opp.impact ? '#eab308' : '#e2e8f0', fontSize: '0.9rem' }}>★</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
