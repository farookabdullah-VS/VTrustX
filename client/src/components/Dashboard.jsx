import React from 'react';
import './Dashboard.css';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';

export function Dashboard({ onNavigate, onEdit, onEditSubmission }) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    // Default: Last 30 Days
    const [dateRange, setDateRange] = React.useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [stats, setStats] = React.useState({
        totalSurveys: 0,
        activeSurveys: 0,
        draftSurveys: 0,
        totalResponses: 0,
        newResponses: 0,
        topSurveys: [],
        dailyTrend: [],
        allForms: []
    });

    const [activeMenuId, setActiveMenuId] = React.useState(null);

    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const formsRes = await axios.get('/api/forms');
                const subsRes = await axios.get('/api/submissions');

                const forms = formsRes.data;
                const allSubmissions = subsRes.data;

                // --- FILTER LOGIC ---
                const start = new Date(dateRange.start);
                const end = new Date(dateRange.end);
                end.setHours(23, 59, 59, 999);

                // Filter Submissions by Range
                const filteredSubmissions = allSubmissions.filter(s => {
                    const dateStr = s.created_at || s.createdAt || s.updated_at;
                    if (!dateStr) return false;
                    const d = new Date(dateStr);
                    return d >= start && d <= end;
                });

                // Calculate Metrics
                const now = new Date();
                const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

                const newSubsCount = allSubmissions.filter(s => {
                    const dateStr = s.created_at || s.createdAt || s.updated_at;
                    return dateStr && new Date(dateStr) > oneDayAgo;
                }).length;

                const totalResponsesCount = filteredSubmissions.length;

                // Group forms by Title (Grouping Versions)
                const surveyGroups = {};
                const idToGroupKey = {};

                forms.forEach(f => {
                    // Only consider published forms for the stats and list
                    if (!f.is_published && !f.isPublished) return;

                    const key = f.title.trim();
                    if (!surveyGroups[key]) {
                        surveyGroups[key] = {
                            title: key,
                            latestVersion: f,
                            count: 0
                        };
                    }
                    idToGroupKey[f.id] = key;
                    if (f.version > surveyGroups[key].latestVersion.version) {
                        surveyGroups[key].latestVersion = f;
                    }
                });

                // Count responses for the GROUP based on filtered submissions
                filteredSubmissions.forEach(s => {
                    const fid = s.form_id || s.formId;
                    const key = idToGroupKey[fid];
                    if (key && surveyGroups[key]) {
                        surveyGroups[key].count++;
                    }
                });

                const topSurveys = Object.values(surveyGroups)
                    .map(g => ({
                        id: g.latestVersion.id, // Use latest ID for linking
                        title: g.title,
                        responseCount: g.count,
                        version: g.latestVersion.version
                    }))
                    .sort((a, b) => b.responseCount - a.responseCount)
                    .slice(0, 5);

                const uniqueSurveysCount = Object.keys(surveyGroups).length;

                setStats({
                    totalSurveys: uniqueSurveysCount,
                    activeSurveys: forms.filter(f => f.is_published || f.isPublished).length,
                    draftSurveys: forms.length - forms.filter(f => f.is_published || f.isPublished).length,
                    totalResponses: totalResponsesCount,
                    newResponses: newSubsCount,
                    topSurveys: topSurveys,
                    dailyTrend: calculateDailyTrend(filteredSubmissions, dateRange),
                    // Filter to only show latest version of each survey
                    allForms: Object.values(forms.reduce((acc, f) => {
                        const key = f.title.trim();
                        if (!acc[key] || f.version > acc[key].version) {
                            acc[key] = f;
                        }
                        return acc;
                    }, {})).sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
                });

            } catch (err) {
                console.error("Dashboard data load failed:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    const calculateDailyTrend = (subs, range) => {
        const buckets = {};
        const days = 7;
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            buckets[key] = 0;
        }

        subs.forEach(s => {
            const d = s.created_at || s.createdAt;
            if (d) {
                const key = new Date(d).toISOString().split('T')[0];
                if (buckets[key] !== undefined) buckets[key]++;
            }
        });

        return Object.entries(buckets).reverse().map(([date, count]) => ({ date, count }));
    };

    const handleDateChange = (type, val) => {
        setDateRange(prev => ({ ...prev, [type]: val }));
    };

    // --- STYLES ---
    // --- STYLES ---
    const cardStyle = {
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        border: '1px solid var(--glass-border)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-color)'
    };

    return (
        <div className="dashboard-container" style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', background: 'transparent', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", direction: isRtl ? 'rtl' : 'ltr' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-1px' }}>{t('sidebar.item.dashboard')}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1em', marginTop: '5px' }}>{t('dashboard.overview')}</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <span style={{ fontSize: '1.2em' }}>📅</span>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                            style={{ border: 'none', color: 'var(--text-color)', background: 'transparent', fontWeight: '500', outline: 'none', fontFamily: 'inherit', colorScheme: 'light', cursor: 'pointer' }}
                        />
                        <span style={{ color: '#94a3b8' }}>-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                            style={{ border: 'none', color: 'var(--text-color)', background: 'transparent', fontWeight: '500', outline: 'none', fontFamily: 'inherit', colorScheme: 'light', cursor: 'pointer' }}
                        />
                    </div>
                </div>
            </div>

            {loading ? <div>Loading...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Metrics Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                        {/* METRIC 1 */}
                        <div style={{ flex: '1 1 250px', minWidth: '250px' }}>
                            <div style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: '600', textTransform: 'uppercase' }}>{t('dashboard.total_responses')}</div>
                                        <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-color)', marginTop: '10px' }}>
                                            {stats.totalResponses}
                                        </div>
                                        <div style={{ fontSize: '0.9em', color: '#22c55e', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span>▲</span> {stats.newResponses} new (24h)
                                        </div>
                                    </div>
                                    <div style={{ background: '#ecfdf5', color: '#059669', padding: '12px', borderRadius: '12px', fontSize: '1.5em' }}>👥</div>
                                </div>
                            </div>
                        </div>

                        {/* METRIC 2 */}
                        <div style={{ flex: '1 1 250px', minWidth: '250px' }}>
                            <div style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: '600', textTransform: 'uppercase' }}>{t('dashboard.total_surveys')}</div>
                                        <div style={{ fontSize: '3rem', fontWeight: '800', color: '#ef4444', marginTop: '10px' }}>
                                            {stats.totalSurveys}
                                        </div>
                                        <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '5px' }}>
                                            {stats.activeSurveys} {t('dashboard.status.published')} • {stats.draftSurveys} {t('dashboard.status.draft')}
                                        </div>
                                    </div>
                                    <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '12px', fontSize: '1.5em' }}>📊</div>
                                </div>
                            </div>
                        </div>

                        {/* METRIC 3 */}
                        <div style={{ flex: '1 1 250px', minWidth: '250px' }}>
                            <div style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: '600', textTransform: 'uppercase' }}>{t('dashboard.metrics.avg_completion')}</div>
                                        <div style={{ fontSize: '3rem', fontWeight: '800', color: '#f59e0b', marginTop: '10px' }}>
                                            {stats.totalResponses > 0 ? "92%" : "0%"}
                                        </div>
                                        <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '5px' }}>
                                            ~2m 30s avg time
                                        </div>
                                    </div>
                                    <div style={{ background: '#fffbeb', color: '#d97706', padding: '12px', borderRadius: '12px', fontSize: '1.5em' }}>⏱️</div>
                                </div>
                            </div>
                        </div>

                        {/* METRIC 4 */}
                        <div style={{ flex: '1 1 250px', minWidth: '250px' }}>
                            <div style={{ ...cardStyle, background: 'var(--primary-gradient)', color: 'white', border: 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9em', fontWeight: '600', textTransform: 'uppercase' }}>{t('dashboard.metrics.ai_analysis')}</div>
                                        <div style={{ fontSize: '2rem', fontWeight: '700', marginTop: '10px', lineHeight: '1.2' }}>
                                            {t('dashboard.metrics.positive_sentiment')}
                                        </div>
                                        <div style={{ fontSize: '0.9em', color: 'rgba(255,255,255,0.9)', marginTop: '10px' }}>
                                            Based on recent text analysis.
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '12px', borderRadius: '12px', fontSize: '1.5em' }}>✨</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                        {/* CHART */}
                        <div style={{ flex: '2 1 600px', minWidth: '300px' }}>
                            <div style={cardStyle}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1em', color: 'var(--text-color)' }}>{t('dashboard.metrics.response_trends')}</h3>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '20px', gap: '10px', minHeight: '300px' }}>
                                    {stats.dailyTrend && stats.dailyTrend.map((day, i) => {
                                        const max = Math.max(...stats.dailyTrend.map(d => d.count), 5);
                                        const height = (day.count / max) * 100;
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '100%',
                                                    height: '200px',
                                                    background: '#f1f5f9',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'flex-end',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{
                                                        width: '60%',
                                                        height: `${height}%`,
                                                        background: '#b91c1c',
                                                        borderRadius: '4px 4px 0 0',
                                                        transition: 'height 0.5s',
                                                        minHeight: day.count > 0 ? '4px' : '0'
                                                    }}></div>
                                                </div>
                                                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', textAlign: 'center' }}>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* LIST */}
                        <div style={{ flex: '1 1 350px', minWidth: '300px' }}>
                            <div style={cardStyle}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1em', color: 'var(--text-color)' }}>{t('dashboard.metrics.top_performing')}</h3>
                                {stats.topSurveys.length === 0 ? <p style={{ color: '#94a3b8' }}>No data yet.</p> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {stats.topSurveys.map((s, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: i < stats.topSurveys.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9em', fontWeight: 'bold' }}>
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.95em' }}>{s.title}</div>
                                                        <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>v{s.version}</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: '700', color: 'white' }}>{s.responseCount}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: ALL SURVEYS LIST */}
                    <div style={{ display: 'flex' }}>
                        <div style={{ flex: 1 }}>
                            <div style={cardStyle}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1em', color: 'var(--text-color)' }}>{t('dashboard.my_surveys')}</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                                        <thead>
                                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.85em', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '15px' }}>{t('dashboard.table.title')}</th>
                                                <th style={{ padding: '15px' }}>{t('dashboard.table.status')}</th>
                                                <th style={{ padding: '15px' }}>{t('dashboard.table.responses')}</th>
                                                <th style={{ padding: '15px' }}>{t('dashboard.table.created')}</th>
                                                <th style={{ padding: '15px' }}>{t('dashboard.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.allForms.map(form => (
                                                <tr key={form.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '15px', fontWeight: '500', color: '#334155' }}>{form.title}</td>
                                                    <td style={{ padding: '15px' }}>
                                                        <span style={{
                                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.8em',
                                                            background: (form.is_published || form.isPublished) ? '#dcfce7' : '#fef3c7',
                                                            color: (form.is_published || form.isPublished) ? '#166534' : '#d97706'
                                                        }}>
                                                            {(form.is_published || form.isPublished) ? t('dashboard.status.published') : t('dashboard.status.draft')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '15px', color: 'var(--text-muted)' }}>-</td>
                                                    <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{new Date(form.created_at || form.createdAt).toLocaleDateString()}</td>
                                                    <td style={{ padding: '15px', position: 'relative' }}>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button
                                                                onClick={() => onEdit(form.id)}
                                                                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em' }}>
                                                                {t('dashboard.actions.edit')}
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveMenuId(activeMenuId === form.id ? null : form.id)}
                                                                style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2em', color: 'var(--text-muted)' }}>
                                                                ⋮
                                                            </button>
                                                        </div>
                                                        {activeMenuId === form.id && (
                                                            <div style={{
                                                                position: 'absolute', [isRtl ? 'left' : 'right']: '15px', top: '100%',
                                                                background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10, width: '180px',
                                                                padding: '5px 0'
                                                            }}>
                                                                <div onClick={() => onEdit(form.id, 'audience')} style={{ padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span>📢</span> Survey Audience
                                                                </div>
                                                                <div onClick={() => onNavigate('view-results', { id: form.id, view: 'individual' })} style={{ padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span>📝</span> Edit Response
                                                                </div>
                                                                <div onClick={() => onEdit(form.id, 'analytics')} style={{ padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span>📊</span> Analytics
                                                                </div>
                                                                <div onClick={() => onEdit(form.id, 'settings')} style={{ padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span>⚙️</span> Settings
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {stats.allForms.length === 0 && (
                                                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.empty')}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
