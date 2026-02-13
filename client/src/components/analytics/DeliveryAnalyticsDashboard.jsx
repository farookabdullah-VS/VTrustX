import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../axiosConfig';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, FunnelChart, Funnel,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Mail, MessageSquare, MessageCircle, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Radio } from 'lucide-react';
import { useAnalyticsStream } from '../../hooks/useAnalyticsStream';

const COLORS = {
    email: '#3B82F6',
    sms: '#10B981',
    whatsapp: '#8B5CF6',
    delivered: '#22C55E',
    failed: '#EF4444',
    opened: '#F59E0B',
    clicked: '#06B6D4'
};

export function DeliveryAnalyticsDashboard() {
    const [overview, setOverview] = useState(null);
    const [funnel, setFunnel] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('7d');
    const [selectedChannel, setSelectedChannel] = useState('all');

    // Real-time analytics updates via SSE
    const handleAnalyticsUpdate = useCallback((data) => {
        console.log('[Analytics] Real-time update received:', data);

        // Refresh data when message sent or status updated
        if (data.type === 'message_sent' || data.type === 'message_status_updated') {
            fetchAnalytics();
        }
    }, []);

    const { connected, error: sseError, reconnect } = useAnalyticsStream(handleAnalyticsUpdate);

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange, selectedChannel]);

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
            else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
            else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

            const dateParams = {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            };

            // Fetch overview
            const overviewRes = await axios.get('/api/analytics/delivery/overview', { params: dateParams });
            setOverview(overviewRes.data);

            // Fetch funnel
            const funnelRes = await axios.get('/api/analytics/delivery/funnel', { params: dateParams });
            setFunnel(funnelRes.data.funnel);

            // Fetch timeline
            const timelineRes = await axios.get('/api/analytics/delivery/timeline', {
                params: {
                    ...dateParams,
                    channel: selectedChannel,
                    interval: dateRange === '7d' ? 'day' : dateRange === '30d' ? 'day' : 'week'
                }
            });
            setTimeline(timelineRes.data.timeline);

            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch delivery analytics:', err);
            setError('Failed to load analytics');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Loading delivery analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <AlertCircle size={48} color="var(--error)" />
                <p style={{ marginTop: '20px', color: 'var(--error)' }}>{error}</p>
                <button onClick={fetchAnalytics} style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-color)' }}>
                        Delivery Performance
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                        Track message delivery, engagement, and response rates across all channels
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Live Indicator */}
                    {connected && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#10B98115',
                            border: '2px solid #10B981',
                            borderRadius: '8px',
                            color: '#10B981'
                        }}>
                            <Radio size={16} />
                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Live</span>
                        </div>
                    )}

                    {sseError && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#EF444415',
                            border: '2px solid #EF4444',
                            borderRadius: '8px',
                            color: '#EF4444',
                            cursor: 'pointer'
                        }}
                        onClick={reconnect}
                        title="Click to reconnect"
                        >
                            <AlertCircle size={16} />
                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Offline</span>
                        </div>
                    )}

                    {/* Date Range Selector */}
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            border: '2px solid var(--border-color)',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>

                    {/* Channel Filter */}
                    <select
                        value={selectedChannel}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            border: '2px solid var(--border-color)',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}
                    >
                        <option value="all">All Channels</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                    </select>
                </div>
            </div>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard
                    icon={<Mail size={24} />}
                    title="Total Messages"
                    value={overview?.overview.total || 0}
                    color="#3B82F6"
                />
                <StatCard
                    icon={<CheckCircle size={24} />}
                    title="Delivered"
                    value={overview?.overview.delivered || 0}
                    subtitle={`${overview?.overview.deliveryRate || 0}% delivery rate`}
                    color="#22C55E"
                />
                <StatCard
                    icon={<TrendingUp size={24} />}
                    title="Response Rate"
                    value={funnel ? `${funnel.rates.completionRate}%` : '0%'}
                    subtitle={`${funnel?.completed || 0} responses`}
                    color="#F59E0B"
                />
                <StatCard
                    icon={<AlertCircle size={24} />}
                    title="Failed"
                    value={overview?.overview.failed || 0}
                    subtitle={`${overview?.overview.total > 0 ? ((overview.overview.failed / overview.overview.total) * 100).toFixed(1) : 0}% failure rate`}
                    color="#EF4444"
                />
            </div>

            {/* Channel Comparison */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '20px', color: 'var(--text-color)' }}>
                    Channel Performance
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                        {
                            name: 'Email',
                            delivered: parseInt(overview?.byChannel.email.delivered || 0),
                            failed: parseInt(overview?.byChannel.email.failed || 0),
                            total: parseInt(overview?.byChannel.email.total || 0)
                        },
                        {
                            name: 'SMS',
                            delivered: parseInt(overview?.byChannel.sms.delivered || 0),
                            failed: parseInt(overview?.byChannel.sms.failed || 0),
                            total: parseInt(overview?.byChannel.sms.total || 0)
                        },
                        {
                            name: 'WhatsApp',
                            delivered: parseInt(overview?.byChannel.whatsapp.delivered || 0),
                            failed: parseInt(overview?.byChannel.whatsapp.failed || 0),
                            total: parseInt(overview?.byChannel.whatsapp.total || 0)
                        }
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" />
                        <YAxis stroke="#6B7280" />
                        <Tooltip
                            contentStyle={{
                                background: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                padding: '12px'
                            }}
                        />
                        <Legend />
                        <Bar dataKey="delivered" fill={COLORS.delivered} name="Delivered" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="failed" fill={COLORS.failed} name="Failed" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px', marginBottom: '30px' }}>
                {/* Response Funnel */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '20px', color: 'var(--text-color)' }}>
                        Response Funnel
                    </h2>
                    {funnel && (
                        <div>
                            <FunnelStage
                                label="Viewed"
                                value={funnel.viewed}
                                percentage={100}
                                color="#3B82F6"
                            />
                            <FunnelStage
                                label="Started"
                                value={funnel.started}
                                percentage={parseFloat(funnel.rates.startRate)}
                                color="#8B5CF6"
                            />
                            <FunnelStage
                                label="Completed"
                                value={funnel.completed}
                                percentage={parseFloat(funnel.rates.completionRate)}
                                color="#22C55E"
                            />
                            <FunnelStage
                                label="Abandoned"
                                value={funnel.abandoned}
                                percentage={parseFloat(funnel.rates.abandonRate)}
                                color="#EF4444"
                                isNegative
                            />
                        </div>
                    )}
                </div>

                {/* Channel Health */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '20px', color: 'var(--text-color)' }}>
                        Channel Health
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <ChannelHealth
                            icon={<Mail size={20} />}
                            name="Email"
                            delivered={parseInt(overview?.byChannel.email.delivered || 0)}
                            total={parseInt(overview?.byChannel.email.total || 1)}
                            opened={parseInt(overview?.byChannel.email.opened || 0)}
                            bounced={parseInt(overview?.byChannel.email.bounced || 0)}
                            color={COLORS.email}
                        />
                        <ChannelHealth
                            icon={<MessageSquare size={20} />}
                            name="SMS"
                            delivered={parseInt(overview?.byChannel.sms.delivered || 0)}
                            total={parseInt(overview?.byChannel.sms.total || 1)}
                            color={COLORS.sms}
                        />
                        <ChannelHealth
                            icon={<MessageCircle size={20} />}
                            name="WhatsApp"
                            delivered={parseInt(overview?.byChannel.whatsapp.delivered || 0)}
                            total={parseInt(overview?.byChannel.whatsapp.total || 1)}
                            read={parseInt(overview?.byChannel.whatsapp.read || 0)}
                            color={COLORS.whatsapp}
                        />
                    </div>
                </div>
            </div>

            {/* Timeline Chart */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '20px', color: 'var(--text-color)' }}>
                    Delivery Timeline
                </h2>
                {timeline.length > 0 && (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={formatTimelineData(timeline)}>
                            <defs>
                                {timeline.map((channelData, idx) => (
                                    <linearGradient key={idx} id={`color${channelData.channel}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS[channelData.channel]} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS[channelData.channel]} stopOpacity={0.1} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis
                                dataKey="date"
                                stroke="#6B7280"
                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            />
                            <YAxis stroke="#6B7280" />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    padding: '12px'
                                }}
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <Legend />
                            {timeline.map((channelData) => (
                                <Area
                                    key={channelData.channel}
                                    type="monotone"
                                    dataKey={`${channelData.channel}_delivered`}
                                    stroke={COLORS[channelData.channel]}
                                    fillOpacity={1}
                                    fill={`url(#color${channelData.channel})`}
                                    name={`${channelData.channel.charAt(0).toUpperCase() + channelData.channel.slice(1)} Delivered`}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
                {timeline.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
                        No timeline data available for the selected period
                    </p>
                )}
            </div>
        </div>
    );
}

// Helper Components

function StatCard({ icon, title, value, subtitle, color }) {
    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '2px solid transparent',
            transition: 'all 0.2s',
            cursor: 'default'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color
                }}>
                    {icon}
                </div>
                <div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{title}</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-color)' }}>{value}</p>
                </div>
            </div>
            {subtitle && (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{subtitle}</p>
            )}
        </div>
    );
}

