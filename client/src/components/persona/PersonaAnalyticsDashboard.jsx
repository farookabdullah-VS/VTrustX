import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
    TrendingUp, Users, Target, Activity, Calendar, Award,
    RefreshCw, Download, Loader2
} from 'lucide-react';

/**
 * PersonaAnalyticsDashboard
 *
 * Comprehensive analytics dashboard for persona performance tracking.
 * Displays match statistics, coverage analysis, and evolution trends.
 */
export function PersonaAnalyticsDashboard({ personaId }) {
    const [analytics, setAnalytics] = useState(null);
    const [evolution, setEvolution] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [timeRange, setTimeRange] = useState(30); // days
    const [error, setError] = useState(null);

    useEffect(() => {
        if (personaId) {
            fetchData();
        }
    }, [personaId, timeRange]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([fetchAnalytics(), fetchEvolution()]);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            setError(err.response?.data?.error || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await axios.get(`/api/cx-personas/${personaId}/analytics`);
            setAnalytics(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            throw error;
        }
    };

    const fetchEvolution = async () => {
        try {
            const response = await axios.get(`/api/cx-personas/${personaId}/evolution?days=${timeRange}`);
            setEvolution(response.data);
        } catch (error) {
            console.error('Failed to fetch evolution:', error);
            throw error;
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await axios.post(`/api/cx-personas/${personaId}/sync`);
            await fetchData(); // Refresh data after sync
        } catch (error) {
            console.error('Failed to sync:', error);
            setError('Failed to sync persona data');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '100px',
                color: '#64748b',
                gap: '15px'
            }}>
                <Loader2 size={32} className="animate-spin" />
                <div>Loading analytics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '100px',
                color: '#ef4444',
                gap: '15px'
            }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{error}</div>
                <button
                    onClick={fetchData}
                    style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        border: '1px solid #fca5a5',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

    // Prepare match distribution data for pie chart
    const matchDistribution = analytics?.match_statistics?.distribution
        ? [
            {
                name: 'Strong Match (≥70%)',
                value: analytics.match_statistics.distribution.strong,
                color: COLORS[0],
                percentage: analytics.match_statistics.total_responses > 0
                    ? ((analytics.match_statistics.distribution.strong / analytics.match_statistics.total_responses) * 100).toFixed(1)
                    : 0
            },
            {
                name: 'Moderate Match (50-69%)',
                value: analytics.match_statistics.distribution.moderate,
                color: COLORS[1],
                percentage: analytics.match_statistics.total_responses > 0
                    ? ((analytics.match_statistics.distribution.moderate / analytics.match_statistics.total_responses) * 100).toFixed(1)
                    : 0
            },
            {
                name: 'Weak Match (<50%)',
                value: analytics.match_statistics.distribution.weak,
                color: COLORS[2],
                percentage: analytics.match_statistics.total_responses > 0
                    ? ((analytics.match_statistics.distribution.weak / analytics.match_statistics.total_responses) * 100).toFixed(1)
                    : 0
            }
        ].filter(item => item.value > 0)
        : [];

    // Prepare evolution data for line chart
    const evolutionData = evolution.map(snap => ({
        date: new Date(snap.snapshot_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        }),
        satisfaction: parseFloat(snap.metrics.satisfaction),
        loyalty: parseFloat(snap.metrics.loyalty),
        trust: parseFloat(snap.metrics.trust),
        effort: parseFloat(snap.metrics.effort),
        responses: snap.response_count
    }));

    // Custom tooltip for pie chart
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'white',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>{payload[0].name}</div>
                    <div style={{ color: payload[0].payload.color }}>
                        Count: {payload[0].value} ({payload[0].payload.percentage}%)
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ padding: '20px', fontFamily: "'Outfit', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px'
            }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 5px 0' }}>
                        Persona Performance Analytics
                    </h2>
                    <p style={{ color: '#64748b', margin: 0 }}>
                        {analytics?.persona_name || 'Unknown Persona'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                        value={timeRange}
                        onChange={e => setTimeRange(parseInt(e.target.value))}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            cursor: syncing ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: syncing ? 0.6 : 1
                        }}
                    >
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <KPICard
                    icon={<Users size={24} />}
                    title="Total Responses"
                    value={analytics?.match_statistics?.total_responses || 0}
                    color="#3b82f6"
                />
                <KPICard
                    icon={<Target size={24} />}
                    title="Avg Match Score"
                    value={`${analytics?.match_statistics?.avg_match_score || 0}%`}
                    subtitle={`Best: ${analytics?.match_statistics?.best_match_score || 0}%`}
                    color="#10b981"
                />
                <KPICard
                    icon={<TrendingUp size={24} />}
                    title="Coverage"
                    value={`${analytics?.coverage?.percentage || 0}%`}
                    subtitle={`${analytics?.coverage?.persona_customers || 0} of ${analytics?.coverage?.total_customers || 0} customers`}
                    color="#8b5cf6"
                />
                <KPICard
                    icon={<Award size={24} />}
                    title="Strong Matches"
                    value={analytics?.match_statistics?.distribution?.strong || 0}
                    subtitle="≥ 70% match score"
                    color="#10b981"
                />
            </div>

            {/* Charts Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '30px'
            }}>
                {/* Match Distribution Pie Chart */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Activity size={20} />
                        Match Score Distribution
                    </h3>
                    {matchDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={matchDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percentage }) => `${percentage}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {matchDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{
                            height: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8'
                        }}>
                            No match data available
                        </div>
                    )}
                </div>

                {/* Response Count Bar Chart */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Calendar size={20} />
                        Response Volume Over Time
                    </h3>
                    {evolutionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                                <YAxis style={{ fontSize: '12px' }} />
                                <Tooltip />
                                <Bar dataKey="responses" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{
                            height: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8'
                        }}>
                            No historical data available
                        </div>
                    )}
                </div>
            </div>

            {/* Persona Metrics Evolution Line Chart */}
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
            }}>
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <TrendingUp size={20} />
                    Persona Metrics Evolution
                </h3>
                {evolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={evolutionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                            <YAxis style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="satisfaction"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Satisfaction"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="loyalty"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Loyalty (NPS)"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="trust"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                name="Trust"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="effort"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                name="Effort"
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{
                        height: '350px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        gap: '10px'
                    }}>
                        <div>No evolution data available</div>
                        <div style={{ fontSize: '0.9rem' }}>
                            Data will appear once responses are matched to this persona
                        </div>
                    </div>
                )}
            </div>

            {/* Latest Metrics Summary */}
            {analytics?.latest_data && (
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginTop: '20px'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '15px'
                    }}>
                        Latest Snapshot ({new Date(analytics.latest_data.snapshot_date).toLocaleDateString()})
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '15px'
                    }}>
                        <MetricBadge
                            label="Satisfaction"
                            value={analytics.latest_data.metrics.satisfaction}
                            color="#10b981"
                        />
                        <MetricBadge
                            label="Loyalty (NPS)"
                            value={analytics.latest_data.metrics.loyalty}
                            color="#3b82f6"
                        />
                        <MetricBadge
                            label="Trust"
                            value={analytics.latest_data.metrics.trust}
                            color="#8b5cf6"
                        />
                        <MetricBadge
                            label="Effort"
                            value={analytics.latest_data.metrics.effort}
                            color="#f59e0b"
                        />
                        <MetricBadge
                            label="Responses"
                            value={analytics.latest_data.response_count}
                            color="#64748b"
                            isCount
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// KPI Card Component
function KPICard({ icon, title, value, subtitle, color }) {
    return (
        <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            gap: '15px'
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${color}15`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.5px'
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {value}
                </div>
                {subtitle && (
                    <div style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        marginTop: '4px'
                    }}>
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}

// Metric Badge Component
function MetricBadge({ label, value, color, isCount = false }) {
    return (
        <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: `${color}10`,
            border: `1px solid ${color}30`
        }}>
            <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginBottom: '4px',
                fontWeight: '600'
            }}>
                {label}
            </div>
            <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: color
            }}>
                {isCount ? value : `${value}%`}
            </div>
        </div>
    );
}
