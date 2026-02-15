import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart3, Map, AlertTriangle, Zap, TrendingUp, Activity } from 'lucide-react';
import { DashboardSkeleton } from '../common/Skeleton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function CJMAnalyticsDashboard() {
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMaps();
    }, []);

    const loadMaps = async () => {
        try {
            const res = await axios.get('/api/cjm');
            setMaps(res.data || []);
        } catch (e) {
            console.error("Failed to load maps:", e);
        } finally {
            setLoading(false);
        }
    };

    const crossMapAnalytics = useMemo(() => {
        if (!maps.length) return null;

        const mapsWithData = maps.filter(m => m.data && m.data.stages && m.data.sections);
        if (!mapsWithData.length) return null;

        // Aggregate pain points across all maps
        const painByMap = mapsWithData.map(map => {
            let totalPain = 0;
            let painCount = 0;
            (map.data.sections || []).filter(s => s.type === 'pain_point').forEach(sec => {
                (map.data.stages || []).forEach(stage => {
                    const cell = sec.cells?.[stage.id];
                    if (cell && cell.severity) {
                        totalPain += Number(cell.severity) || 0;
                        painCount++;
                    }
                });
            });
            return {
                name: map.title || 'Untitled',
                avgPain: painCount > 0 ? Math.round((totalPain / painCount) * 10) / 10 : 0,
                painCount
            };
        });

        // Aggregate sentiment across all maps
        const sentimentByMap = mapsWithData.map(map => {
            let totalSent = 0;
            let sentCount = 0;
            (map.data.sections || []).filter(s => s.type === 'sentiment_graph').forEach(sec => {
                (map.data.stages || []).forEach(stage => {
                    const cell = sec.cells?.[stage.id];
                    if (cell && cell.value !== undefined) {
                        totalSent += Number(cell.value) || 0;
                        sentCount++;
                    }
                });
            });
            return {
                name: map.title || 'Untitled',
                avgSentiment: sentCount > 0 ? Math.round(totalSent / sentCount) : 0
            };
        });

        // Count touchpoints across all maps
        const tpCounts = {};
        mapsWithData.forEach(map => {
            (map.data.sections || []).filter(s => s.type === 'touchpoints').forEach(sec => {
                (map.data.stages || []).forEach(stage => {
                    const cell = sec.cells?.[stage.id];
                    if (cell && Array.isArray(cell.items)) {
                        cell.items.forEach(tp => {
                            const cat = tp.category || tp.label || 'Other';
                            tpCounts[cat] = (tpCounts[cat] || 0) + 1;
                        });
                    }
                });
            });
        });
        const topTouchpoints = Object.entries(tpCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Stage frequency (most common stage names)
        const stageNames = {};
        mapsWithData.forEach(map => {
            (map.data.stages || []).forEach(s => {
                stageNames[s.name] = (stageNames[s.name] || 0) + 1;
            });
        });
        const commonStages = Object.entries(stageNames)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        // Status distribution
        const statusCounts = { draft: 0, published: 0, archived: 0 };
        maps.forEach(m => {
            const s = m.status || 'draft';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });
        const statusData = Object.entries(statusCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

        // Completeness across maps
        const completenessData = mapsWithData.map(map => {
            const stages = map.data.stages || [];
            const sections = map.data.sections || [];
            const total = stages.length * sections.length;
            let filled = 0;
            sections.forEach(sec => {
                stages.forEach(stage => {
                    const cell = sec.cells?.[stage.id];
                    if (cell && (cell.value || cell.items?.length || cell.steps?.length)) filled++;
                });
            });
            return {
                name: (map.title || 'Untitled').substring(0, 15),
                completeness: total > 0 ? Math.round((filled / total) * 100) : 0
            };
        });

        return { painByMap, sentimentByMap, topTouchpoints, commonStages, statusData, completenessData, totalMaps: maps.length };
    }, [maps]);

    if (loading) {
        return (
            <div role="status" aria-live="polite" style={{ padding: '60px' }}>
                <span className="sr-only">Loading journey map analytics</span>
                <DashboardSkeleton />
            </div>
        );
    }

    if (!crossMapAnalytics) {
        return (
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <Map size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ color: '#64748b', fontWeight: 600 }}>No Journey Maps Yet</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Create journey maps to see cross-map analytics here.</p>
            </div>
        );
    }

    const STATUS_COLORS = { draft: '#f59e0b', published: '#10b981', archived: '#94a3b8' };

    return (
        <div style={{ padding: '24px', overflow: 'auto', height: '100%', background: '#f8fafc' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart3 size={24} /> Journey Analytics
                </h2>
                <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: '#64748b' }}>
                    Cross-map insights across {crossMapAnalytics.totalMaps} journey map{crossMapAnalytics.totalMaps !== 1 ? 's' : ''}
                </p>

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total Maps', value: crossMapAnalytics.totalMaps, icon: <Map size={20} />, color: '#3b82f6' },
                        { label: 'Avg Sentiment', value: crossMapAnalytics.sentimentByMap.length > 0 ? Math.round(crossMapAnalytics.sentimentByMap.reduce((a, b) => a + b.avgSentiment, 0) / crossMapAnalytics.sentimentByMap.length) : 0, icon: <Activity size={20} />, color: '#10b981' },
                        { label: 'Touchpoint Types', value: crossMapAnalytics.topTouchpoints.length, icon: <Zap size={20} />, color: '#8b5cf6' },
                        { label: 'Pain Points', value: crossMapAnalytics.painByMap.reduce((a, b) => a + b.painCount, 0), icon: <AlertTriangle size={20} />, color: '#ef4444' }
                    ].map((card, i) => (
                        <div key={i} style={{
                            background: 'white', borderRadius: '12px', padding: '20px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{card.label}</span>
                                <span style={{ color: card.color }}>{card.icon}</span>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    {/* Sentiment comparison */}
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '20px',
                        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                            Average Sentiment by Map
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={crossMapAnalytics.sentimentByMap}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="avgSentiment" name="Avg Sentiment" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pain comparison */}
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '20px',
                        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                            Average Pain Severity by Map
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={crossMapAnalytics.painByMap}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="avgPain" name="Avg Severity">
                                    {crossMapAnalytics.painByMap.map((entry, i) => (
                                        <Cell key={i} fill={entry.avgPain >= 3.5 ? '#ef4444' : entry.avgPain >= 2 ? '#f59e0b' : '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Status distribution */}
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '20px',
                        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                            Map Status Distribution
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={crossMapAnalytics.statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {crossMapAnalytics.statusData.map((entry, i) => (
                                        <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Completeness */}
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '20px',
                        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                            Map Completeness
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={crossMapAnalytics.completenessData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                                <Tooltip formatter={(v) => `${v}%`} />
                                <Bar dataKey="completeness" name="Completeness">
                                    {crossMapAnalytics.completenessData.map((entry, i) => (
                                        <Cell key={i} fill={entry.completeness > 75 ? '#10b981' : entry.completeness > 40 ? '#f59e0b' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bottom tables */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Top touchpoints */}
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '20px',
                        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                            Most Common Touchpoints
                        </h4>
                        {crossMapAnalytics.topTouchpoints.length > 0 ? (
                            crossMapAnalytics.topTouchpoints.map((tp, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 0', borderBottom: i < crossMapAnalytics.topTouchpoints.length - 1 ? '1px solid #f1f5f9' : 'none'
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: '#334155' }}>{tp.name}</span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '10px',
                                        background: '#f1f5f9', fontSize: '0.75rem', fontWeight: 600, color: '#64748b'
                                    }}>{tp.count}</span>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No touchpoint data</div>
                        )}
                    </div>

                    {/* Common stages */}
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '20px',
                        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                            Most Used Stage Names
                        </h4>
                        {crossMapAnalytics.commonStages.map((stage, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 0', borderBottom: i < crossMapAnalytics.commonStages.length - 1 ? '1px solid #f1f5f9' : 'none'
                            }}>
                                <span style={{ fontSize: '0.85rem', color: '#334155' }}>{stage.name}</span>
                                <span style={{
                                    padding: '2px 8px', borderRadius: '10px',
                                    background: '#eff6ff', fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6'
                                }}>{stage.count} maps</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
