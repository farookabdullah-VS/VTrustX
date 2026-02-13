import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Smile, Frown, Meh, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

const SENTIMENT_COLORS = {
    positive: '#10B981',
    neutral: '#F59E0B',
    negative: '#EF4444'
};

const EMOTION_COLORS = {
    happy: '#10B981',
    satisfied: '#22C55E',
    neutral: '#F59E0B',
    confused: '#F97316',
    disappointed: '#EF4444',
    frustrated: '#DC2626',
    angry: '#991B1B'
};

const EMOTION_ICONS = {
    happy: '😊',
    satisfied: '😌',
    neutral: '😐',
    confused: '😕',
    disappointed: '😞',
    frustrated: '😤',
    angry: '😠'
};

export function SentimentDashboard({ formId }) {
    const [overview, setOverview] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [byQuestion, setByQuestion] = useState([]);
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('30d');

    useEffect(() => {
        fetchSentimentAnalytics();
    }, [formId, dateRange]);

    const fetchSentimentAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
            else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
            else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

            const params = {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            };

            if (formId) {
                params.formId = formId;
            }

            // Fetch all sentiment analytics in parallel
            const [overviewRes, timelineRes, byQuestionRes, themesRes] = await Promise.all([
                axios.get('/api/analytics/sentiment/overview', { params }),
                axios.get('/api/analytics/sentiment/timeline', {
                    params: {
                        ...params,
                        interval: dateRange === '7d' ? 'day' : dateRange === '30d' ? 'day' : 'week'
                    }
                }),
                axios.get('/api/analytics/sentiment/by-question', { params }),
                axios.get('/api/analytics/sentiment/themes', { params: { ...params, limit: 10 } })
            ]);

            setOverview(overviewRes.data);
            setTimeline(timelineRes.data.timeline || []);
            setByQuestion(byQuestionRes.data.fields || []);
            setThemes(themesRes.data.themes || []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch sentiment analytics:', err);
            setError(err.response?.data?.error || 'Failed to load sentiment analytics');
            setLoading(false);
        }
    };

    const getSentimentIcon = (score) => {
        if (score >= 0.3) return <Smile size={20} color={SENTIMENT_COLORS.positive} />;
        if (score <= -0.3) return <Frown size={20} color={SENTIMENT_COLORS.negative} />;
        return <Meh size={20} color={SENTIMENT_COLORS.neutral} />;
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Loading sentiment analysis...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <AlertTriangle size={48} color="var(--error)" />
                <p style={{ marginTop: '20px', color: 'var(--error)' }}>{error}</p>
            </div>
        );
    }

    if (!overview || overview.analyzedCount === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <Meh size={48} color="var(--text-muted)" />
                <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>
                    No sentiment analysis data available yet.
                </p>
                <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    Sentiment analysis will be performed automatically on new submissions with text responses.
                </p>
            </div>
        );
    }

    const distributionData = [
        { name: 'Positive', value: overview.distribution.positive, color: SENTIMENT_COLORS.positive },
        { name: 'Neutral', value: overview.distribution.neutral, color: SENTIMENT_COLORS.neutral },
        { name: 'Negative', value: overview.distribution.negative, color: SENTIMENT_COLORS.negative }
    ];

    const avgScore = parseFloat(overview.avgScore);

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Sentiment Analysis</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['7d', '30d', '90d'].map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                background: dateRange === range ? 'var(--primary)' : 'white',
                                color: dateRange === range ? 'white' : 'var(--text)',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Last {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Average Sentiment */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {getSentimentIcon(avgScore)}
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Avg Sentiment</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
                                {avgScore.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {avgScore >= 0.3 ? 'Positive overall' : avgScore <= -0.3 ? 'Negative overall' : 'Neutral overall'}
                    </div>
                </div>

                {/* Positive */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Smile size={20} color={SENTIMENT_COLORS.positive} />
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Positive</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: SENTIMENT_COLORS.positive }}>
                                {overview.distribution.positive}
                            </p>
                        </div>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {overview.analyzedCount > 0 ?
                            `${((overview.distribution.positive / overview.analyzedCount) * 100).toFixed(1)}%` :
                            '0%'
                        } of responses
                    </div>
                </div>

                {/* Neutral */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Meh size={20} color={SENTIMENT_COLORS.neutral} />
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Neutral</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: SENTIMENT_COLORS.neutral }}>
                                {overview.distribution.neutral}
                            </p>
                        </div>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {overview.analyzedCount > 0 ?
                            `${((overview.distribution.neutral / overview.analyzedCount) * 100).toFixed(1)}%` :
                            '0%'
                        } of responses
                    </div>
                </div>

                {/* Negative */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Frown size={20} color={SENTIMENT_COLORS.negative} />
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Negative</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: SENTIMENT_COLORS.negative }}>
                                {overview.distribution.negative}
                            </p>
                        </div>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {overview.analyzedCount > 0 ?
                            `${((overview.distribution.negative / overview.analyzedCount) * 100).toFixed(1)}%` :
                            '0%'
                        } of responses
                    </div>
                </div>

                {/* Flagged */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle size={20} color="#EF4444" />
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Flagged</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: '#EF4444' }}>
                                {overview.flaggedCount}
                            </p>
                        </div>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Requires follow-up
                    </div>
                </div>
            </div>

            {/* Timeline Chart */}
            {timeline.length > 0 && (
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginBottom: '24px'
                }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>Sentiment Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={timeline}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="positive"
                                stackId="1"
                                stroke={SENTIMENT_COLORS.positive}
                                fill={SENTIMENT_COLORS.positive}
                                name="Positive"
                            />
                            <Area
                                type="monotone"
                                dataKey="neutral"
                                stackId="1"
                                stroke={SENTIMENT_COLORS.neutral}
                                fill={SENTIMENT_COLORS.neutral}
                                name="Neutral"
                            />
                            <Area
                                type="monotone"
                                dataKey="negative"
                                stackId="1"
                                stroke={SENTIMENT_COLORS.negative}
                                fill={SENTIMENT_COLORS.negative}
                                name="Negative"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Bottom Row: By Question and Themes */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Sentiment by Question */}
                {byQuestion.length > 0 && (
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>Sentiment by Question</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={byQuestion.slice(0, 5)} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[-1, 1]} />
                                <YAxis type="category" dataKey="fieldName" width={150} />
                                <Tooltip />
                                <Bar dataKey="avgScore" fill="#3B82F6">
                                    {byQuestion.slice(0, 5).map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={parseFloat(entry.avgScore) >= 0.3 ? SENTIMENT_COLORS.positive :
                                                parseFloat(entry.avgScore) <= -0.3 ? SENTIMENT_COLORS.negative :
                                                SENTIMENT_COLORS.neutral}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Top Themes */}
                {themes.length > 0 && (
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>Top Themes</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {themes.map((theme, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{theme.theme}</span>
                                    <span
                                        style={{
                                            padding: '4px 10px',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: 600
                                        }}
                                    >
                                        {theme.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Emotion Distribution */}
            {overview.emotions && overview.emotions.length > 0 && (
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginTop: '24px'
                }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>Emotion Distribution</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {overview.emotions.map((emotion, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 16px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    border: `2px solid ${EMOTION_COLORS[emotion.emotion] || '#94A3B8'}`
                                }}
                            >
                                <span style={{ fontSize: '24px' }}>
                                    {EMOTION_ICONS[emotion.emotion] || '😐'}
                                </span>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {emotion.emotion}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {emotion.count} responses
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
