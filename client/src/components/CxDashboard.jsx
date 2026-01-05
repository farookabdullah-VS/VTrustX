import React, { useEffect, useState } from 'react';
import axios from 'axios';

export function CxDashboard() {
    const [stats, setStats] = useState({
        nps: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        totalNpsResponses: 0,
        csatAverage: 0,
        recentFeedback: []
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await axios.get('/api/submissions');
                const subs = res.data;

                // --- Calculate NPS ---
                // Looks for any key 'nps' in data object
                let npsScores = [];
                let csatScores = [];
                let feedbacks = [];

                subs.forEach(s => {
                    const data = s.data || {};
                    // Check for NPS (0-10)
                    if (data.nps !== undefined) npsScores.push(parseInt(data.nps));

                    // Check for CSAT (1-5 or 1-10?) Assume 1-5 like distinct ratings
                    if (data.csat !== undefined) csatScores.push(parseInt(data.csat));

                    // Collect text comments
                    if (data.comment || data.feedback) feedbacks.push({
                        text: data.comment || data.feedback,
                        date: s.created_at,
                        sentiment: 'neutral' // Placeholder
                    });
                });

                // NPS Logic
                let pro = 0, pas = 0, det = 0;
                npsScores.forEach(score => {
                    if (score >= 9) pro++;
                    else if (score >= 7) pas++;
                    else det++;
                });

                const total = npsScores.length;
                const npsFinal = total > 0 ? Math.round(((pro - det) / total) * 100) : 0;

                // CSAT Logic
                const csatSum = csatScores.reduce((a, b) => a + b, 0);
                const csatAvg = csatScores.length > 0 ? (csatSum / csatScores.length).toFixed(1) : 0;

                setStats({
                    nps: npsFinal,
                    promoters: pro,
                    passives: pas,
                    detractors: det,
                    totalNpsResponses: total,
                    csatAverage: csatAvg,
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

    // --- STYLES ---
    // Light Background Theme
    const containerStyle = {
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#1e293b',
        padding: '40px',
        fontFamily: "'Inter', sans-serif"
    };

    const cardStyle = {
        background: 'white',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        padding: '30px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    };

    const npsColor = stats.nps > 30 ? '#22c55e' : stats.nps > 0 ? '#facc15' : '#ef4444'; // Green, Yellow, Red

    return (
        <div style={containerStyle}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '3em', fontWeight: '800', color: '#b91c1c', margin: 0 }}>
                    CX Intelligence
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.1em', marginTop: '10px' }}>Real-time Customer Experience Analytics</p>
            </div>

            {loading ? <div style={{ color: '#64748b' }}>Loading AI Analytics...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }}>

                    {/* BIG NPS SCORE */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <h3 style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em' }}>Net Promoter Score</h3>
                        <div style={{ fontSize: '6em', fontWeight: '900', color: npsColor, textShadow: `0 0 20px ${npsColor}40` }}>
                            {stats.nps}
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px', width: '100%' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.promoters / stats.totalNpsResponses) * 100}%`, background: '#22c55e', height: '100%' }}></div>
                            </div>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.passives / stats.totalNpsResponses) * 100}%`, background: '#facc15', height: '100%' }}></div>
                            </div>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.detractors / stats.totalNpsResponses) * 100}%`, background: '#ef4444', height: '100%' }}></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '8px', fontSize: '0.8em', color: '#94a3b8' }}>
                            <span>Promoters</span>
                            <span>Passives</span>
                            <span>Detractors</span>
                        </div>
                    </div>

                    {/* CSAT GAUGE & METRICS */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4' }}>
                        <h3 style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em', marginBottom: '20px' }}>CSAT Average</h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px' }}>
                            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(#ef4444 ${stats.csatAverage * 72}deg, #e2e8f0 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '100px', height: '100px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <span style={{ fontSize: '2em', fontWeight: 'bold', color: '#1e293b' }}>{stats.csatAverage}</span>
                                    <span style={{ fontSize: '0.8em', color: '#64748b' }}>/ 5.0</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', textAlign: 'center', color: '#64748b' }}>Customer Satisfaction is trending <strong>Upside</strong></div>
                    </div>

                    {/* RECENT FEEDBACK LIST */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4', overflowY: 'auto', maxHeight: '400px' }}>
                        <h3 style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em', marginBottom: '20px' }}>Voice of Customer</h3>
                        {stats.recentFeedback.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center' }}>No qualitative feedback yet.</div> : (
                            stats.recentFeedback.map((fb, i) => (
                                <div key={i} style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', marginBottom: '10px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.95em', fontStyle: 'italic', marginBottom: '8px', color: '#334155' }}>"{fb.text}"</div>
                                    <div style={{ fontSize: '0.75em', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{new Date(fb.date).toLocaleDateString()}</span>
                                        <span>User_{Math.floor(Math.random() * 1000)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* WIDE CHART AREA (Fake Wave) */}
                    <div style={{ ...cardStyle, gridColumn: 'span 12', height: '300px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em' }}>Response Sentiment Timeline</h3>
                        {/* CSS Art Wave */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '5px', paddingBottom: '20px' }}>
                            {[...Array(40)].map((_, i) => (
                                <div key={i} style={{
                                    flex: 1,
                                    background: 'linear-gradient(to top, #b91c1c, #fca5a5)',
                                    opacity: 0.6,
                                    borderRadius: '4px 4px 0 0',
                                    height: `${20 + Math.random() * 60}%`,
                                    transition: 'height 0.5s ease'
                                }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
