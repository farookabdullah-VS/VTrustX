import React, { useState, useMemo, useEffect } from 'react';
import { AdvancedComposedChart, SimpleBarChart } from '../ChartLibrary';
import { Download, Filter, Calendar, Loader2 } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export const SurveyAnalyticsDashboard = () => {
    const [activeTab, setActiveTab] = useState('survey-analysis');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({
        dailyOverview: [],
        questions: [],
        answers: {},
        trendDistribution: [],
        csatStats: [],
        detailedResponses: []
    });

    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const userStr = localStorage.getItem('rayix_user');
                const user = userStr ? JSON.parse(userStr) : null;
                const token = user?.token;

                if (!token) {
                    console.error('No authentication token found');
                    setLoading(false);
                    return;
                }

                const headers = { Authorization: `Bearer ${token}` };

                const [dailyRes, qRes, csatRes, detailRes] = await Promise.all([
                    axios.get('/api/analytics/daily-stats', { headers }),
                    axios.get('/api/analytics/question-stats', { headers }),
                    axios.get('/api/analytics/csat-stats', { headers }),
                    axios.get('/api/analytics/detailed-responses', { headers })
                ]);

                setData({
                    dailyOverview: dailyRes.data,
                    questions: qRes.data.questions,
                    answers: qRes.data.answers,
                    trendDistribution: dailyRes.data, // Reusing daily for trend for now or can be custom
                    csatStats: csatRes.data,
                    detailedResponses: detailRes.data
                });

                if (qRes.data.questions.length > 0) {
                    setSelectedQuestion(qRes.data.questions[0]);
                }
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
                setError(err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    // --- VIEW 1: Survey Analysis ---
    const renderSurveyAnalysis = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 1. Daily Survey Completion Rate */}
            <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginBottom: '15px' }}>Daily Survey Completion Rate</h3>
                <div style={{ height: '350px' }}>
                    {data.dailyOverview.length > 0 ? (
                        <AdvancedComposedChart
                            data={data.dailyOverview}
                            config={{
                                xAxisKey: 'date',
                                series: [
                                    { type: 'bar', dataKey: 'viewed', name: 'Viewed Surveys', color: '#8884d8' },
                                    { type: 'bar', dataKey: 'completed', name: 'Completed Survey', color: '#82ca9d' },
                                    { type: 'line', dataKey: 'rate', name: 'Completion Rate (%)', color: '#ff7300', yAxisId: 'right' }
                                ]
                            }}
                        />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data available for the selected period</div>
                    )}
                </div>
            </div>

            {/* 2. Drill Down Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1fr', gap: '20px' }}>

                {/* Left: Question Grid */}
                <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginBottom: '15px' }}>Question Completion Rate</h3>
                    <div style={{ overflowX: 'auto', maxHeight: '540px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0 }}>
                                    <th style={{ padding: '10px' }}>Question</th>
                                    <th style={{ padding: '10px' }}>Form</th>
                                    <th style={{ padding: '10px' }}>Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.questions.map(q => (
                                    <tr
                                        key={q.id}
                                        onClick={() => { setSelectedQuestion(q); setSelectedAnswer(null); }}
                                        style={{
                                            cursor: 'pointer',
                                            background: selectedQuestion?.id === q.id ? 'var(--primary-color-light, #eff6ff)' : 'transparent',
                                            borderBottom: '1px solid var(--border-color, #f1f5f9)'
                                        }}
                                    >
                                        <td style={{ padding: '10px', fontWeight: '500' }}>{q.text}</td>
                                        <td style={{ padding: '10px', color: '#64748b' }}>{q.form}</td>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                                                    <div style={{ width: `${q.completionRate}%`, height: '100%', background: q.completionRate > 80 ? '#10b981' : (q.completionRate > 50 ? '#f59e0b' : '#ef4444'), borderRadius: '3px' }} />
                                                </div>
                                                {q.completionRate}%
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {data.questions.length === 0 && (
                                    <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No questions found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Charts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Top Right: Answer Analysis */}
                    <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginBottom: '15px' }}>Answer Analysis: "{selectedQuestion?.text || 'Select a question'}"</h3>
                        <div style={{ height: '250px' }}>
                            {selectedQuestion && data.answers[selectedQuestion.id] && data.answers[selectedQuestion.id].length > 0 ? (
                                <SimpleBarChart
                                    data={data.answers[selectedQuestion.id]}
                                    config={{
                                        xAxisKey: 'label',
                                        yAxisKey: 'count',
                                        color: '#6366f1'
                                    }}
                                    onClick={(data) => setSelectedAnswer(data?.PAYLOAD?.label || data.activeLabel)}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                    {selectedQuestion ? 'No categorical data available for this question' : 'Select a question to view distribution'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Right: Distribution Trend */}
                    <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginBottom: '15px' }}>Daily Activity Trend</h3>
                        <div style={{ height: '250px' }}>
                            {data.dailyOverview.length > 0 ? (
                                <AdvancedComposedChart
                                    data={data.dailyOverview}
                                    config={{
                                        xAxisKey: 'date',
                                        series: [
                                            { type: 'line', dataKey: 'completed', name: 'Submissions', color: '#10b981' }
                                        ]
                                    }}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No trend data available</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );

    // --- VIEW 2: CSAT Analysis ---
    const renderCSATAnalysis = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3>CSAT & NPS Trends</h3>
                <div style={{ height: '350px' }}>
                    {data.csatStats.timeline && data.csatStats.timeline.length > 0 ? (
                        <AdvancedComposedChart
                            data={data.csatStats.timeline}
                            config={{
                                xAxisKey: 'date',
                                series: [
                                    { type: 'line', dataKey: 'csat', name: 'Avg CSAT Score', color: '#8884d8' },
                                    { type: 'line', dataKey: 'nps', name: 'Avg NPS Score', color: '#82ca9d', yAxisId: 'right' }
                                ]
                            }}
                        />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No CSAT/NPS data found in submissions</div>
                    )}
                </div>
            </div>

            <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3>Performance Breakdown (by Survey)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '12px' }}>Survey Name</th>
                            <th style={{ padding: '12px' }}>Response Count</th>
                            <th style={{ padding: '12px' }}>Avg CSAT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.csatStats.breakdown && data.csatStats.breakdown.length > 0 ? (
                            data.csatStats.breakdown.map((b, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{b.name}</td>
                                    <td style={{ padding: '12px' }}>{b.count}</td>
                                    <td style={{ padding: '12px' }}>{b.avg}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No breakdown data available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // --- VIEW 3: Data Exports ---
    const renderDataGrids = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h3>Detailed Survey Responses</h3>
                    <button
                        onClick={() => {
                            const ws = XLSX.utils.json_to_sheet(data.detailedResponses);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Responses");
                            XLSX.writeFile(wb, "Survey_Responses_Export.xlsx");
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        <Download size={16} /> Export to Excel
                    </button>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', color: '#64748b', position: 'sticky', top: 0 }}>
                                <th style={{ padding: '10px' }}>Date</th>
                                <th style={{ padding: '10px' }}>Agent</th>
                                <th style={{ padding: '10px' }}>Group</th>
                                <th style={{ padding: '10px' }}>Survey Form</th>
                                <th style={{ padding: '10px' }}>Question</th>
                                <th style={{ padding: '10px' }}>Answer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.detailedResponses.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px' }}>{row.date}</td>
                                    <td style={{ padding: '10px' }}>{row.agent}</td>
                                    <td style={{ padding: '10px' }}>{row.group}</td>
                                    <td style={{ padding: '10px' }}>{row.form}</td>
                                    <td style={{ padding: '10px' }}>{row.question}</td>
                                    <td style={{ padding: '10px' }}>{row.answer}</td>
                                </tr>
                            ))}
                            {data.detailedResponses.length === 0 && (
                                <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No responses found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="survey-analytics-dashboard" style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header & Controls */}
            <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-color, #1e293b)' }}>Survey Analytics</h1>
                    <p style={{ color: '#64748b' }}>Live Chat Survey Performance & CSAT Insights</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        <Calendar size={16} />
                        <span>Last 30 Days</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        <Filter size={16} />
                        <span>Filter: All Groups</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '2px', background: '#e2e8f0', padding: '4px', borderRadius: '8px', width: 'fit-content', marginBottom: '20px' }}>
                {['survey-analysis', 'csat-analysis', 'data-grids'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 24px',
                            border: 'none',
                            background: activeTab === tab ? 'white' : 'transparent',
                            color: activeTab === tab ? '#0f172a' : '#64748b',
                            fontWeight: activeTab === tab ? '600' : '500',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* Content Render */}
            {error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                    <h3>Error Loading Analytics</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer', background: 'white', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '6px' }}>Retry</button>
                </div>
            ) : loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>
                    <Loader2 className="animate-spin" size={48} style={{ marginBottom: '15px', color: 'var(--primary-color, #6366f1)' }} />
                    <p>Loading real-time analytics...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'survey-analysis' && renderSurveyAnalysis()}
                    {activeTab === 'csat-analysis' && renderCSATAnalysis()}
                    {activeTab === 'data-grids' && renderDataGrids()}
                </>
            )}
        </div>
    );
};
