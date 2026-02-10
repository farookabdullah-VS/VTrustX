import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export function CrmDashboard() {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [stats, setStats] = useState(null);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, trendsRes] = await Promise.all([
                    axios.get('/api/reports/crm-stats'),
                    axios.get('/api/reports/crm-trends')
                ]);
                setStats(statsRes.data);
                setTrends(trendsRes.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!stats) return <div>No Report Data</div>;

    // Helper for SVG Chart
    const renderTrendChart = () => {
        if (!trends || trends.length === 0) return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No Trend Data</div>;

        const max = Math.max(...trends.map(t => t.count), 5);
        const points = trends.map((t, i) => {
            const x = (i / (trends.length - 1)) * 100;
            const y = 100 - (t.count / max) * 100;
            return `${x},${y}`;
        }).join(' ');

        return (
            <div style={{ height: '200px', position: 'relative', marginTop: '20px' }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {/* Grid */}
                    <line x1="0" y1="0" x2="100" y2="0" stroke="var(--input-border)" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="var(--input-border)" strokeWidth="0.5" />
                    <line x1="0" y1="100" x2="100" y2="100" stroke="var(--input-border)" strokeWidth="0.5" />

                    {/* Line */}
                    <polyline points={points} fill="none" stroke="var(--primary-color)" strokeWidth="2" vectorEffect="non-scaling-stroke" />

                    {/* Area (Optional) */}
                    <polygon points={`0,100 ${points} 100,100`} fill="var(--primary-color)" fillOpacity="0.1" />

                    {/* Points */}
                    {trends.map((t, i) => {
                        const x = (i / (trends.length - 1)) * 100;
                        const y = 100 - (t.count / max) * 100;
                        return (
                            <circle key={i} cx={x} cy={y} r="2" fill="var(--primary-color)" vectorEffect="non-scaling-stroke">
                                <title>{new Date(t.date).toLocaleDateString()}: {t.count}</title>
                            </circle>
                        );
                    })}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.8em', color: 'var(--text-muted)' }}>
                    <span>{new Date(trends[0].date).toLocaleDateString()}</span>
                    <span>{new Date(trends[trends.length - 1].date).toLocaleDateString()}</span>
                </div>
            </div>
        );
    };

    const cardStyle = {
        background: 'var(--card-bg)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        border: '1px solid var(--input-border)',
        flex: 1,
        minWidth: '200px'
    };

    const totalTickets = Object.values(stats.stats).reduce((a, b) => a + b, 0);

    return (
        <div style={{ padding: '30px', fontFamily: "'Outfit', sans-serif", direction: isRtl ? 'rtl' : 'ltr', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '10px', fontSize: '2em', color: 'var(--text-color)' }}>Analytics Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Performance metrics and ticket volume.</p>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '40px' }}>
                <div style={cardStyle}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.85em' }}>TOTAL TICKETS</div>
                    <div style={{ fontSize: '2.5em', fontWeight: '800', color: 'var(--text-color)', marginTop: '10px' }}>{totalTickets}</div>
                </div>

                <div style={cardStyle}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.85em' }}>OPEN</div>
                    <div style={{ fontSize: '2.5em', fontWeight: '800', color: '#3b82f6', marginTop: '10px' }}>{stats.stats.open || 0}</div>
                </div>

                <div style={cardStyle}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.85em' }}>RESOLVED/CLOSED</div>
                    <div style={{ fontSize: '2.5em', fontWeight: '800', color: '#22c55e', marginTop: '10px' }}>
                        {(stats.stats.resolved || 0) + (stats.stats.closed || 0)}
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.85em' }}>AVG RESOLUTION</div>
                    <div style={{ fontSize: '2.5em', fontWeight: '800', color: '#f59e0b', marginTop: '10px' }}>
                        {Number(stats.performance.avgResolutionUrl || 0).toFixed(1)} <span style={{ fontSize: '0.4em' }}>hrs</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Main Chart */}
                <div style={{ ...cardStyle }}>
                    <h3 style={{ margin: 0, color: 'var(--text-color)' }}>Ticket Volume</h3>
                    {renderTrendChart()}
                </div>

                {/* Status Distribution */}
                <div style={{ ...cardStyle }}>
                    <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-color)' }}>Status Distribution</h3>
                    <div>
                        {Object.entries(stats.stats).map(([status, count]) => {
                            const percent = totalTickets > 0 ? (count / totalTickets) * 100 : 0;
                            const colors = { new: '#ef4444', open: '#3b82f6', pending: '#f59e0b', resolved: '#22c55e', closed: '#64748b' };
                            return (
                                <div key={status} style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-color)' }}>
                                        <span style={{ textTransform: 'capitalize' }}>{status}</span>
                                        <span style={{ fontWeight: 'bold' }}>{count}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${percent}%`, height: '100%', background: colors[status] || 'var(--input-border)', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
