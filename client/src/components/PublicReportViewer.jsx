import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { BarChart2, Loader2, AlertCircle, FileText, Smartphone, Layout } from 'lucide-react';

// Common visual logic (re-using fragments from AnalyticsStudio)
// In a real app, these should be shared components
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area, AreaChart, FunnelChart, Funnel,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Treemap, ScatterChart, Scatter,
    RadialBarChart, RadialBar, Sankey
} from 'recharts';

const ResponsiveGridLayout = WidthProvider(Responsive);
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// --- Simplified Chart Renderer (Read-Only) ---
const PublicChartRenderer = ({ type, data, title, config = {}, fields }) => {
    // Shared Aggregation Logic
    const chartData = useMemo(() => {
        if (!data || data.length === 0 || !config.xKey) return [];
        const groups = {};
        const getVal = (row, key) => {
            if (!key) return 0;
            const num = parseFloat(row[key]);
            return !isNaN(num) ? num : 0;
        };
        const updateStats = (stats, val) => {
            if (!stats) stats = { sum: 0, count: 0, min: Infinity, max: -Infinity };
            stats.sum += val;
            stats.count += 1;
            stats.min = Math.min(stats.min, val);
            stats.max = Math.max(stats.max, val);
            return stats;
        };
        const getFinalValue = (stats, aggType) => {
            if (!stats) return 0;
            let type = aggType || 'count';
            switch (type) {
                case 'count': return stats.count;
                case 'sum': return stats.sum;
                case 'avg': return stats.count > 0 ? stats.sum / stats.count : 0;
                case 'min': return stats.min;
                case 'max': return stats.max;
                default: return stats.sum;
            }
        };

        data.forEach(row => {
            const xVal = row[config.xKey] || 'N/A';
            if (!groups[xVal]) groups[xVal] = { _primary: {}, _secondary: {} };
            const seriesVal = config.legendKey ? (row[config.legendKey] || 'Other') : 'value';
            const rawY = getVal(row, config.yKey);
            groups[xVal]._primary[seriesVal] = updateStats(groups[xVal]._primary[seriesVal], rawY);
        });

        return Object.entries(groups).map(([name, statObj]) => {
            const row = { name };
            Object.entries(statObj._primary).forEach(([series, stats]) => {
                row[series] = parseFloat(getFinalValue(stats, config.yAggregation).toFixed(2));
            });
            return row;
        });
    }, [data, config]);

    if (chartData.length === 0) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No data</div>;

    const seriesKeys = config.legendKey ? Object.keys(chartData[0]).filter(k => k !== 'name') : ['value'];
    const color = config.color || '#3b82f6';

    const renderChart = () => {
        switch (type) {
            case 'pie':
                return (
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={chartData} dataKey={seriesKeys[0]} nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'line':
                return (
                    <ResponsiveContainer>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
                            {seriesKeys.map((s, i) => <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} />)}
                        </LineChart>
                    </ResponsiveContainer>
                );
            default: // bar/column
                return (
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
                            {seriesKeys.map((s, i) => <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}
                        </BarChart>
                    </ResponsiveContainer>
                );
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {renderChart()}
        </div>
    );
};

export const PublicReportViewer = ({ token }) => {
    const [report, setReport] = useState(null);
    const [form, setForm] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await axios.get(`/api/reports/public/${token}`);
                const reportData = res.data.report;

                // Parse strings from DB
                if (typeof reportData.layout === 'string') reportData.layout = JSON.parse(reportData.layout);
                if (typeof reportData.widgets === 'string') reportData.widgets = JSON.parse(reportData.widgets);
                if (typeof reportData.fields === 'string') reportData.fields = JSON.parse(reportData.fields);
                if (typeof reportData.theme === 'string') reportData.theme = JSON.parse(reportData.theme);

                setReport(reportData);
                setForm(res.data.form);

                // Fetch real submissions for the report
                const subRes = await axios.get(`/api/submissions?formId=${reportData.form_id}`);
                setSubmissions(subRes.data);

                setLoading(false);
            } catch (err) {
                console.error("Public load error:", err);
                setError(err.response?.data?.error || "Link invalid or expired.");
                setLoading(false);
            }
        };
        fetchReport();
    }, [token]);

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <Loader2 className="animate-spin" size={48} color="#2563eb" style={{ marginBottom: '20px' }} />
            <div style={{ color: '#64748b', fontWeight: '500' }}>Loading Analytical Report...</div>
        </div>
    );

    if (error) return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', textAlign: 'center' }}>
            <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
            <h2 style={{ color: '#1e293b' }}>Report Unavailable</h2>
            <p style={{ color: '#64748b', maxWidth: '400px' }}>{error}</p>
            <button onClick={() => window.location.href = '/'} style={{ marginTop: '20px', padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Back to Home</button>
        </div>
    );

    const isPortrait = report.orientation === 'portrait';

    return (
        <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{
                maxWidth: isPortrait ? '900px' : '1200px',
                margin: '0 auto',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                minHeight: '800px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Public Header */}
                <div style={{ padding: '30px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#1e293b', fontSize: '1.75rem' }}>{report.title}</h1>
                        <p style={{ margin: '5px 0 0', color: '#64748b' }}>Survey Performance Insight Report</p>
                    </div>
                    {report.theme?.logo && <img src={report.theme.logo} style={{ height: '50px' }} />}
                </div>

                {/* Subscriptions / Meta */}
                <div style={{ background: '#f8fafc', padding: '15px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '30px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        <span style={{ fontWeight: '600', color: '#475569' }}>DATASET:</span> {form?.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        <span style={{ fontWeight: '600', color: '#475569' }}>RESPONSES:</span> {submissions.length}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        <span style={{ fontWeight: '600', color: '#475569' }}>GENERATED:</span> {new Date(report.updated_at).toLocaleDateString()}
                    </div>
                </div>

                {/* Grid Canvas (Read-Only) */}
                <div style={{ flex: 1, padding: '20px', position: 'relative' }}>
                    <ResponsiveGridLayout
                        className="layout"
                        layouts={{ lg: report.layout }}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={60}
                        width={isPortrait ? 860 : 1160}
                        isDraggable={false}
                        isResizable={false}
                        margin={[15, 15]}
                    >
                        {report.layout.map(l => {
                            const w = report.widgets[l.i];
                            if (!w) return null;
                            return (
                                <div key={l.i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ padding: '12px 18px', borderBottom: '1px solid #f8fafc', fontWeight: '700', fontSize: '0.95rem', color: '#334155', background: '#f8fafc' }}>
                                        {w.title}
                                    </div>
                                    <div style={{ flex: 1, padding: '15px', overflow: 'hidden' }}>
                                        <PublicChartRenderer
                                            type={w.type}
                                            config={w.config}
                                            data={submissions}
                                            fields={report.fields}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </ResponsiveGridLayout>
                </div>

                {/* Footer */}
                <div style={{ padding: '20px 40px', background: '#f8fafc', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                    Powered by VTrustX Analytical Studio © {new Date().getFullYear()}
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px', color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <FileText size={16} /> Secure Read-Only Link
            </div>
        </div>
    );
};

export default PublicReportViewer;
