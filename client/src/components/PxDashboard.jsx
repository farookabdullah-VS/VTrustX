import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DashboardSkeleton } from './common/Skeleton';

export function PxDashboard() {
    const [stats, setStats] = useState({
        nps: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        totalResponses: 0,
        psatAverage: 0,
        effortScore: 0, // CES
        recentFeedback: []
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
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

                // Reuse submissions endpoint. In a real scenario, we'd filter by survey_type='product'
                const res = await axios.get('/api/submissions', { headers });
                const subs = res.data;

                // --- Calculate PX Metrics ---
                let npsScores = [];
                let psatScores = [];
                let cesScores = []; // Customer Effort Score
                let feedbacks = [];

                subs.forEach(s => {
                    const data = s.data || {};
                    // Look for product specific fields or generic ones
                    const score = data.product_nps || data.nps;
                    if (score !== undefined) npsScores.push(parseInt(score));

                    const psat = data.psat || data.csat;
                    if (psat !== undefined) psatScores.push(parseInt(psat));

                    const ces = data.ces || data.effort;
                    if (ces !== undefined) cesScores.push(parseInt(ces));

                    if (data.comment || data.feature_request || data.bug_report) feedbacks.push({
                        text: data.comment || data.feature_request || data.bug_report,
                        date: s.created_at,
                        type: data.feature_request ? 'Feature Request' : (data.bug_report ? 'Bug' : 'General')
                    });
                });

                let pro = 0, pas = 0, det = 0;
                npsScores.forEach(score => {
                    if (score >= 9) pro++;
                    else if (score >= 7) pas++;
                    else det++;
                });

                const total = npsScores.length;
                const npsFinal = total > 0 ? Math.round(((pro - det) / total) * 100) : 0;

                const psatSum = psatScores.reduce((a, b) => a + b, 0);
                const psatAvg = psatScores.length > 0 ? (psatSum / psatScores.length).toFixed(1) : 0;

                const cesSum = cesScores.reduce((a, b) => a + b, 0);
                const cesAvg = cesScores.length > 0 ? (cesSum / cesScores.length).toFixed(1) : 0;

                setStats({
                    nps: npsFinal,
                    promoters: pro,
                    passives: pas,
                    detractors: det,
                    totalResponses: total,
                    psatAverage: psatAvg,
                    effortScore: cesAvg,
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
        fontFamily: "'Outfit', sans-serif"
    };

    const cardStyle = {
        background: 'var(--card-bg)',
        borderRadius: '24px',
        border: '1px solid var(--input-border)',
        padding: '30px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    };

    const npsColor = stats.nps > 30 ? '#22c55e' : stats.nps > 0 ? '#facc15' : '#ef4444';

    if (loading) {
        return (
            <div role="status" aria-live="polite" style={containerStyle}>
                <span className="sr-only">Loading product analytics</span>
                <DashboardSkeleton />
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '3em', fontWeight: '800', color: 'var(--text-color)', margin: 0 }}>
                    PX Intelligence
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1em', marginTop: '10px' }}>Product Experience & Adoption Analytics</p>
            </div>

            {(
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }}>

                    {/* PRODUCT NPS */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em' }}>Product NPS</h3>
                        <div style={{ fontSize: '6em', fontWeight: '900', color: npsColor, textShadow: `0 0 20px ${npsColor}40` }}>
                            {stats.nps}
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '10px', width: '100%' }}>
                            <div style={{ flex: 1, height: '6px', background: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.promoters / stats.totalResponses) * 100}%`, background: '#22c55e', height: '100%' }}></div>
                            </div>
                            <div style={{ flex: 1, height: '6px', background: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.passives / stats.totalResponses) * 100}%`, background: '#facc15', height: '100%' }}></div>
                            </div>
                            <div style={{ flex: 1, height: '6px', background: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(stats.detractors / stats.totalResponses) * 100}%`, background: '#ef4444', height: '100%' }}></div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '15px', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                            Benchmark: Top 10% in SaaS
                        </div>
                    </div>

                    {/* PRODUCT METRICS (PSAT / CES) */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                        {/* PSAT */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <div>
                                <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8em', margin: 0 }}>PSAT Score</h3>
                                <div style={{ fontSize: '2.5em', fontWeight: 'bold' }}>{stats.psatAverage} <span style={{ fontSize: '0.5em', color: 'var(--text-muted)' }}>/ 5.0</span></div>
                            </div>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `conic-gradient(#8b5cf6 ${stats.psatAverage * 72}deg, var(--input-bg) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '50px', height: '50px', background: 'var(--card-bg)', borderRadius: '50%' }}></div>
                            </div>
                        </div>

                        {/* CES */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8em', margin: 0 }}>Effort Score (CES)</h3>
                                <div style={{ fontSize: '2.5em', fontWeight: 'bold' }}>{stats.effortScore} <span style={{ fontSize: '0.5em', color: 'var(--text-muted)' }}>/ 7.0</span></div>
                            </div>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `conic-gradient(#ec4899 ${stats.effortScore * 51.4}deg, var(--input-bg) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '50px', height: '50px', background: 'var(--card-bg)', borderRadius: '50%' }}></div>
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                            Lower CES indicates users find the product easy to use.
                        </div>
                    </div>

                    {/* PRODUCT FEEDBACK STREAM */}
                    <div style={{ ...cardStyle, gridColumn: 'span 4', overflowY: 'auto', maxHeight: '400px' }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em', marginBottom: '20px' }}>Product Feedback</h3>
                        {stats.recentFeedback.length === 0 ? <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No feedback yet.</div> : (
                            stats.recentFeedback.map((fb, i) => (
                                <div key={i} style={{ padding: '15px', background: 'var(--sidebar-bg)', borderRadius: '12px', marginBottom: '10px', border: '1px solid var(--input-border)' }}>
                                    <div style={{ fontSize: '0.95em', fontStyle: 'italic', marginBottom: '8px', color: 'var(--text-color)' }}>"{fb.text}"</div>
                                    <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{new Date(fb.date).toLocaleDateString()}</span>
                                        <span style={{
                                            background: fb.type === 'Bug' ? '#fecaca' : (fb.type === 'Feature Request' ? '#bfdbfe' : '#e2e8f0'),
                                            padding: '2px 8px', borderRadius: '4px',
                                            color: fb.type === 'Bug' ? '#b91c1c' : (fb.type === 'Feature Request' ? '#1e40af' : '#475569'),
                                            fontWeight: '500'
                                        }}>
                                            {fb.type}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* FEATURE ADOPTION MATRIX (Mock Visual) */}
                    <div style={{ ...cardStyle, gridColumn: 'span 12' }}>
                        <h3 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em', marginBottom: '20px' }}>Top Requested Features (AI Analysis)</h3>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Mock Data */}
                            {[
                                { name: "Dark Mode Mobile", votes: 42, impact: "High" },
                                { name: "CSV Export", votes: 31, impact: "Medium" },
                                { name: "API Rate Limits", votes: 15, impact: "Low" }
                            ].map((feat, i) => (
                                <div key={i} style={{ flex: 1, minWidth: '200px', padding: '20px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--input-border)' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '5px' }}>{feat.name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{feat.votes} Requests</span>
                                        <span style={{
                                            fontSize: '0.8em', padding: '3px 8px', borderRadius: '12px',
                                            background: feat.impact === 'High' ? '#fef08a' : '#e2e8f0',
                                            color: feat.impact === 'High' ? '#854d0e' : '#475569'
                                        }}>{feat.impact} Impact</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
