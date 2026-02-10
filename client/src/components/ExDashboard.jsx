import React, { useEffect, useState } from 'react';
import axios from 'axios';

export function ExDashboard() {
    const [stats, setStats] = useState({
        enps: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        totalResponses: 0,
        engagementScore: 0,
        recentFeedback: []
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const userStr = localStorage.getItem('vtrustx_user');
                const user = userStr ? JSON.parse(userStr) : null;
                const token = user?.token;

                if (!token) {
                    console.error('No authentication token found');
                    setLoading(false);
                    return;
                }

                const headers = { Authorization: `Bearer ${token}` };

                // Reuse submissions endpoint for demo purposes, 
                // in real app this would filter by EX surveys (e.g. type='employee')
                const res = await axios.get('/api/submissions', { headers });
                const subs = res.data;

                // --- Calculate eNPS (Employee Net Promoter Score) ---
                let npsScores = [];
                let engagementScores = [];
                let feedbacks = [];

                subs.forEach(s => {
                    const data = s.data || {};
                    // Look for nps or specific enps field
                    const score = data.enps || data.nps;
                    if (score !== undefined) npsScores.push(parseInt(score));

                    const engagement = data.engagement || data.csat;
                    if (engagement !== undefined) engagementScores.push(parseInt(engagement));

                    if (data.comment || data.feedback || data.suggestion) feedbacks.push({
                        text: data.comment || data.feedback || data.suggestion,
                        date: s.created_at,
                        department: data.department || 'General'
                    });
                });

                let pro = 0, pas = 0, det = 0;
                npsScores.forEach(score => {
                    if (score >= 9) pro++;
                    else if (score >= 7) pas++;
                    else det++;
                });

                const total = npsScores.length;
                const enpsFinal = total > 0 ? Math.round(((pro - det) / total) * 100) : 0;

                const engagementSum = engagementScores.reduce((a, b) => a + b, 0);
                const engagementAvg = engagementScores.length > 0 ? (engagementSum / engagementScores.length).toFixed(1) : 0;

                setStats({
                    enps: enpsFinal,
                    promoters: pro,
                    passives: pas,
                    detractors: det,
                    totalResponses: total,
                    engagementScore: engagementAvg,
                    recentFeedback: feedbacks.slice(0, 5)
                });
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const containerStyle = {
        minHeight: '100vh',
        background: 'transparent',
        color: 'var(--text-color)',
        padding: '40px',
        fontFamily: "'Inter', sans-serif"
    };

    const cardStyle = {
        background: 'var(--card-bg)',
        borderRadius: '24px',
        border: '1px solid var(--input-border)',
        padding: '30px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    };

    const npsColor = stats.enps > 30 ? '#22c55e' : stats.enps > 0 ? '#facc15' : '#ef4444';

    return (
        <div style={containerStyle}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '3em', fontWeight: '800', color: 'var(--text-color)', margin: 0 }}>
                    EX Intelligence
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1em', marginTop: '10px' }}>Employee Experience & Engagement Analytics</p>
            </div>

            {loading ? <div style={{ color: 'var(--text-muted)' }}>Loading EX Data...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }}>

                    {/* BIG eNPS SCORE */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em' }}>eNPS Score</h3>
                        <div style={{ fontSize: '6em', fontWeight: '900', color: npsColor, textShadow: `0 0 20px ${npsColor}40` }}>
                            {stats.enps}
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px', width: '100%' }}>
                            <div style={{ flex: 1, height: '6px', background: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.promoters / stats.totalResponses) * 100}%`, background: '#22c55e', height: '100%' }} title="Promoters"></div>
                            </div>
                            <div style={{ flex: 1, height: '6px', background: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.passives / stats.totalResponses) * 100}%`, background: '#facc15', height: '100%' }} title="Passives"></div>
                            </div>
                            <div style={{ flex: 1, height: '6px', background: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.detractors / stats.totalResponses) * 100}%`, background: '#ef4444', height: '100%' }} title="Detractors"></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '8px', fontSize: '0.8em', color: 'var(--text-muted)' }}>
                            <span>Promoters</span>
                            <span>Passives</span>
                            <span>Detractors</span>
                        </div>
                    </div>

                    {/* ENGAGEMENT SCORE */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4' }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em', marginBottom: '20px' }}>Engagement Index</h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px' }}>
                            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(#3b82f6 ${stats.engagementScore * 72}deg, var(--input-bg) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '100px', height: '100px', background: 'var(--card-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <span style={{ fontSize: '2em', fontWeight: 'bold', color: 'var(--text-color)' }}>{stats.engagementScore}</span>
                                    <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>/ 5.0</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Overall employee sentiment is <strong>Stable</strong></div>
                    </div>

                    {/* RECENT EMPLOYEE FEEDBACK */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4', overflowY: 'auto', maxHeight: '400px' }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em', marginBottom: '20px' }}>Voice of Employee</h3>
                        {stats.recentFeedback.length === 0 ? <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No feedback yet.</div> : (
                            stats.recentFeedback.map((fb, i) => (
                                <div key={i} style={{ padding: '15px', background: 'var(--sidebar-bg)', borderRadius: '12px', marginBottom: '10px', border: '1px solid var(--input-border)' }}>
                                    <div style={{ fontSize: '0.95em', fontStyle: 'italic', marginBottom: '8px', color: 'var(--text-color)' }}>"{fb.text}"</div>
                                    <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{new Date(fb.date).toLocaleDateString()}</span>
                                        <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>{fb.department}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* RETENTION RISK (Simulated) */}
                    <div style={{ ...cardStyle, gridColumn: 'span 12', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em' }}>Retention Risk Analysis</h3>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                            <div style={{ flex: 1, padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid #ef4444' }}>
                                <div style={{ color: '#ef4444', fontWeight: 'bold' }}>High Risk Groups</div>
                                <div style={{ fontSize: '0.9em', marginTop: '5px' }}>Sales (Tenure &lt; 1 yr)</div>
                            </div>
                            <div style={{ flex: 1, padding: '20px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '12px', border: '1px solid #eab308' }}>
                                <div style={{ color: '#eab308', fontWeight: 'bold' }}>Moderate Risk</div>
                                <div style={{ fontSize: '0.9em', marginTop: '5px' }}>Engineering (Remote)</div>
                            </div>
                            <div style={{ flex: 1, padding: '20px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid #22c55e' }}>
                                <div style={{ color: '#22c55e', fontWeight: 'bold' }}>High Retention</div>
                                <div style={{ fontSize: '0.9em', marginTop: '5px' }}>HR & Admin</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
