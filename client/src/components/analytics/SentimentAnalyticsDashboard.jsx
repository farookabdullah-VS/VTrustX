import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ThumbsUp, ThumbsDown, Meh, TrendingUp, MessageSquare, Tag, Globe } from 'lucide-react';
import './SentimentAnalyticsDashboard.css';

/**
 * Sentiment Analytics Dashboard
 *
 * Displays AI-powered sentiment analysis for survey responses:
 * - Overall sentiment distribution (positive, negative, neutral)
 * - Sentiment trend over time
 * - Top keywords and themes
 * - Individual response details
 */
const SentimentAnalyticsDashboard = ({ formId }) => {
    const [stats, setStats] = useState(null);
    const [trend, setTrend] = useState([]);
    const [keywords, setKeywords] = useState([]);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSentiment, setSelectedSentiment] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (formId) {
            fetchSentimentData();
        }
    }, [formId, selectedSentiment, currentPage]);

    const fetchSentimentData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch stats, trend, and keywords in parallel
            const [statsRes, trendRes, keywordsRes, responsesRes] = await Promise.all([
                axios.get(`/api/sentiment/stats/${formId}`),
                axios.get(`/api/sentiment/trend/${formId}?days=30`),
                axios.get(`/api/sentiment/keywords/${formId}?limit=20`),
                axios.get(`/api/sentiment/responses/${formId}?page=${currentPage}&limit=10${selectedSentiment !== 'all' ? `&sentiment=${selectedSentiment}` : ''}`)
            ]);

            setStats(statsRes.data.data);
            setTrend(trendRes.data.data.trend);
            setKeywords(keywordsRes.data.data.keywords);
            setResponses(responsesRes.data.data.responses);
            setTotalPages(responsesRes.data.data.totalPages);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch sentiment data:', err);
            setError(err.response?.data?.message || 'Failed to load sentiment analytics');
            setLoading(false);
        }
    };

    const getSentimentIcon = (sentiment) => {
        switch (sentiment) {
            case 'positive':
                return <ThumbsUp size={20} color="#10B981" />;
            case 'negative':
                return <ThumbsDown size={20} color="#EF4444" />;
            case 'neutral':
                return <Meh size={20} color="#6B7280" />;
            default:
                return null;
        }
    };

    const getSentimentColor = (sentiment) => {
        switch (sentiment) {
            case 'positive':
                return '#10B981';
            case 'negative':
                return '#EF4444';
            case 'neutral':
                return '#6B7280';
            default:
                return '#9CA3AF';
        }
    };

    if (loading && !stats) {
        return (
            <div className="sentiment-dashboard loading">
                <div className="spinner"></div>
                <p>Loading sentiment analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sentiment-dashboard error">
                <p>{error}</p>
                <button onClick={fetchSentimentData}>Retry</button>
            </div>
        );
    }

    if (!stats || stats.totalAnalyzed === 0) {
        return (
            <div className="sentiment-dashboard empty">
                <MessageSquare size={48} color="#9CA3AF" />
                <h3>No Sentiment Data Yet</h3>
                <p>Sentiment analysis will appear here once text responses are submitted.</p>
            </div>
        );
    }

    const pieData = [
        { name: 'Positive', value: stats.positive.count, color: '#10B981' },
        { name: 'Negative', value: stats.negative.count, color: '#EF4444' },
        { name: 'Neutral', value: stats.neutral.count, color: '#6B7280' }
    ].filter(d => d.value > 0);

    return (
        <div className="sentiment-dashboard">
            <div className="dashboard-header">
                <h2>Sentiment Analysis</h2>
                <div className="header-stats">
                    <div className="stat-badge">
                        <MessageSquare size={16} />
                        <span>{stats.totalAnalyzed} analyzed</span>
                    </div>
                    <div className="stat-badge">
                        <TrendingUp size={16} />
                        <span>{stats.avgSentimentScore.toFixed(2)} avg score</span>
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="overview-cards">
                <div className="sentiment-card positive">
                    <div className="card-header">
                        {getSentimentIcon('positive')}
                        <h3>Positive</h3>
                    </div>
                    <div className="card-stats">
                        <div className="count">{stats.positive.count}</div>
                        <div className="percentage">{stats.positive.percentage.toFixed(1)}%</div>
                    </div>
                </div>

                <div className="sentiment-card negative">
                    <div className="card-header">
                        {getSentimentIcon('negative')}
                        <h3>Negative</h3>
                    </div>
                    <div className="card-stats">
                        <div className="count">{stats.negative.count}</div>
                        <div className="percentage">{stats.negative.percentage.toFixed(1)}%</div>
                    </div>
                </div>

                <div className="sentiment-card neutral">
                    <div className="card-header">
                        {getSentimentIcon('neutral')}
                        <h3>Neutral</h3>
                    </div>
                    <div className="card-stats">
                        <div className="count">{stats.neutral.count}</div>
                        <div className="percentage">{stats.neutral.percentage.toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                {/* Pie Chart */}
                <div className="chart-container">
                    <h3>Sentiment Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Trend Line Chart */}
                {trend.length > 0 && (
                    <div className="chart-container">
                        <h3>Sentiment Trend (30 Days)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} />
                                <Line type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} />
                                <Line type="monotone" dataKey="neutral" stroke="#6B7280" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Keywords Section */}
            {keywords.length > 0 && (
                <div className="keywords-section">
                    <h3>
                        <Tag size={20} />
                        Top Keywords
                    </h3>
                    <div className="keywords-cloud">
                        {keywords.map((kw, idx) => (
                            <div
                                key={idx}
                                className="keyword-tag"
                                style={{
                                    fontSize: `${Math.min(20, 12 + kw.frequency / 2)}px`,
                                    opacity: Math.max(0.6, Math.min(1, kw.frequency / 10))
                                }}
                            >
                                {kw.keyword} ({kw.frequency})
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Responses List */}
            <div className="responses-section">
                <div className="section-header">
                    <h3>Recent Responses</h3>
                    <div className="sentiment-filter">
                        <button
                            className={selectedSentiment === 'all' ? 'active' : ''}
                            onClick={() => { setSelectedSentiment('all'); setCurrentPage(1); }}
                        >
                            All
                        </button>
                        <button
                            className={selectedSentiment === 'positive' ? 'active' : ''}
                            onClick={() => { setSelectedSentiment('positive'); setCurrentPage(1); }}
                        >
                            Positive
                        </button>
                        <button
                            className={selectedSentiment === 'negative' ? 'active' : ''}
                            onClick={() => { setSelectedSentiment('negative'); setCurrentPage(1); }}
                        >
                            Negative
                        </button>
                        <button
                            className={selectedSentiment === 'neutral' ? 'active' : ''}
                            onClick={() => { setSelectedSentiment('neutral'); setCurrentPage(1); }}
                        >
                            Neutral
                        </button>
                    </div>
                </div>

                <div className="responses-list">
                    {responses.map((response) => (
                        <div key={response.id} className={`response-card ${response.sentiment}`}>
                            <div className="response-header">
                                <div className="sentiment-indicator">
                                    {getSentimentIcon(response.sentiment)}
                                    <span className="sentiment-label">{response.sentiment}</span>
                                </div>
                                <div className="response-meta">
                                    <span className="score">Score: {response.sentiment_score}</span>
                                    <span className="confidence">Confidence: {(response.confidence * 100).toFixed(0)}%</span>
                                    {response.language && response.language !== 'en' && (
                                        <span className="language">
                                            <Globe size={14} />
                                            {response.language.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="response-content">
                                <p className="question-text">{response.question_text}</p>
                                <p className="response-text">{response.response_text}</p>
                            </div>

                            {response.emotions && Object.keys(response.emotions).length > 0 && (
                                <div className="emotions-tags">
                                    {Object.entries(response.emotions).map(([emotion, score]) => (
                                        <span key={emotion} className="emotion-tag">
                                            {emotion}: {(score * 100).toFixed(0)}%
                                        </span>
                                    ))}
                                </div>
                            )}

                            {response.keywords && response.keywords.length > 0 && (
                                <div className="keywords-tags">
                                    {response.keywords.map((kw, idx) => (
                                        <span key={idx} className="keyword-tag">{kw}</span>
                                    ))}
                                </div>
                            )}

                            {response.themes && response.themes.length > 0 && (
                                <div className="themes-tags">
                                    {response.themes.map((theme, idx) => (
                                        <span key={idx} className="theme-tag">{theme.replace('_', ' ')}</span>
                                    ))}
                                </div>
                            )}

                            {response.ctl_alert_created && (
                                <div className="ctl-alert-badge">CTL Alert Created</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            Previous
                        </button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SentimentAnalyticsDashboard;