function FunnelStage({ label, value, percentage, color, isNegative }) {
    const width = Math.max(percentage, 10); // Minimum 10% for visibility

    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-color)' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    {value} ({percentage.toFixed(1)}%)
                </span>
            </div>
            <div style={{
                width: '100%',
                height: '40px',
                background: '#F3F4F6',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    width: `${width}%`,
                    height: '100%',
                    background: color,
                    borderRadius: '8px',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600'
                }}>
                    {percentage > 15 && `${percentage.toFixed(1)}%`}
                </div>
            </div>
        </div>
    );
}

function ChannelHealth({ icon, name, delivered, total, opened, read, bounced, color }) {
    const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;
    const openRate = opened && delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : null;
    const readRate = read && delivered > 0 ? ((read / delivered) * 100).toFixed(1) : null;
    const bounceRate = bounced && total > 0 ? ((bounced / total) * 100).toFixed(1) : null;

    const getHealthStatus = (rate) => {
        if (rate >= 95) return { label: 'Excellent', color: '#22C55E' };
        if (rate >= 85) return { label: 'Good', color: '#10B981' };
        if (rate >= 70) return { label: 'Fair', color: '#F59E0B' };
        return { label: 'Poor', color: '#EF4444' };
    };

    const health = getHealthStatus(parseFloat(deliveryRate));

    return (
        <div style={{
            padding: '16px',
            border: `2px solid ${color}20`,
            borderRadius: '12px',
            background: `${color}05`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color }}>{icon}</div>
                    <span style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-color)' }}>{name}</span>
                </div>
                <span style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    background: `${health.color}15`,
                    color: health.color
                }}>
                    {health.label}
                </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Metric label="Delivery" value={`${deliveryRate}%`} />
                {openRate && <Metric label="Open" value={`${openRate}%`} />}
                {readRate && <Metric label="Read" value={`${readRate}%`} />}
                {bounceRate && <Metric label="Bounce" value={`${bounceRate}%`} isNegative />}
            </div>
        </div>
    );
}

function Metric({ label, value, isNegative }) {
    return (
        <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
            <p style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: '700',
                color: isNegative ? COLORS.failed : COLORS.delivered
            }}>
                {value}
            </p>
        </div>
    );
}

// Helper Functions

function formatTimelineData(timeline) {
    // Merge all channel data by date
    const dateMap = new Map();

    timeline.forEach((channelData) => {
        channelData.data.forEach((point) => {
            const dateKey = new Date(point.period).toISOString().split('T')[0];
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, { date: dateKey });
            }
            const entry = dateMap.get(dateKey);
            entry[`${channelData.channel}_delivered`] = parseInt(point.delivered);
            entry[`${channelData.channel}_total`] = parseInt(point.total);
        });
    });

    return Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export default DeliveryAnalyticsDashboard;
