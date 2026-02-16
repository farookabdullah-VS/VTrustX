import React, { useMemo, useCallback } from 'react';
import './Dashboard.css';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { DashboardSkeleton } from './common/Skeleton';
import { StaggerContainer, StaggerItem, AnimatedCounter } from './common/AnimatedLayout';
import { EmptySurveys, EmptyResponses } from './common/EmptyState';
import { A11yAnnouncer } from './common/A11yAnnouncer';
import { DualDate } from './common/HijriDate';
import { StatusBadge } from './common/PremiumComponents';
import { ThemeBarChart } from './common/UnifiedChart';
import { Pagination, usePagination } from './common/Pagination';
import * as XLSX from 'xlsx';
import { Users, BarChart3, Zap, Sparkles, FileText, Settings, Calendar, ArrowUp, MoreVertical, Megaphone } from 'lucide-react';


export function Dashboard({ onNavigate, onEdit, onEditSubmission }) {
    const { t, i18n } = useTranslation();
    const { isDark } = useTheme();
    const isRtl = i18n.language === 'ar';
    const navigate = useNavigate();

    // Helper to use new routing when callbacks aren't provided
    const handleEdit = useCallback((formId) => {
        if (onEdit) onEdit(formId);
        else navigate(`/surveys/${formId}/edit`);
    }, [onEdit, navigate]);

    const handleViewResults = useCallback((formId) => {
        if (onNavigate) onNavigate('view-results', formId);
        else navigate(`/surveys/${formId}/results`);
    }, [onNavigate, navigate]);

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
        allForms: [],
        completionRate: 0,
        averageTime: null
    });

    const [activeMenuId, setActiveMenuId] = React.useState(null);
    const [surveyPage, setSurveyPage] = React.useState(1);
    const [surveyPageSize, setSurveyPageSize] = React.useState(10);

    const [loading, setLoading] = React.useState(false);



    React.useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            setLoading(true);
            try {
                const formsRes = await axios.get('/api/forms', { signal: controller.signal });
                const subsRes = await axios.get('/api/submissions', { signal: controller.signal });

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

                const newSubsCount = filteredSubmissions.filter(s => {
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

                const uniqueGroups = {};
                forms.forEach(f => {
                    const key = f.title.trim();
                    if (!uniqueGroups[key]) uniqueGroups[key] = { published: [], drafts: [] };
                    if (f.is_published || f.isPublished) uniqueGroups[key].published.push(f);
                    else uniqueGroups[key].drafts.push(f);
                });

                let activeCount = 0;
                let draftCount = 0;
                const displayForms = [];

                Object.values(uniqueGroups).forEach(group => {
                    if (group.published.length > 0) {
                        activeCount++;
                        // Show latest published version as the primary entry
                        displayForms.push(group.published.sort((a, b) => b.version - a.version)[0]);
                    } else {
                        draftCount++;
                        // Show latest draft
                        displayForms.push(group.drafts.sort((a, b) => b.version - a.version)[0]);
                    }
                });

                const uniqueSurveysCount = Object.keys(uniqueGroups).length;

                setStats({
                    totalSurveys: uniqueSurveysCount,
                    activeSurveys: activeCount,
                    draftSurveys: draftCount,
                    totalResponses: totalResponsesCount,
                    newResponses: newSubsCount,
                    topSurveys: topSurveys,
                    dailyTrend: calculateDailyTrend(filteredSubmissions, dateRange),
                    allForms: displayForms.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)),
                    completionRate: calculateCompletionRate(filteredSubmissions),
                    averageTime: calculateAverageTime(filteredSubmissions)
                });

            } catch (err) {
                console.error("Dashboard data load failed:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [dateRange]);

    // Calculate completion rate from submissions
    const calculateCompletionRate = (subs) => {
        if (subs.length === 0) return 0;
        const completed = subs.filter(s =>
            s.metadata?.status === 'completed' ||
            s.status === 'completed' ||
            s.metadata?.status === 'complete' ||
            s.status === 'complete' ||
            (!s.metadata?.status && !s.status) // Assume complete if no status
        ).length;
        return Math.round((completed / subs.length) * 100);
    };

    // Calculate average completion time
    const calculateAverageTime = (subs) => {
        const timesInSeconds = subs
            .map(s => s.metadata?.durationSeconds || s.metadata?.completion_time || s.durationSeconds || s.completion_time)
            .filter(t => t && !isNaN(t));

        if (timesInSeconds.length === 0) return null;

        const avgSeconds = timesInSeconds.reduce((sum, t) => sum + parseFloat(t), 0) / timesInSeconds.length;
        if (avgSeconds < 60) {
            return `${Math.round(avgSeconds)}s`;
        }
        const minutes = Math.floor(avgSeconds / 60);
        const seconds = Math.round(avgSeconds % 60);
        return `${minutes}m ${seconds}s`;
    };

    const calculateDailyTrend = (subs, range) => {
        const buckets = {};

        // Use the provided date range instead of hardcoded 7 days
        const start = new Date(range.start);
        const end = new Date(range.end);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Create buckets for each day in the range
        for (let i = 0; i < diffDays; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
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

        return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
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
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-color)', margin: 0, letterSpacing: '-1px' }}>{t('sidebar.item.dashboard')}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1em', marginTop: '5px' }}>{t('dashboard.overview')}</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <Calendar size={18} color="var(--primary-color)" />
                        <input
                            type="date"
                            aria-label="Start date"
                            value={dateRange.start}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                            style={{ border: 'none', color: 'var(--text-color)', background: 'transparent', fontWeight: '500', outline: 'none', fontFamily: 'inherit', colorScheme: isDark ? 'dark' : 'light', cursor: 'pointer' }}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                        <input
                            type="date"
                            aria-label="End date"
                            value={dateRange.end}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                            style={{ border: 'none', color: 'var(--text-color)', background: 'transparent', fontWeight: '500', outline: 'none', fontFamily: 'inherit', colorScheme: isDark ? 'dark' : 'light', cursor: 'pointer' }}
                        />
                    </div>


                </div>
            </div>

            {/* Screen reader announcements */}
            <A11yAnnouncer message={loading ? t('dashboard.loading') || 'Loading dashboard data' : ''} />

            {loading ? <DashboardSkeleton /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Metrics Row */}
                    <StaggerContainer staggerDelay={0.08} style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                        {/* METRIC 1: Total Responses (Blue Theme) */}
                        <StaggerItem style={{ flex: '1 1 250px', minWidth: '250px' }}>
                            <div style={{
                                ...cardStyle,
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.05) 100%)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.total_responses')}</div>
                                        <div style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--text-color)', marginTop: '8px', letterSpacing: '-2px' }}>
                                            <AnimatedCounter value={stats.totalResponses} />
                                        </div>
                                        <div style={{ fontSize: '0.9em', color: '#10b981', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                                            <ArrowUp size={14} />
                                            {stats.newResponses} new (24h)
                                        </div>
                                    </div>
                                    <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '14px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)' }}>
                                        <Users size={32} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        </StaggerItem>

                        {/* METRIC 2: Total Surveys (Purple/Red Theme) */}
                        <StaggerItem style={{ flex: '1 1 250px', minWidth: '250px' }}>
                            <div style={{
                                ...cardStyle,
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.05) 100%)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.total_surveys')}</div>
                                        <div style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--text-color)', marginTop: '8px', letterSpacing: '-2px' }}>
                                            <AnimatedCounter value={stats.totalSurveys} />
                                        </div>
                                        <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '5px', fontWeight: '500' }}>
                                            <span style={{ color: '#10b981' }}>{stats.activeSurveys} Active</span> • <span style={{ color: '#f59e0b' }}>{stats.draftSurveys} Draft</span>
                                        </div>
                                    </div>
                                    <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', padding: '14px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)' }}>
                                        <BarChart3 size={32} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        </StaggerItem>

                        {/* METRIC 3: Completion (Amber/Orange Theme) */}
                        <StaggerItem style={{ flex: '1 1 250px', minWidth: '250px' }}>
                            <div style={{
                                ...cardStyle,
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.05) 100%)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.metrics.avg_completion')}</div>
                                        <div style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--text-color)', marginTop: '8px', letterSpacing: '-2px' }}>
                                            {stats.completionRate}%
                                        </div>
                                        <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '5px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Zap size={14} /> {stats.averageTime ? `${stats.averageTime} avg` : 'No data yet'}
                                        </div>
                                    </div>
                                    <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '14px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.4)' }}>
                                        <Zap size={32} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        </StaggerItem>

                        {/* METRIC 4 */}
                        <StaggerItem style={{ flex: '1 1 250px', minWidth: '250px' }}>
                            <div style={{ ...cardStyle, background: 'var(--primary-gradient)', color: 'white', border: 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9em', fontWeight: '600', textTransform: 'uppercase' }}>{t('dashboard.metrics.ai_analysis')}</div>
                                        <div style={{ fontSize: '2rem', fontWeight: '700', marginTop: '10px', lineHeight: '1.2' }}>
                                            {stats.totalResponses > 0 ? 'Analysis Ready' : 'No Data Yet'}
                                        </div>
                                        <div style={{ fontSize: '0.9em', color: 'rgba(255,255,255,0.9)', marginTop: '10px' }}>
                                            {stats.totalResponses > 0 ? 'AI sentiment analysis coming soon' : 'Collect responses to enable AI analysis'}
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Sparkles size={32} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        </StaggerItem>
                    </StaggerContainer>

                    {/* Middle Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                        {/* CHART */}
                        <div style={{ flex: '2 1 600px', minWidth: '300px' }}>
                            <div style={cardStyle}>
                                <h2 style={{ margin: '0 0 20px 0', fontSize: '1.1em', color: 'var(--text-color)' }}>{t('dashboard.metrics.response_trends')}</h2>
                                {stats.dailyTrend && stats.dailyTrend.length > 0 && (
                                    <ThemeBarChart
                                        data={stats.dailyTrend.map(d => ({
                                            ...d,
                                            label: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                                        }))}
                                        xKey="label"
                                        yKey="count"
                                        height={300}
                                        color="var(--primary-color)"
                                        isRtl={isRtl}
                                    />
                                )}
                            </div>
                        </div>

                        {/* LIST */}
                        <div style={{ flex: '1 1 350px', minWidth: '300px' }}>
                            <div style={cardStyle}>
                                <h2 style={{ margin: '0 0 20px 0', fontSize: '1.1em', color: 'var(--text-color)' }}>{t('dashboard.metrics.top_performing')}</h2>
                                {stats.topSurveys.length === 0 ? <EmptyResponses /> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {stats.topSurveys.map((s, i) => (
                                            <div
                                                key={i}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => handleEdit(s.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleEdit(s.id);
                                                    }
                                                }}
                                                aria-label={`Edit survey: ${s.title}`}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: i < stats.topSurveys.length - 1 ? '1px solid var(--input-border)' : 'none', cursor: 'pointer' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', background: 'var(--input-bg)', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9em', fontWeight: 'bold' }}>
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-color)', fontSize: '0.95em' }}>{s.title}</div>
                                                        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>v{s.version}</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: '700', color: 'var(--text-color)' }}>{s.responseCount}</div>
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
                                <h2 style={{ margin: '0 0 20px 0', fontSize: '1.1em', color: 'var(--text-color)' }}>{t('dashboard.my_surveys')}</h2>
                                <div style={{ overflowX: 'auto' }}>
                                    <table role="table" aria-label="List of surveys" style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                                        <caption style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: '0' }}>
                                            My Surveys - Dashboard Overview
                                        </caption>
                                        <thead>
                                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.85em', borderBottom: '1px solid var(--input-border)' }}>
                                                <th scope="col" style={{ padding: '15px' }}>{t('dashboard.table.title')}</th>
                                                <th scope="col" style={{ padding: '15px' }}>{t('dashboard.table.status')}</th>
                                                <th scope="col" style={{ padding: '15px' }}>{t('dashboard.table.responses')}</th>
                                                <th scope="col" style={{ padding: '15px' }}>{t('dashboard.table.created')}</th>
                                                <th scope="col" style={{ padding: '15px' }}>{t('dashboard.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.allForms.slice((surveyPage - 1) * surveyPageSize, surveyPage * surveyPageSize).map(form => (
                                                <tr key={form.id} style={{ borderBottom: '1px solid var(--input-border)' }}>
                                                    <td style={{ padding: '15px', fontWeight: '500', color: 'var(--text-color)' }}>{form.title}</td>
                                                    <td style={{ padding: '15px' }}>
                                                        <StatusBadge
                                                            status={(form.is_published || form.isPublished) ? 'published' : 'draft'}
                                                            label={(form.is_published || form.isPublished) ? t('dashboard.status.published') : t('dashboard.status.draft')}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '15px', color: 'var(--text-muted)' }}>-</td>
                                                    <td style={{ padding: '15px', color: 'var(--text-muted)' }}>
                                                        <DualDate date={form.created_at || form.createdAt} compact />
                                                    </td>
                                                    <td style={{ padding: '15px', position: 'relative' }}>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button
                                                                onClick={() => handleEdit(form.id)}
                                                                style={{ padding: '6px 12px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', color: 'var(--text-color)' }}>
                                                                {t('dashboard.actions.edit')}
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveMenuId(activeMenuId === form.id ? null : form.id)}
                                                                aria-label={`More actions for ${form.title}`}
                                                                aria-expanded={activeMenuId === form.id}
                                                                aria-haspopup="true"
                                                                style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2em', color: 'var(--text-muted)' }}>
                                                                <MoreVertical size={20} />
                                                            </button>
                                                        </div>
                                                        {activeMenuId === form.id && (
                                                            <div
                                                                role="menu"
                                                                aria-label={`Actions for survey ${form.title}`}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Escape') {
                                                                        setActiveMenuId(null);
                                                                    }
                                                                }}
                                                                style={{
                                                                    position: 'absolute', [isRtl ? 'left' : 'right']: '15px', top: '100%',
                                                                    background: 'var(--card-bg)', border: '1px solid var(--input-border)', borderRadius: '8px',
                                                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10, width: '180px',
                                                                    padding: '5px 0'
                                                                }}
                                                            >
                                                                <button
                                                                    role="menuitem"
                                                                    onClick={() => { handleEdit(form.id, 'audience'); setActiveMenuId(null); }}
                                                                    style={{ width: '100%', padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', textAlign: isRtl ? 'right' : 'left' }}
                                                                >
                                                                    <Megaphone size={16} /> Survey Audience
                                                                </button>
                                                                <button
                                                                    role="menuitem"
                                                                    onClick={() => { handleViewResults(form.id); setActiveMenuId(null); }}
                                                                    style={{ width: '100%', padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', textAlign: isRtl ? 'right' : 'left' }}
                                                                >
                                                                    <FileText size={16} /> View Results
                                                                </button>
                                                                <button
                                                                    role="menuitem"
                                                                    onClick={() => { handleEdit(form.id, 'analytics'); setActiveMenuId(null); }}
                                                                    style={{ width: '100%', padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', textAlign: isRtl ? 'right' : 'left' }}
                                                                >
                                                                    <BarChart3 size={16} /> Analytics
                                                                </button>
                                                                <button
                                                                    role="menuitem"
                                                                    onClick={() => { handleEdit(form.id, 'settings'); setActiveMenuId(null); }}
                                                                    style={{ width: '100%', padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', textAlign: isRtl ? 'right' : 'left' }}
                                                                >
                                                                    <Settings size={16} /> Settings
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {stats.allForms.length === 0 && (
                                                <tr><td colSpan="5">
                                                    <EmptySurveys
                                                        onCreateSurvey={() => onNavigate('create-normal')}
                                                        onBrowseTemplates={() => onNavigate('templates')}
                                                    />
                                                </td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {stats.allForms.length > surveyPageSize && (
                                    <Pagination
                                        currentPage={surveyPage}
                                        totalItems={stats.allForms.length}
                                        pageSize={surveyPageSize}
                                        onPageChange={setSurveyPage}
                                        onPageSizeChange={(size) => { setSurveyPageSize(size); setSurveyPage(1); }}
                                        pageSizeOptions={[10, 25, 50]}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
