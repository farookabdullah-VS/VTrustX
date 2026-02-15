import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity, TrendingUp, AlertTriangle, Clock, Cpu, HardDrive,
    Zap, BarChart3, RefreshCw, Download, Filter
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export function PerformanceDashboard() {
    const [loading, setLoading] = useState(true);
    const [statistics, setStatistics] = useState(null);
    const [slowest, setSlowest] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [systemInfo, setSystemInfo] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [timeRange, setTimeRange] = useState(24); // hours
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [timeRange]);

    const loadData = async () => {
        try {
            setLoading(true);

            const [statsRes, slowestRes, alertsRes, systemRes, timelineRes] = await Promise.all([
                axios.get(`/api/performance/statistics?hours=${timeRange}`),
                axios.get(`/api/performance/slowest?hours=${timeRange}&limit=10`),
                axios.get('/api/performance/alerts?resolved=false&limit=20'),
                axios.get('/api/performance/system'),
                axios.get(`/api/performance/timeline?hours=${timeRange}`)
            ]);

            setStatistics(statsRes.data.data);
            setSlowest(slowestRes.data.data);
            setAlerts(alertsRes.data.data);
            setSystemInfo(systemRes.data.data);
            setTimeline(timelineRes.data.data);
        } catch (error) {
            console.error('Failed to load performance data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleResolveAlert = async (alertId) => {
        try {
            await axios.put(`/api/performance/alerts/${alertId}/resolve`);
            loadData(); // Reload alerts
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Activity size={32} className="animate-spin" style={{ color: '#6366f1' }} />
                <span style={{ marginLeft: '12px', fontSize: '1.1rem', color: '#64748b' }}>
                    Loading performance metrics...
                </span>
            </div>
        );
    }

    const apiStats = statistics?.api || [];
    const dbStats = statistics?.database || [];
    const system = statistics?.system || {};

    // Calculate totals
    const totalRequests = apiStats.reduce((sum, s) => sum + parseInt(s.request_count), 0);
    const totalErrors = apiStats.reduce((sum, s) => sum + parseInt(s.error_count), 0);
    const avgResponseTime = apiStats.length > 0
        ? Math.round(apiStats.reduce((sum, s) => sum + parseFloat(s.avg_duration), 0) / apiStats.length)
        : 0;

    // Status colors
    const getStatusColor = (value, thresholds) => {
        if (value < thresholds.good) return '#10b981';
        if (value < thresholds.warning) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>
                        Performance Monitoring
                    </h1>
                    <p style={{ color: '#64748b', margin: 0 }}>
                        Real-time application performance metrics and alerts
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(parseInt(e.target.value))}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value={1}>Last Hour</option>
                        <option value={6}>Last 6 Hours</option>
                        <option value={24}>Last 24 Hours</option>
                        <option value={72}>Last 3 Days</option>
                        <option value={168}>Last Week</option>
                    </select>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            cursor: refreshing ? 'not-allowed' : 'pointer',
                            opacity: refreshing ? 0.6 : 1
                        }}
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div style={{
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                        <span style={{ fontWeight: '600', color: '#92400e' }}>
                            {alerts.length} Active Performance Alert{alerts.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    {alerts.slice(0, 3).map(alert => (
                        <div key={alert.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderTop: '1px solid #fbbf24'
                        }}>
                            <span style={{ fontSize: '0.9rem', color: '#78350f' }}>
                                {alert.message}
                            </span>
                            <button
                                onClick={() => handleResolveAlert(alert.id)}
                                style={{
                                    padding: '4px 12px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Resolve
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Total Requests */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 8px 0' }}>Total Requests</p>
                            <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                                {totalRequests.toLocaleString()}
                            </h2>
                        </div>
                        <div style={{ background: '#ede9fe', padding: '10px', borderRadius: '8px' }}>
                            <Activity size={24} style={{ color: '#6366f1' }} />
                        </div>
                    </div>
                </div>

                {/* Avg Response Time */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 8px 0' }}>Avg Response Time</p>
                            <h2 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                margin: 0,
                                color: getStatusColor(avgResponseTime, { good: 500, warning: 1000 })
                            }}>
                                {avgResponseTime}ms
                            </h2>
                        </div>
                        <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '8px' }}>
                            <Clock size={24} style={{ color: '#3b82f6' }} />
                        </div>
                    </div>
                </div>

                {/* Error Rate */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 8px 0' }}>Error Rate</p>
                            <h2 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                margin: 0,
                                color: totalErrors > 0 ? '#ef4444' : '#10b981'
                            }}>
                                {totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0}%
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                {totalErrors} errors
                            </p>
                        </div>
                        <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '8px' }}>
                            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
                        </div>
                    </div>
                </div>

                {/* System Memory */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 8px 0' }}>Memory Usage</p>
                            <h2 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                margin: 0,
                                color: getStatusColor(systemInfo?.memory?.heapUsagePercent || 0, { good: 70, warning: 85 })
                            }}>
                                {systemInfo?.memory?.heapUsagePercent || 0}%
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                {systemInfo?.memory?.heapUsed || 0} / {systemInfo?.memory?.heapTotal || 0} MB
                            </p>
                        </div>
                        <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '8px' }}>
                            <HardDrive size={24} style={{ color: '#10b981' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Slowest Endpoints */}
            <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
                    Slowest API Endpoints
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontWeight: '500', fontSize: '0.85rem' }}>
                                    Endpoint
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontWeight: '500', fontSize: '0.85rem' }}>
                                    Method
                                </th>
                                <th style={{ textAlign: 'right', padding: '12px', color: '#64748b', fontWeight: '500', fontSize: '0.85rem' }}>
                                    Avg Duration
                                </th>
                                <th style={{ textAlign: 'right', padding: '12px', color: '#64748b', fontWeight: '500', fontSize: '0.85rem' }}>
                                    Max Duration
                                </th>
                                <th style={{ textAlign: 'right', padding: '12px', color: '#64748b', fontWeight: '500', fontSize: '0.85rem' }}>
                                    Requests
                                </th>
                                <th style={{ textAlign: 'right', padding: '12px', color: '#64748b', fontWeight: '500', fontSize: '0.85rem' }}>
                                    Errors
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {slowest.map((endpoint, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px', fontSize: '0.9rem', color: '#0f172a', fontFamily: 'monospace' }}>
                                        {endpoint.endpoint}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            background: '#f1f5f9',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            color: '#475569'
                                        }}>
                                            {endpoint.method}
                                        </span>
                                    </td>
                                    <td style={{
                                        padding: '12px',
                                        textAlign: 'right',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: getStatusColor(parseFloat(endpoint.avg_duration), { good: 500, warning: 1000 })
                                    }}>
                                        {Math.round(parseFloat(endpoint.avg_duration))}ms
                                    </td>
                                    <td style={{
                                        padding: '12px',
                                        textAlign: 'right',
                                        fontSize: '0.9rem',
                                        color: '#64748b'
                                    }}>
                                        {Math.round(parseFloat(endpoint.max_duration))}ms
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '0.9rem', color: '#64748b' }}>
                                        {parseInt(endpoint.request_count).toLocaleString()}
                                    </td>
                                    <td style={{
                                        padding: '12px',
                                        textAlign: 'right',
                                        fontSize: '0.9rem',
                                        color: parseInt(endpoint.error_count) > 0 ? '#ef4444' : '#64748b'
                                    }}>
                                        {endpoint.error_count}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* System Information */}
            {systemInfo && (
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
                        System Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 4px 0' }}>Uptime</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>
                                {systemInfo.uptime?.formatted || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 4px 0' }}>Node Version</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>
                                {systemInfo.nodeVersion || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 4px 0' }}>Platform</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>
                                {systemInfo.platform || 'N/A'} ({systemInfo.arch || 'N/A'})
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 4px 0' }}>Heap Size</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>
                                {systemInfo.memory?.heapTotal || 0} MB
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PerformanceDashboard;
