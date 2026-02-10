import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area, AreaChart, FunnelChart, Funnel, LabelList,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Treemap, ScatterChart, Scatter, ZAxis,
    RadialBarChart, RadialBar, Sankey
} from 'recharts';
import {
    Play, StopCircle, Search, Save, Filter, Plus, Home, BarChart2,
    Settings, Server, Mic, MessageSquare, Tag, Terminal, FileText, Link as LinkIcon,
    Layout, LayoutGrid, GripVertical, X, Download, PieChart as PieIcon, Activity, Grid, Sidebar as SidebarIcon,
    ChevronRight, ChevronDown, List, MoreVertical, CreditCard, Calendar, Sliders, Minus,
    Paintbrush, Database, Loader2, Sparkles, AlertCircle, CheckCircle, Clock, User, Map, Smartphone, Globe,
    Zap, Share2, Trash2, Layers, Table, Printer, Type, Bold, Italic, Palette, PenTool, LayoutDashboard
} from 'lucide-react';
import { Chart as GoogleChart } from "react-google-charts";
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

import { getForms, getSubmissionsForForm } from '../../services/formService';
import { getReports, saveReport, deleteReport } from '../../services/reportService';
import { SurveyAnalystChat } from './SurveyAnalystChat';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// --- Helper to extract fields from Form Definition ---
const extractFieldsFromDefinition = (definition) => {
    const fields = [
        { name: 'submission_date', type: 'date', label: 'Response Date' }
    ];

    if (!definition || !definition.pages) return fields;

    const processElements = (elements) => {
        elements.forEach(el => {
            if (el.elements) {
                processElements(el.elements); // Recursive for Panel
            } else if (el.type === 'matrix') {
                if (el.rows) {
                    el.rows.forEach(row => {
                        const rowName = typeof row === 'object' ? row.value : row;
                        const rowLabel = typeof row === 'object' ? row.text : row;
                        fields.push({
                            name: `${el.name}.${rowName}`,
                            type: 'category',
                            label: `${el.title || el.name} - ${rowLabel}`
                        });
                    });
                }
            } else if (el.name) {
                let type = 'category';
                if (el.type === 'rating' || (el.type === 'text' && el.inputType === 'number')) {
                    type = 'number';
                }
                fields.push({ name: el.name, type, label: el.title || el.name });
            }
        });
    };

    definition.pages.forEach(page => {
        if (page.elements) processElements(page.elements);
    });
    return fields;
};


// --- Visual Components ---

const KPICard = ({ title, value, target, trend }) => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
        <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>{title || 'KPI Title'}</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e293b' }}>{value || '0'}</div>
        {target && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Target: {target}</div>}
        {trend && <div style={{ fontSize: '0.8rem', color: trend > 0 ? '#10b981' : '#ef4444' }}>{trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%</div>}
    </div>
);

const TableVisual = ({ data }) => (
    <div style={{ height: '100%', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    {Object.keys(data[0] || {}).map(k => <th key={k} style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{k}</th>)}
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => (
                    <tr key={i}>
                        {Object.values(row).map((v, j) => <td key={j} style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{v}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const KeyDriverVisual = ({ surveyId, targetMetric }) => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!surveyId || !targetMetric) return;

        setLoading(true);
        axios.post('/api/analytics/key-drivers', { surveyId, targetMetric })
            .then(res => {
                if (res.data.drivers) setDrivers(res.data.drivers);
                else if (res.data.error) setError(res.data.error);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Failed to load analysis");
                setLoading(false);
            });
    }, [surveyId, targetMetric]);

    if (!targetMetric) return <div style={{ padding: '20px', color: '#94a3b8' }}>Select a target metric (e.g., NPS) in settings.</div>;
    if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Analyzing Correlations...</div>;
    if (error) return <div style={{ padding: '20px', color: '#ef4444' }}>{error}</div>;
    if (drivers.length === 0) return <div style={{ padding: '20px', color: '#94a3b8' }}>No significant drivers found.</div>;

    return (
        <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>
                <span>Driver (Question)</span>
                <span>Impact</span>
            </div>
            {drivers.map((d, i) => (
                <div key={i} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.key}>{d.key}</div>
                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.abs(d.correlation) * 100}%`, background: d.correlation > 0 ? '#10b981' : '#ef4444' }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Dataset Visualizer (Spreadsheet View) ---
const DatasetViewer = ({ data, fields, filters, onFilterChange }) => {
    return (
        <div style={{ padding: '20px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b' }}>Dataset View</h3>
                    <div style={{ background: '#e2e8f0', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', color: '#475569' }}>
                        Raw Data
                    </div>
                </div>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    Showing {data.length} rows
                    {Object.keys(filters).length > 0 && <span style={{ color: '#2563eb', fontWeight: 'bold' }}> (Filtered)</span>}
                </span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                        <tr>
                            {fields.map(field => {
                                const isFiltered = filters[field.name] && filters[field.name].length > 0;
                                return (
                                    <th key={field.name} style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', minWidth: '150px', borderRight: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: '600', color: '#334155' }}>{field.label || field.name}</span>
                                            <div style={{ position: 'relative', cursor: 'pointer' }} title="Filter">
                                                <div
                                                    onClick={(e) => {
                                                        const val = prompt(`Filter ${field.label} (Exact Match):`, filters[field.name]?.[0] || '');
                                                        if (val !== null) {
                                                            if (val === '') onFilterChange(field.name, null); // Clear
                                                            else onFilterChange(field.name, [val]);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '4px', borderRadius: '4px',
                                                        background: isFiltered ? '#eff6ff' : 'transparent',
                                                        border: isFiltered ? '1px solid #3b82f6' : '1px solid transparent'
                                                    }}
                                                >
                                                    <Filter
                                                        size={14}
                                                        color={isFiltered ? '#2563eb' : '#94a3b8'}
                                                        fill={isFiltered ? '#2563eb' : 'none'}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {data.slice(0, 500).map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                {fields.map(field => (
                                    <td key={field.name} style={{ padding: '8px 12px', color: '#334155', borderRight: '1px solid #f1f5f9' }}>
                                        {row[field.name] !== undefined ? String(row[field.name]) : '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length > 500 && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #e2e8f0' }}>
                        Showing first 500 rows...
                    </div>
                )}
            </div>
        </div>
    );
};



// --- Slicer Components ---

const WordCloudVisual = ({ surveyId, textField, sentimentMetric, onFilterChange, textFieldName }) => {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!surveyId || !textField) return;

        setLoading(true);
        axios.post('/api/analytics/text-analytics', { surveyId, textField, sentimentMetric })
            .then(res => {
                if (res.data.words) setWords(res.data.words);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [surveyId, textField, sentimentMetric]);

    if (!textField) return <div style={{ padding: '20px', color: '#94a3b8' }}>Select a text field to analyze.</div>;
    if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Analyzing Text...</div>;
    if (words.length === 0) return <div style={{ padding: '20px', color: '#94a3b8' }}>No data found.</div>;

    // Normalize sizes
    const maxVal = Math.max(...words.map(w => w.value));
    const minVal = Math.min(...words.map(w => w.value));

    return (
        <div style={{ padding: '10px', height: '100%', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {words.map((w, i) => {
                const size = 12 + ((w.value - minVal) / (maxVal - minVal || 1)) * 24; // 12px to 36px
                // Color by sentiment if available (0-10 scale assumed, or similar)
                let color = '#64748b';
                if (w.sentiment) {
                    const s = parseFloat(w.sentiment);
                    if (s > 8) color = '#16a34a'; // Green
                    else if (s < 6) color = '#dc2626'; // Red
                    else color = '#d97706'; // Orange
                }

                return (
                    <span
                        key={i}
                        onClick={() => onFilterChange && onFilterChange(textFieldName, [w.text])} // Filter by the word
                        style={{
                            fontSize: `${size}px`,
                            color: color,
                            cursor: 'pointer',
                            padding: '4px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 0.7}
                        onMouseLeave={e => e.currentTarget.style.opacity = 1}
                        title={`Frequency: ${w.value}, Sentiment: ${w.sentiment || 'N/A'}`}
                    >
                        {w.text}
                    </span>
                );
            })}
        </div>
    );
};

const StatSigVisual = ({ surveyId }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!surveyId) return;
        setLoading(true);
        axios.post('/api/analytics/nps-significance', { surveyId })
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [surveyId]);

    if (!surveyId) return <div style={{ padding: '20px', color: '#94a3b8' }}>Bind report to survey first.</div>;
    if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Running Z-Test...</div>;
    if (!stats || stats.status === 'insufficient_data') return <div style={{ padding: '20px', color: '#94a3b8' }}>Insufficient data for significance testing.</div>;

    const isGood = stats.verdict.includes('Improvement');
    const isBad = stats.verdict.includes('Decline');

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: isGood ? '#16a34a' : (isBad ? '#dc2626' : '#64748b'), marginBottom: '8px' }}>
                {stats.verdict}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '15px' }}>
                95% Confidence Level
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline' }}>
                <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{stats.currentNPS}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Month</div>
                </div>
                <div style={{ fontSize: '1rem', color: '#cbd5e1' }}>vs</div>
                <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#94a3b8' }}>{stats.previousNPS}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Previous Month</div>
                </div>
            </div>
        </div>
    );
};

const PivotVisual = ({ surveyId, rowField, colField, valueField, operation }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!surveyId || !rowField || !colField) return;

        setLoading(true);
        axios.post('/api/analytics/cross-tab', { surveyId, rowField, colField, valueField, operation })
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [surveyId, rowField, colField, valueField, operation]);

    if (!rowField || !colField) return <div style={{ padding: '20px', color: '#94a3b8' }}>Configure rows and columns.</div>;
    if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Calculating Pivot...</div>;
    if (!data || !data.rows.length) return <div style={{ padding: '20px', color: '#94a3b8' }}>No data.</div>;

    return (
        <div style={{ padding: '10px', height: '100%', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                    <tr>
                        <th style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', background: '#f8fafc', position: 'sticky', top: 0 }}>
                            {rowField} / {colField}
                        </th>
                        {data.cols.map(c => (
                            <th key={c} style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', textAlign: 'right', background: '#f8fafc', position: 'sticky', top: 0 }}>
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map(r => {
                        const rowData = data.data.find(d => d.name === r) || {};
                        return (
                            <tr key={r}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: '500', color: '#475569' }}>{r}</td>
                                {data.cols.map(c => (
                                    <td key={c} style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#1e293b' }}>
                                        {rowData[c] || 0}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const AnomalyVisual = ({ surveyId, targetMetric }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!surveyId || !targetMetric) return;

        setLoading(true);
        axios.post('/api/analytics/anomalies', { surveyId, targetMetric })
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [surveyId, targetMetric]);

    if (!targetMetric) return <div style={{ padding: '20px', color: '#94a3b8' }}>Select a metric to watch.</div>;
    if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Scanning for Anomalies...</div>;
    if (!data || data.status === 'insufficient_data') return <div style={{ padding: '20px', color: '#94a3b8' }}>Need at least 10 days of data.</div>;

    const hasAnomalies = data.anomalies.length > 0;

    return (
        <div style={{ padding: '15px', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Baseline (60 Days)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{parseFloat(data.mean).toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#94a3b8' }}>± {parseFloat(data.stdDev).toFixed(1)}</span></div>
                </div>
                {!hasAnomalies && <div style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.85rem' }}>All Clear</div>}
                {hasAnomalies && <div style={{ color: '#dc2626', fontWeight: '600', fontSize: '0.85rem' }}>{data.anomalies.length} ALERTS</div>}
            </div>

            {data.anomalies.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '40px', color: '#cbd5e1' }}>
                    <CheckCircle size={48} style={{ marginBottom: '10px' }} />
                    <p>No statistical anomalies detected in the last 7 days.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.anomalies.map((a, i) => (
                        <div key={i} style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '12px', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 'bold', color: '#991b1b', fontSize: '0.85rem' }}>{a.type === 'spike' ? '📈 Spike Detected' : '📉 Drop Detected'}</span>
                                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{a.date}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#b91c1c', marginBottom: '4px' }}>Value: {a.value}</div>
                            <div style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>{a.message}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SlicerRenderer = ({ type, data, title, field, activeFilters, onFilterChange }) => {
    const distinctValues = useMemo(() => {
        if (!data || !field) return [];
        const values = data.map(row => row[field]).filter(v => v !== undefined && v !== null);
        return [...new Set(values.map(String))].sort();
    }, [data, field]);

    if (type === 'slicer_date') {
        return (
            <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>{title || 'Date Range'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="date" style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.75rem', width: '100px' }} />
                    <span style={{ color: '#94a3b8' }}>-</span>
                    <input type="date" style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.75rem', width: '100px' }} />
                </div>
            </div>
        );
    }

    if (type === 'slicer_button') {
        return (
            <div style={{ padding: '10px', height: '100%' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>{title || 'Filter'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {distinctValues.length > 0 ? distinctValues.map(v => (
                        <button key={v} style={{ padding: '4px 8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: '#334155' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                            {String(v)}
                        </button>
                    )) : <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No data</div>}
                </div>
            </div>
        );
    }

    // Default: Dropdown / List Slicer
    const handleToggle = (val) => {
        const current = activeFilters || [];
        const newFilters = current.includes(val)
            ? current.filter(c => c !== val)
            : [...current, val];
        if (onFilterChange) onFilterChange(field, newFilters);
    };

    return (
        <div style={{ padding: '10px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                {title || 'Filter'}
                <div style={{ display: 'flex', gap: '5px' }}>
                    {activeFilters?.length > 0 && (
                        <Filter size={14} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => onFilterChange && onFilterChange(field, [])} title="Clear Filter" />
                    )}
                    <Search size={14} color="#94a3b8" />
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                {distinctValues.length > 0 ? distinctValues.map(v => (
                    <div key={v}
                        style={{ padding: '6px 10px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', background: activeFilters?.includes(v) ? '#eff6ff' : 'transparent', cursor: 'pointer' }}
                        onClick={() => handleToggle(v)}
                    >
                        <input type="checkbox" checked={activeFilters?.includes(v) || false} readOnly />
                        <span style={{ fontWeight: activeFilters?.includes(v) ? '600' : '400', color: activeFilters?.includes(v) ? '#2563eb' : '#334155' }}>{String(v)}</span>
                    </div>
                )) : <div style={{ padding: '10px', fontSize: '0.75rem', color: '#94a3b8' }}>No values found</div>}
            </div>
        </div>
    );
};

const ChartRenderer = ({ type, data, title, config = {}, filters = {}, onFilterChange, fullData, fields }) => {
    // Hooks MUST be at the top
    const chartData = useMemo(() => {
        if (!data || data.length === 0 || !config.xKey) return [];

        // Aggregation Logic (Now supports grouping by LegendKey)
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

        const getFinalValue = (stats, aggType, fieldKey, isMeasure) => {
            if (!stats) return 0;
            // Default inference
            let type = aggType;
            if (!type || type === 'auto') {
                if (fieldKey) {
                    const fieldDef = fields?.find(f => f.name === fieldKey);
                    // Measures default to their defined agg, others default to sum (if numeric) or count
                    if (fieldDef?.isMeasure) type = fieldDef.aggregation;
                    else type = 'sum';
                } else {
                    type = 'count';
                }
            }

            switch (type) {
                case 'count': return stats.count;
                case 'sum': return stats.sum;
                case 'avg': return stats.count > 0 ? stats.sum / stats.count : 0;
                case 'min': return stats.min === Infinity ? 0 : stats.min;
                case 'max': return stats.max === -Infinity ? 0 : stats.max;
                default: return stats.sum; // fallback
            }
        };

        data.forEach(row => {
            const xVal = row[config.xKey] || 'N/A';
            if (!groups[xVal]) groups[xVal] = { _primary: {}, _secondary: {} };

            // Primary Y Logic
            const seriesVal = config.legendKey ? (row[config.legendKey] || 'Other') : 'value';

            // For count agg, we just need row existence (val ignored actually, but standardizing on 1 for count logic elsewhere)
            // But for min/max/avg we need the actual numeric magnitude.
            // If explicit count, value itself matters less, but let's just get the raw numeric value.
            const rawY = getVal(row, config.yKey);
            groups[xVal]._primary[seriesVal] = updateStats(groups[xVal]._primary[seriesVal], rawY);

            // Secondary Y Logic
            if (config.secondaryYKey) {
                const rawSecY = getVal(row, config.secondaryYKey);
                groups[xVal]._secondary.lineValue = updateStats(groups[xVal]._secondary.lineValue, rawSecY);
            }
        });

        // Flatten and Compute Finals
        return Object.entries(groups).map(([name, statObj]) => {
            const row = { name };

            // Process Primary
            Object.entries(statObj._primary).forEach(([series, stats]) => {
                row[series] = parseFloat(getFinalValue(stats, config.yAggregation, config.yKey, true).toFixed(2));
            });

            // Process Secondary
            if (config.secondaryYKey && statObj._secondary.lineValue) {
                row.lineValue = parseFloat(getFinalValue(statObj._secondary.lineValue, config.secondaryYAggregation, config.secondaryYKey, true).toFixed(2));
            }
            return row;
        });
    }, [data, config.xKey, config.yKey, config.legendKey, fields]);

    // Calculate unique series keys for dynamic Bars/Lines
    const seriesKeys = useMemo(() => {
        if (!config.legendKey || chartData.length === 0) return [];
        // Extract all keys from all data points, excluding 'name'
        const keys = new Set();
        chartData.forEach(row => {
            Object.keys(row).forEach(k => {
                if (k !== 'name') keys.add(k);
            });
        });
        return Array.from(keys);
    }, [chartData, config.legendKey]);

    if (type.startsWith('slicer_')) {
        return <SlicerRenderer type={type} data={fullData || data} title={title} field={config.xKey} activeFilters={filters[config.xKey]} onFilterChange={onFilterChange} />;
    }

    if (chartData.length === 0 && !type.startsWith('slicer_')) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.8rem' }}>Drag fields to X and Y axis to see data</div>;
    }

    const xKey = config.xKey || (type === 'scatter' ? 'val' : 'name');
    const yKey = config.yKey ? config.yKey : 'value';
    const singleSeriesKey = 'value';

    const showLegend = config.showLegend !== false;
    const xAxisLabel = config.xAxisAxisTitleText || '';
    const yAxisLabel = config.yAxisAxisTitleText || '';

    const color = config.color || '#0088FE';
    const getColor = (key, idx) => config.seriesColors?.[key] || COLORS[idx % COLORS.length];

    // --- Dynamic Axis Styling ---
    const getAxisTickStyle = (axis) => ({
        fontSize: parseInt(config[`${axis}AxisFontSize`] || 12),
        fill: config[`${axis}AxisColor`] || '#64748b',
        fontWeight: config[`${axis}AxisBold`] ? 'bold' : 'normal',
        fontStyle: config[`${axis}AxisItalic`] ? 'italic' : 'normal',
        fontFamily: config[`${axis}AxisFont`] || 'sans-serif',
        textDecoration: config[`${axis}AxisUnderline`] ? 'underline' : 'none'
    });

    const getAxisLabel = (axis) => {
        if (config[`${axis}AxisShowTitle`] === false) return undefined; // Default to true if undefined? Or false? Let's assume true by default if title text exists

        // If "Auto" (empty) and we have a key, use the key or label. 
        const key = config[`${axis}Key`];
        const agg = config[`${axis}Aggregation`];

        let defaultTitle = key ? (fields?.find(f => f.name === key)?.label || key) : '';

        // Append Aggregation if present
        if (agg && agg !== 'auto' && defaultTitle) {
            const aggLabel = agg.charAt(0).toUpperCase() + agg.slice(1);
            defaultTitle = `${aggLabel} of ${defaultTitle}`;
        }

        const titleText = config[`${axis}AxisTitleText`] || defaultTitle;

        if (!titleText) return undefined;

        return {
            value: titleText,
            angle: axis === 'x' ? 0 : -90,
            position: axis === 'x' ? 'insideBottom' : 'insideLeft',
            offset: axis === 'x' ? -10 : 10,
            style: {
                fontSize: parseInt(config[`${axis}AxisTitleFontSize`] || 14),
                fill: config[`${axis}AxisTitleColor`] || '#334155',
                fontWeight: config[`${axis}AxisTitleBold`] ? 'bold' : 'normal',
                fontStyle: config[`${axis}AxisTitleItalic`] ? 'italic' : 'normal',
                fontFamily: config[`${axis}AxisTitleFont`] || 'sans-serif',
                textAnchor: 'middle'
            }
        };
    };

    const xAxisProps = {
        dataKey: "name",
        type: type === 'bar' && !config.swapAxis ? "category" : (config.swapAxis ? "number" : "category"), // Simple heuristic
        hide: config.hideXAxis,
        tick: config.xAxisShowValues !== false ? { ...getAxisTickStyle('x') } : false,
        label: getAxisLabel('x'),
        height: parseInt(config.xAxisHeight || 60),
        tickMargin: 10
    };

    const yAxisProps = {
        hide: config.hideYAxis,
        tick: config.yAxisShowValues !== false ? { ...getAxisTickStyle('y') } : false,
        label: getAxisLabel('y'),
        width: parseInt(config.yAxisWidth || 60),
        tickMargin: 10
    };
    // Secondary Y Axis for combo charts
    const getSecondaryLabel = () => {
        if (!config.secondaryYKey) return undefined;

        const key = config.secondaryYKey;
        const agg = config.secondaryYAggregation;
        let label = fields?.find(f => f.name === key)?.label || key;

        if (agg && agg !== 'auto') {
            label = `${agg.charAt(0).toUpperCase() + agg.slice(1)} of ${label}`;
        }

        return {
            value: label,
            angle: 90,
            position: 'insideRight',
            style: { fill: '#94a3b8', fontSize: 12 }
        };
    };

    const secondaryYAxisProps = {
        orientation: "right",
        yAxisId: "right",
        tick: config.secondaryYAxisShowValues !== false ? { ...getAxisTickStyle('y') } : false, // Re-use Y styling for now
        label: getSecondaryLabel()
    };

    const handleClick = (data, index) => {
        if (!onFilterChange) return;

        let key = null;
        let value = null;

        // 1. Check Legend/Series click (e.g. clicking a bar segment or legend item)
        if (data && data.dataKey && config.legendKey) {
            key = config.legendKey;
            value = data.dataKey;
        }
        // 2. Check Categorical/X-Axis click (Bar, Line activePayload - clicking the axis/column background)
        else if (data && data.activePayload && data.activePayload.length > 0 && config.xKey) {
            key = config.xKey;
            value = data.activePayload[0].payload.name;
        }
        // 3. Check Direct Item click (Pie, Funnel, Treemap returning item data directly)
        else if (data && data.name && config.xKey) {
            key = config.xKey;
            value = data.name;
        }

        if (key && value !== null) {
            const strVal = String(value);
            const currentFilters = filters[key] || [];

            // Toggle Logic: If currently filtered by this value, clear it. Else, set it.
            if (currentFilters.includes(strVal)) {
                onFilterChange(key, []);
            } else {
                onFilterChange(key, [strVal]);
            }
        }
    };

    const commonProps = {
        margin: { top: 10, right: 30, left: 10, bottom: 20 },
        onClick: handleClick,  // Keep this for chart background/axis
    };

    const elementProps = {
        onClick: handleClick,
        cursor: 'pointer'
    };

    switch (type) {
        case 'bar':
        case 'column': {
            const isHorizontal = type === 'bar' || config.swapAxis;
            return (
                <ResponsiveContainer>
                    <BarChart data={chartData} layout={isHorizontal ? 'vertical' : 'horizontal'} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" vertical={isHorizontal} horizontal={!isHorizontal} />
                        {isHorizontal ? (
                            <>
                                <XAxis type="number" {...xAxisProps} />
                                <YAxis dataKey="name" type="category" {...yAxisProps} />
                            </>
                        ) : (
                            <>
                                <XAxis {...xAxisProps} />
                                <YAxis {...yAxisProps} />
                            </>
                        )}

                        <Tooltip />
                        {showLegend && <Legend />}
                        {config.legendKey && seriesKeys.length > 0 ? (
                            seriesKeys.map((s, i) => (
                                <Bar key={s} dataKey={s} fill={getColor(s, i)} radius={[0, 4, 4, 0]} {...elementProps} />
                            ))
                        ) : (
                            <Bar dataKey={singleSeriesKey} fill={color} radius={[4, 4, 0, 0]} {...elementProps} />
                        )}
                    </BarChart>
                </ResponsiveContainer >
            );
        }
        case 'stacked_bar':
            return (
                <ResponsiveContainer>
                    <BarChart data={chartData} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" label={xAxisLabel} />
                        <YAxis label={yAxisLabel} />
                        <Tooltip />
                        {showLegend && <Legend />}
                        {config.legendKey && seriesKeys.length > 0 ? (
                            seriesKeys.map((s, i) => (
                                <Bar key={s} dataKey={s} stackId="a" fill={getColor(s, i)} {...elementProps} />
                            ))
                        ) : (
                            <Bar dataKey={singleSeriesKey} stackId="a" fill={color} {...elementProps} />
                        )}
                    </BarChart>
                </ResponsiveContainer>
            );
        case 'line':
            return (
                <ResponsiveContainer>
                    <LineChart data={chartData} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" label={xAxisLabel} /><YAxis label={yAxisLabel} /><Tooltip />
                        {showLegend && <Legend />}
                        {config.legendKey && seriesKeys.length > 0 ? (
                            seriesKeys.map((s, i) => (
                                <Line key={s} type="monotone" dataKey={s} stroke={getColor(s, i)} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} {...elementProps} />
                            ))
                        ) : (
                            <Line type="monotone" dataKey={singleSeriesKey} stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} {...elementProps} />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            );
        case 'area':
            return (
                <ResponsiveContainer>
                    <AreaChart data={chartData} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" label={xAxisLabel} /><YAxis label={yAxisLabel} /><Tooltip />
                        {showLegend && <Legend />}
                        {config.legendKey && seriesKeys.length > 0 ? (
                            seriesKeys.map((s, i) => (
                                <Area key={s} type="monotone" dataKey={s} stackId="1" stroke={getColor(s, i)} fill={getColor(s, i)} fillOpacity={0.3} {...elementProps} />
                            ))
                        ) : (
                            <Area type="monotone" dataKey={singleSeriesKey} stroke={color} fill={color} fillOpacity={0.3} {...elementProps} />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            );
        case 'pie':
        case 'donut':
            return (
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={chartData} dataKey={singleSeriesKey} nameKey="name" cx="50%" cy="50%"
                            outerRadius="70%" innerRadius={type === 'donut' ? "45%" : 0}
                            fill={color} label
                            onClick={handleClick}
                        >
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />)}
                        </Pie>
                        <Tooltip />
                        {showLegend && <Legend />}
                    </PieChart>
                </ResponsiveContainer>
            );
        case 'radar':
            return (
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: '0.75rem', fill: '#64748b' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                        {config.legendKey && seriesKeys.length > 0 ? (
                            seriesKeys.map((s, i) => (
                                <Radar key={s} name={s} dataKey={s} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.5} onClick={handleClick} cursor="pointer" />
                            ))
                        ) : (
                            <Radar name={title} dataKey={singleSeriesKey} stroke={color} fill={color} fillOpacity={0.5} onClick={handleClick} cursor="pointer" />
                        )}
                        {showLegend && <Legend />}
                        <Tooltip />
                    </RadarChart>
                </ResponsiveContainer>
            );
        case 'treemap':
            return (
                <ResponsiveContainer>
                    <Treemap data={chartData} dataKey={singleSeriesKey} aspectRatio={4 / 3} stroke="#fff" fill={color} onClick={handleClick} style={{ cursor: 'pointer' }}>
                        <Tooltip />
                    </Treemap>
                </ResponsiveContainer>
            );
        case 'map': {
            const mapData = [['Country', 'Value']];
            chartData.forEach(d => {
                mapData.push([d.name, d[singleSeriesKey] || 0]);
            });
            return (
                <div style={{ width: '100%', height: '100%' }}>
                    <GoogleChart
                        chartType="GeoChart"
                        width="100%"
                        height="100%"
                        data={mapData}
                        options={{
                            colorAxis: { colors: ['#e0f2fe', '#0284c7'] },
                            backgroundColor: 'transparent',
                            datalessRegionColor: '#f8fafc',
                            defaultColor: '#f5f5f5',
                        }}
                        chartEvents={[
                            {
                                eventName: 'select',
                                callback: ({ chartWrapper }) => {
                                    const chart = chartWrapper.getChart();
                                    const selection = chart.getSelection();
                                    if (selection.length > 0) {
                                        const item = selection[0];
                                        if (item.row !== null && item.row !== undefined) {
                                            if (chartData[item.row]) {
                                                handleClick(chartData[item.row], item.row);
                                            }
                                        }
                                    }
                                },
                            },
                        ]}
                    />
                </div>
            );
        }
        case 'funnel':
            return (
                <ResponsiveContainer>
                    <FunnelChart>
                        <Tooltip />
                        <Funnel dataKey={singleSeriesKey} data={chartData} isAnimationActive onClick={handleClick} cursor="pointer">
                            <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                        </Funnel>
                    </FunnelChart>
                </ResponsiveContainer>
            );
        case 'radial':
            return (
                <ResponsiveContainer>
                    <RadialBarChart innerRadius="10%" outerRadius="80%" barSize={10} data={chartData}>
                        <RadialBar minAngle={15} label={{ position: 'insideStart', fill: '#fff' }} background clockWise dataKey={singleSeriesKey} fill={color} onClick={handleClick} cursor="pointer" />
                        <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ top: 0, left: 0, lineHeight: '24px' }} />
                        <Tooltip />
                    </RadialBarChart>
                </ResponsiveContainer>
            );
        case 'kpi':
            return <KPICard title={title} value={chartData[0]?.[singleSeriesKey] || "0"} trend={null} />;
        case 'key_driver':
            return <KeyDriverVisual surveyId={config.surveyId} targetMetric={config.targetMetric} />;
        case 'word_cloud':
            return (
                <WordCloudVisual
                    surveyId={config.surveyId}
                    textField={config.xKey} // Reusing xKey for text field to keep schema simple
                    textFieldName={config.xKey}
                    sentimentMetric={config.targetMetric} // Reusing targetMetric
                    onFilterChange={onFilterChange}
                />
            );
        case 'stat_sig':
            return <StatSigVisual surveyId={config.surveyId} />;
        case 'pivot':
            return (
                <PivotVisual
                    surveyId={config.surveyId}
                    rowField={config.xKey}
                    colField={config.legendKey}
                    valueField={config.yKey}
                    operation={config.operation || 'count'}
                />
            );
        case 'anomaly':
            return <AnomalyVisual surveyId={config.surveyId} targetMetric={config.targetMetric} />;
        case 'table':
            return <TableVisual data={chartData} />;
        case 'line_stacked_column':
        case 'line_clustered_column':
            return (
                <ResponsiveContainer>
                    <ComposedChart data={chartData} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis {...xAxisProps} />
                        <YAxis yAxisId="left" {...yAxisProps} />
                        <YAxis {...secondaryYAxisProps} />
                        <Tooltip />
                        {showLegend && <Legend />}
                        {config.legendKey && seriesKeys.length > 0 ? (
                            seriesKeys.map((s, i) => (
                                <Bar key={s} dataKey={s} stackId={type === 'line_stacked_column' ? "a" : undefined} fill={getColor(s, i)} yAxisId="left" {...elementProps} />
                            ))
                        ) : (
                            <Bar dataKey={singleSeriesKey} fill={color} yAxisId="left" {...elementProps} />
                        )}
                        {config.secondaryYKey && (
                            <Line yAxisId="right" type="monotone" dataKey="lineValue" name={config.secondaryYKey} stroke="#ff7300" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} {...elementProps} />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            );
        case 'card_date':
            return (
                <div style={{
                    height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#334155', padding: '10px'
                }}>
                    <Calendar size={24} color="#64748b" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                        {chartData[0] ? new Date(chartData[0].name).toLocaleDateString() : '-'}
                    </div>
                </div>
            );
        case 'text':
            return (
                <div style={{
                    width: '100%', height: '100%',
                    fontSize: config.textSize ? parseInt(config.textSize) : 16,
                    fontFamily: config.textFont || 'sans-serif',
                    fontStyle: config.textItalic ? 'italic' : 'normal',
                    fontWeight: config.textBold ? 'bold' : 'normal',
                    color: config.textColor || '#1e293b',
                    backgroundColor: config.textBgColor || 'transparent',
                    textAlign: config.textAlign || 'left',
                    padding: '10px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    display: 'flex',
                    alignItems: config.textAlign === 'center' ? 'center' : 'flex-start',
                    justifyContent: config.textAlign === 'center' ? 'center' : (config.textAlign === 'right' ? 'flex-end' : 'flex-start')
                }}>
                    {config.textContent || 'Double click to edit text'}
                </div>
            );
        default:
            return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>Visual type not supported</div>;
    }
};

// --- Application Components ---

const ReportList = ({ onOpenReport, onCreateReport }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = () => {
        setLoading(true);
        getReports().then(data => {
            setReports(data || []);
            setLoading(false);
        }).catch(err => setLoading(false));
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this report?')) {
            try {
                await deleteReport(id);
                loadReports();
            } catch (err) {
                alert('Failed to delete report');
            }
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>Analytical Studio</h1>
                    <p style={{ color: '#64748b' }}>Create, design, and analyze survey-based reports.</p>
                </div>
                <button
                    onClick={onCreateReport}
                    style={{ padding: '12px 24px', background: 'var(--primary-color, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={20} /> New Report
                </button>
            </div>

            <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={18} /> Your Reports
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
                {reports.filter(r => !r.is_published).map(r => (
                    <ReportCard key={r.id} r={r} onOpen={onOpenReport} onDelete={handleDelete} />
                ))}
            </div>

            {reports.some(r => r.is_published) && (
                <>
                    <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Share2 size={18} /> Publicly Shared / Published
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
                        {reports.filter(r => r.is_published).map(r => (
                            <ReportCard key={r.id} r={r} onOpen={onOpenReport} onDelete={handleDelete} isPublic={true} />
                        ))}
                    </div>
                </>
            )}

            {reports.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8' }}>
                    <BarChart2 size={64} style={{ marginBottom: '20px', opacity: 0.2 }} />
                    <p>No reports found. Create your first report to get started!</p>
                </div>
            )}
        </div>
    );
};

function ReportCard({ r, onOpen, onDelete, isPublic }) {
    return (
        <div onClick={() => onOpen(r)} style={{ background: 'white', border: isPublic ? '1px solid #10b981' : '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            {isPublic && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#10b981', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={10} /> PUBLIC
                </div>
            )}
            <div style={{ height: '140px', background: isPublic ? '#f0fdf4' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {r.theme?.logo ? <img src={r.theme.logo} style={{ maxHeight: '100%', maxWidth: '100%' }} /> : <BarChart2 size={48} color={isPublic ? '#10b981' : '#cbd5e1'} style={{ opacity: 0.5 }} />}
            </div>
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: '0 0 5px', color: '#1e293b' }}>{r.title}</h4>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {isPublic && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const url = `${window.location.origin}/report/${r.public_token}`;
                                    navigator.clipboard.writeText(url);
                                    alert("Public link copied!");
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px' }}
                                title="Copy Public Link"
                            >
                                <LinkIcon size={16} />
                            </button>
                        )}
                        <button
                            onClick={(e) => onDelete(e, r.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Delete Report"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Survey ID: {r.description || r.surveyId}</p>
            </div>
        </div>
    );
}

const DesignerRibbon = ({ report, onUpdateReport, onSave, onBack, onShare, visualsCollapsed, onToggleVisuals, dataCollapsed, onToggleData, activeTab, onTabChange, onAiAutoBuild, isMobileView, onToggleMobile, showGrid, onToggleGrid, orientation, onToggleOrientation }) => {
    return (
        <div className="no-print" style={{ height: '50px', background: 'var(--primary-color, #1e293b)', display: 'flex', alignItems: 'center', padding: '0 20px', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingRight: '15px', borderRight: '1px solid var(--border-color-dark, #334155)' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', fontWeight: '600' }}>
                    <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> BACK
                </button>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '1rem', marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Analytical Studio |
                    <input
                        value={report.title || 'Untitled Report'}
                        onChange={e => onUpdateReport({ ...report, title: e.target.value })}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--text-color-light, #94a3b8)', fontSize: '0.9rem',
                            fontWeight: '500', outline: 'none', width: '200px', cursor: 'text'
                        }}
                        onFocus={e => e.target.style.color = 'white'}
                        onBlur={e => e.target.style.color = 'var(--text-color-light, #94a3b8)'}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '5px', marginLeft: '20px' }}>
                {['Home', 'Insert', 'Modeling', 'View'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        style={{
                            background: activeTab === tab ? 'var(--secondary-background-color, #334155)' : 'transparent',
                            border: 'none',
                            color: 'white',
                            padding: '6px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: activeTab === tab ? '600' : '500',
                            borderBottom: activeTab === tab ? '2px solid var(--accent-color, white)' : '2px solid transparent'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* AI Action Button in Ribbon */}
            {activeTab === 'Insert' && (
                <button
                    onClick={onAiAutoBuild}
                    style={{
                        background: 'var(--ai-button-gradient, linear-gradient(135deg, #6366f1 0%, #a855f7 100%))',
                        border: 'none', color: 'white', padding: '8px 16px', borderRadius: '6px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        fontWeight: '600', marginRight: '20px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}
                >
                    <Sparkles size={16} /> BUILD WITH AI
                </button>
            )}

            {/* View Settings in Ribon */}
            {activeTab === 'View' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '20px' }}>
                    <button
                        onClick={onToggleGrid}
                        style={{ background: showGrid ? 'var(--secondary-background-color, #334155)' : 'transparent', border: '1px solid var(--border-color-medium, #475569)', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        <Grid size={14} /> {showGrid ? 'Hiding Grid' : 'Showing Grid'}
                    </button>
                    <button
                        onClick={onToggleOrientation}
                        style={{ background: 'var(--secondary-background-color, #334155)', border: '1px solid var(--border-color-medium, #475569)', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        <Layout size={14} /> {orientation === 'landscape' ? 'Switch to Portrait' : 'Switch to Landscape'}
                    </button>
                </div>
            )}

            <button
                onClick={onToggleMobile}
                title="Mobile Layout View"
                style={{ background: isMobileView ? 'var(--primary-color, #1e293b)' : 'transparent', color: isMobileView ? 'var(--accent-color-light, #60a5fa)' : 'var(--text-color-light, #94a3b8)', border: isMobileView ? '1px solid var(--border-color-medium, #475569)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '500', padding: '6px 12px', borderRadius: '4px', marginRight: '10px' }}
            >
                <Smartphone size={18} />
            </button>

            <button onClick={onSave} style={{ background: 'var(--button-primary-background, #3b82f6)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                <Save size={16} /> SAVE
            </button>
            <button onClick={() => window.print()} style={{ background: 'var(--button-secondary-background, #475569)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginLeft: '10px' }}>
                <Printer size={16} /> PRINT
            </button>
            <button onClick={onShare} style={{ background: 'var(--button-success-background, #10b981)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginLeft: '10px' }}>
                <Share2 size={16} /> PUBLISH / SHARE
            </button>
        </div>
    );
};

const DropZone = ({ label, fieldKey, selectedWidget, onUpdateWidget }) => {
    const handleDrop = (e) => {
        e.preventDefault();
        const dataField = e.dataTransfer.getData("text/plain");
        if (dataField && selectedWidget) {
            onUpdateWidget({ ...selectedWidget, config: { ...selectedWidget.config, [fieldKey]: dataField } });
        }
    };

    const isDragging = false; // We could add state for this if we want

    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = 'white'; }}
                onDrop={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = 'white';
                    handleDrop(e);
                }}
                style={{
                    border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white',
                    minHeight: '42px', padding: '8px', display: 'flex', alignItems: 'center',
                    fontSize: '0.85rem', color: selectedWidget?.config?.[fieldKey] ? '#0f172a' : '#94a3b8',
                    transition: 'all 0.2s ease', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                }}
            >
                {selectedWidget?.config?.[fieldKey] ? (
                    <div style={{ background: '#3b82f6', border: '1px solid #2563eb', borderRadius: '4px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', width: '100%', fontWeight: '500' }}>
                        <Database size={12} />
                        <span style={{ flex: 1 }}>{selectedWidget.config[fieldKey]}</span>
                        <X size={14} style={{ cursor: 'pointer' }} onClick={(e) => {
                            e.stopPropagation();
                            onUpdateWidget({ ...selectedWidget, config: { ...selectedWidget.config, [fieldKey]: null } });
                        }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
                        <Plus size={14} /> Add data field here
                    </div>
                )}
            </div>
        </div>
    );
};

const WidgetSettingsModal = ({ isOpen, onClose, widget, onUpdate, dataset, isEmbedded }) => {
    const [activeTab, setActiveTab] = useState('build');

    const seriesKeys = useMemo(() => {
        if (!isOpen || !widget || !widget.config?.legendKey || !dataset?.data) return [];
        const key = widget.config.legendKey;
        const keys = new Set();
        dataset?.data?.forEach(d => {
            const val = d[key];
            if (val !== undefined && val !== null) keys.add(String(val));
        });
        return Array.from(keys);
    }, [isOpen, widget?.config?.legendKey, dataset]);

    if (!isOpen || !widget) return null;

    let tabContent;
    if (activeTab === 'build') {
        tabContent = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ marginBottom: '5px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>Visual Title</label>
                    <input
                        value={widget.title || ''}
                        onChange={e => onUpdate({ ...widget, title: e.target.value })}
                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                </div>

                {widget.type === 'key_driver' ? (
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>Target Metric</label>
                        <select
                            value={widget.config?.targetMetric || ''}
                            onChange={e => onUpdate({ ...widget, config: { ...widget.config, targetMetric: e.target.value, surveyId: dataset.surveyId } })}
                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: 'white' }}
                        >
                            <option value="">Select Target Metric...</option>
                            {dataset.fields.filter(f => f.type === 'number').map(f => (
                                <option key={f.name} value={f.name}>{f.label || f.name}</option>
                            ))}
                        </select>
                    </div>
                ) : widget.type === 'word_cloud' ? (
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>Text Field</label>
                        <select
                            value={widget.config?.xKey || ''}
                            onChange={e => onUpdate({ ...widget, config: { ...widget.config, xKey: e.target.value, surveyId: dataset.surveyId } })}
                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: 'white', marginBottom: '12px' }}
                        >
                            <option value="">Select Text Field...</option>
                            {dataset.fields.filter(f => f.type !== 'date').map(f => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
                        </select>
                    </div>
                ) : (
                    ['xKey', 'yKey', 'legendKey'].map(key => (
                        <div key={key}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>
                                {key === 'xKey' ? 'X-Axis' : key === 'yKey' ? 'Y-Axis' : 'Legend'}
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    value={widget.config?.[key] || ''}
                                    onChange={e => onUpdate({ ...widget, config: { ...widget.config, [key]: e.target.value } })}
                                    style={{ flex: 2, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: 'white' }}
                                >
                                    <option value="">Select Field...</option>
                                    {dataset.fields.map(f => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
                                </select>
                                {key === 'yKey' && widget.config?.[key] && (
                                    <select
                                        value={widget.config?.yAggregation || ''}
                                        onChange={e => onUpdate({ ...widget, config: { ...widget.config, yAggregation: e.target.value } })}
                                        style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#f8fafc' }}
                                    >
                                        <option value="">Auto</option>
                                        <option value="sum">Sum</option>
                                        <option value="count">Count</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {
                    (widget.type === 'line_stacked_column' || widget.type === 'line_clustered_column') && (
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>Line Value (Right Axis)</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    value={widget.config?.secondaryYKey || ''}
                                    onChange={e => onUpdate({ ...widget, config: { ...widget.config, secondaryYKey: e.target.value } })}
                                    style={{ flex: 2, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: 'white' }}
                                >
                                    <option value="">Select Field...</option>
                                    {dataset.fields.map(f => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
                                </select>
                                <select
                                    value={widget.config?.secondaryYAggregation || ''}
                                    onChange={e => onUpdate({ ...widget, config: { ...widget.config, secondaryYAggregation: e.target.value } })}
                                    style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#f8fafc' }}
                                >
                                    <option value="">Auto</option>
                                    <option value="sum">Sum</option>
                                    <option value="count">Count</option>
                                </select>
                            </div>
                        </div>
                    )
                }

                {widget.type === 'text' && (
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '10px' }}>Text Content</div>
                        <textarea
                            value={widget.config?.textContent || ''}
                            onChange={e => onUpdate({ ...widget, config: { ...widget.config, textContent: e.target.value } })}
                            rows={6}
                            placeholder="Type your text here..."
                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', Resize: 'vertical' }}
                        />
                    </div>
                )}
            </div >
        );
    } else {
        // --- FORMAT TAB CONTENT ---
        // Helper component for Axis Settings
        const AxisSettings = ({ axisLabel, prefix }) => {
            const [isExpanded, setIsExpanded] = useState(false);
            return (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff', marginBottom: '10px' }}>
                    <div
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ padding: '12px', background: '#f8fafc', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{axisLabel}</span>
                        <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>

                    {isExpanded && (
                        <div style={{ padding: '15px' }}>
                            {/* Values Section */}
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Values</label>
                                    <div
                                        onClick={() => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}ShowValues`]: widget.config?.[`${prefix}ShowValues`] === false ? true : false } })}
                                        style={{
                                            width: '32px', height: '18px', background: widget.config?.[`${prefix}ShowValues`] !== false ? '#10b981' : '#cbd5e1',
                                            borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
                                        }}>
                                        <div style={{
                                            width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px',
                                            left: widget.config?.[`${prefix}ShowValues`] !== false ? '16px' : '2px', transition: 'left 0.2s'
                                        }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <select
                                        value={widget.config?.[`${prefix}Font`] || 'sans-serif'}
                                        onChange={e => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}Font`]: e.target.value } })}
                                        style={{ flex: 2, padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        <option value="sans-serif">Segoe UI (Default)</option>
                                        <option value="serif">Times New Roman</option>
                                        <option value="monospace">Courier New</option>
                                        <option value="Arial">Arial</option>
                                        <option value="Verdana">Verdana</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={widget.config?.[`${prefix}FontSize`] || 12}
                                        onChange={e => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}FontSize`]: e.target.value } })}
                                        style={{ width: '50px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    {['Bold', 'Italic', 'Underline'].map(style => {
                                        const key = `${prefix}${style}`;
                                        const isActive = widget.config?.[key];
                                        return (
                                            <button
                                                key={style}
                                                onClick={() => onUpdate({ ...widget, config: { ...widget.config, [key]: !isActive } })}
                                                style={{
                                                    padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: isActive ? '#e2e8f0' : 'white',
                                                    fontWeight: style === 'Bold' ? 'bold' : 'normal', fontStyle: style === 'Italic' ? 'italic' : 'normal', textDecoration: style === 'Underline' ? 'underline' : 'none',
                                                    cursor: 'pointer'
                                                }}>
                                                {style[0]}
                                            </button>
                                        );
                                    })}
                                    <input
                                        type="color"
                                        value={widget.config?.[`${prefix}Color`] || '#64748b'}
                                        onChange={e => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}Color`]: e.target.value } })}
                                        style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', background: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Title Section */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Title</label>
                                    <div
                                        onClick={() => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}ShowTitle`]: !widget.config?.[`${prefix}ShowTitle`] } })}
                                        style={{
                                            width: '32px', height: '18px', background: widget.config?.[`${prefix}ShowTitle`] ? '#10b981' : '#cbd5e1',
                                            borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
                                        }}>
                                        <div style={{
                                            width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px',
                                            left: widget.config?.[`${prefix}ShowTitle`] ? '16px' : '2px', transition: 'left 0.2s'
                                        }} />
                                    </div>
                                </div>
                                {widget.config?.[`${prefix}ShowTitle`] && (
                                    <>
                                        <input
                                            placeholder="Title Text (Auto)"
                                            value={widget.config?.[`${prefix}TitleText`] || ''}
                                            onChange={e => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}TitleText`]: e.target.value } })}
                                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '8px' }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <select
                                                value={widget.config?.[`${prefix}TitleFont`] || 'sans-serif'}
                                                onChange={e => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}TitleFont`]: e.target.value } })}
                                                style={{ flex: 2, padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                <option value="sans-serif">DIN (Default)</option>
                                                <option value="serif">Times</option>
                                                <option value="monospace">Courier</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={widget.config?.[`${prefix}TitleFontSize`] || 14}
                                                onChange={e => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}TitleFontSize`]: e.target.value } })}
                                                style={{ width: '50px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            {['Bold', 'Italic', 'Underline'].map(style => {
                                                const key = `${prefix}Title${style}`;
                                                const isActive = widget.config?.[key];
                                                return (
                                                    <button
                                                        key={style}
                                                        onClick={() => onUpdate({ ...widget, config: { ...widget.config, [key]: !isActive } })}
                                                        style={{
                                                            padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: isActive ? '#e2e8f0' : 'white',
                                                            fontWeight: style === 'Bold' ? 'bold' : 'normal', fontStyle: style === 'Italic' ? 'italic' : 'normal', textDecoration: style === 'Underline' ? 'underline' : 'none',
                                                            cursor: 'pointer'
                                                        }}>
                                                        {style[0]}
                                                    </button>
                                                );
                                            })}
                                            <input
                                                type="color"
                                                value={widget.config?.[`${prefix}TitleColor`] || '#334155'}
                                                onChange={e => onUpdate({ ...widget, config: { ...widget.config, [`${prefix}TitleColor`]: e.target.value } })}
                                                style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', background: 'none' }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        tabContent = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>Show Header</span>
                    <input type="checkbox" checked={widget.config?.showHeader !== false} onChange={e => onUpdate({ ...widget, config: { ...widget.config, showHeader: e.target.checked } })} />
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '12px' }}>General</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem' }}>Show Legend</span>
                        <input type="checkbox" checked={widget.config?.showLegend !== false} onChange={e => onUpdate({ ...widget, config: { ...widget.config, showLegend: e.target.checked } })} />
                    </div>
                </div>

                {/* New Axis Settings Sections */}
                {widget.type !== 'text' && (
                    <>
                        <AxisSettings axisLabel="X-Axis" prefix="xAxis" />
                        <AxisSettings axisLabel="Y-Axis" prefix="yAxis" />
                    </>
                )}

                {widget.type === 'text' && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff', marginBottom: '10px', padding: '15px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px', color: '#334155' }}>Text Styling</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    value={widget.config?.textFont || 'sans-serif'}
                                    onChange={e => onUpdate({ ...widget, config: { ...widget.config, textFont: e.target.value } })}
                                    style={{ flex: 2, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                >
                                    <option value="sans-serif">Sans Serif</option>
                                    <option value="serif">Serif</option>
                                    <option value="monospace">Monospace</option>
                                    <option value="cursive">Cursive</option>
                                </select>
                                <input
                                    type="number"
                                    value={widget.config?.textSize || 16}
                                    onChange={e => onUpdate({ ...widget, config: { ...widget.config, textSize: e.target.value } })}
                                    style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    onClick={() => onUpdate({ ...widget, config: { ...widget.config, textBold: !widget.config.textBold } })}
                                    style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: widget.config.textBold ? '#e2e8f0' : 'white', cursor: 'pointer' }}
                                >
                                    <Bold size={16} />
                                </button>
                                <button
                                    onClick={() => onUpdate({ ...widget, config: { ...widget.config, textItalic: !widget.config.textItalic } })}
                                    style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: widget.config.textItalic ? '#e2e8f0' : 'white', cursor: 'pointer' }}
                                >
                                    <Italic size={16} />
                                </button>
                                <div style={{ width: '1px', height: '20px', background: '#cbd5e1', margin: '0 5px' }} />
                                <input
                                    type="color"
                                    value={widget.config?.textColor || '#1e293b'}
                                    onChange={e => onUpdate({ ...widget, config: { ...widget.config, textColor: e.target.value } })}
                                    style={{ width: '40px', height: '35px', padding: '0', border: 'none', background: 'none', cursor: 'pointer' }}
                                    title="Text Color"
                                />
                                <input
                                    type="color"
                                    value={widget.config?.textBgColor || '#ffffff'}
                                    onChange={e => onUpdate({ ...widget, config: { ...widget.config, textBgColor: e.target.value } })}
                                    style={{ width: '40px', height: '35px', padding: '0', border: 'none', background: 'none', cursor: 'pointer' }}
                                    title="Background Color"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['left', 'center', 'right'].map(align => (
                                    <button
                                        key={align}
                                        onClick={() => onUpdate({ ...widget, config: { ...widget.config, textAlign: align } })}
                                        style={{
                                            flex: 1, padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                            background: widget.config.textAlign === align ? '#e2e8f0' : 'white', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'capitalize'
                                        }}
                                    >
                                        {align}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const content = (
        <div style={{ background: 'white', width: isEmbedded ? '100%' : '500px', borderRadius: isEmbedded ? '0' : '16px', overflow: 'hidden', boxShadow: isEmbedded ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.25)', height: isEmbedded ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
            {!isEmbedded && (
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>Edit Visual Properties</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>
            )}

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                <button onClick={() => setActiveTab('build')} style={{ flex: 1, padding: '14px', border: 'none', background: 'transparent', borderBottom: activeTab === 'build' ? '2px solid var(--primary-color, #2563eb)' : 'none', color: activeTab === 'build' ? 'var(--primary-color, #2563eb)' : '#64748b', fontWeight: '600', cursor: 'pointer' }}>Data Settings</button>
                <button onClick={() => setActiveTab('format')} style={{ flex: 1, padding: '14px', border: 'none', background: 'transparent', borderBottom: activeTab === 'format' ? '2px solid var(--primary-color, #2563eb)' : 'none', color: activeTab === 'format' ? 'var(--primary-color, #2563eb)' : '#64748b', fontWeight: '600', cursor: 'pointer' }}>Design & Style</button>
            </div>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                {tabContent}
            </div>
        </div>
    );

    if (isEmbedded) return content;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            {content}
        </div>
    );
};

const VisualizationsPane = ({ onAddVisual, isCollapsed, onToggle, selectedWidget, onEditWidget }) => {
    const visuals = [
        { type: 'map', icon: <Map size={20} />, label: 'Map' },
        { type: 'line_stacked_column', icon: <Layers size={20} />, label: 'Line & Stacked' },
        { type: 'line_clustered_column', icon: <BarChart2 size={20} />, label: 'Line & Clustered' },
        { type: 'column', icon: <BarChart2 size={20} />, label: 'Column' },
        { type: 'bar', icon: <BarChart2 size={20} style={{ transform: 'rotate(90deg)' }} />, label: 'Bar' },
        { type: 'line', icon: <Activity size={20} />, label: 'Line' },
        { type: 'area', icon: <Activity size={20} fill="currentColor" fillOpacity={0.4} />, label: 'Area' },
        { type: 'pie', icon: <PieIcon size={20} />, label: 'Pie' },
        { type: 'donut', icon: <PieIcon size={20} style={{ strokeWidth: 4 }} />, label: 'Donut' },
        { type: 'radar', icon: <Activity size={20} style={{ borderRadius: '50%' }} />, label: 'Radar' },
        { type: 'funnel', icon: <Filter size={20} style={{ transform: 'rotate(180deg)' }} />, label: 'Funnel' },
        { type: 'radial', icon: <StopCircle size={20} />, label: 'Gauge' },
        { type: 'treemap', icon: <Grid size={20} />, label: 'Tree Map' },
        { type: 'kpi', icon: <CreditCard size={20} />, label: 'KPI' },
        { type: 'table', icon: <List size={20} />, label: 'Table' },
        { type: 'key_driver', icon: <Zap size={20} color="#eab308" />, label: 'Key Drivers' },
        { type: 'word_cloud', icon: <MessageSquare size={20} />, label: 'Word Cloud' },
        { type: 'stat_sig', icon: <Activity size={20} color="#3b82f6" />, label: 'Stat Sig Test' },
        { type: 'pivot', icon: <Grid size={20} />, label: 'Pivot Table' },
        { type: 'anomaly', icon: <AlertCircle size={20} color="#dc2626" />, label: 'AI Watchdog' },
        { type: 'text', icon: <Type size={20} color="#334155" />, label: 'Text Box' },
    ];

    const slicers = [
        { type: 'slicer_dropdown', icon: <Filter size={20} />, label: 'Filter' },
        { type: 'slicer_date', icon: <Calendar size={20} />, label: 'Date' },
    ];

    return (
        <div style={{ width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {isCollapsed ? (
                <div style={{ width: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '15px' }}>
                    <button onClick={onToggle} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', padding: '6px', marginBottom: '20px' }} title="Add Visuals">
                        <Plus size={18} color="#2563eb" />
                    </button>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: '600', color: '#64748b', letterSpacing: '1px', fontSize: '0.85rem' }}>Gallery</div>
                </div>
            ) : (
                <>
                    <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>GALLERY</span>
                        <X size={16} style={{ cursor: 'pointer' }} onClick={onToggle} title="Close" />
                    </div>

                    <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {[...visuals, ...slicers].map(v => (
                                <div
                                    key={v.type} onClick={() => onAddVisual(v.type)}
                                    title={v.label}
                                    style={{
                                        height: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', gap: '4px', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    {v.icon}
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '500' }}>{v.label}</span>
                                </div>
                            ))}
                        </div>

                        {selectedWidget && (
                            <div style={{ marginTop: '20px', padding: '15px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af', marginBottom: '8px', textTransform: 'uppercase' }}>Selected: {selectedWidget.title}</div>
                                <button
                                    onClick={onEditWidget}
                                    style={{
                                        width: '100%', padding: '10px', background: '#2563eb', color: 'white', border: 'none',
                                        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '8px', fontSize: '0.85rem'
                                    }}
                                >
                                    <Settings size={14} /> Format Visual
                                </button>
                                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic', textAlign: 'center' }}>
                                    Tip: Use the gear icon on the chart header to edit.
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// --- Filters Pane (Power BI Style) ---
const FiltersPane = ({ dataset, filters, onFilterChange, isCollapsed, onToggle }) => {
    const [expandedFields, setExpandedFields] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    const toggleField = (fieldName) => {
        setExpandedFields(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };

    const getUniqueValues = (fieldKey) => {
        if (!dataset?.data) return [];
        const values = new Set();
        dataset.data.forEach(row => {
            if (row[fieldKey] !== undefined && row[fieldKey] !== null) {
                values.add(String(row[fieldKey]));
            }
        });
        return Array.from(values).sort().slice(0, 50); // Limit needed for performance
    };

    const handleCheckboxChange = (fieldKey, value) => {
        const currentFilters = filters[fieldKey] || [];
        let newFilters;
        if (currentFilters.includes(value)) {
            newFilters = currentFilters.filter(v => v !== value);
        } else {
            newFilters = [...currentFilters, value];
        }
        onFilterChange(fieldKey, newFilters);
    };

    // Fields to show: All fields, filtered by search
    const fieldsToShow = dataset?.fields?.filter(f => (f.label || f.name).toLowerCase().includes(searchTerm.toLowerCase())) || [];

    return (
        <div style={{ width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} />
                    <span>FILTERS</span>
                </div>
                <X size={16} style={{ cursor: 'pointer' }} onClick={onToggle} title="Close" />
            </div>

            <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <input
                    placeholder="Search fields..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {/* Active Filters Section */}
                {Object.keys(filters).length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>Active Filters</div>
                        {Object.keys(filters).map(key => filters[key].length > 0 && (
                            <div key={key} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden' }}>
                                <div style={{ padding: '8px', background: '#dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: '600', color: '#1e40af' }}>
                                    {key}
                                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => onFilterChange(key, [])} />
                                </div>
                                <div style={{ padding: '8px', fontSize: '0.8rem', color: '#334155' }}>
                                    {filters[key].join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>Filter on this page</div>
                {fieldsToShow.map(f => (
                    <div key={f.name} style={{ marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white' }}>
                        <div
                            onClick={() => toggleField(f.name)}
                            style={{ padding: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}
                        >
                            {f.label || f.name}
                            <ChevronRight size={14} style={{ transform: expandedFields[f.name] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </div>
                        {expandedFields[f.name] && (
                            <div style={{ padding: '10px', maxHeight: '200px', overflowY: 'auto', borderTop: '1px solid #e2e8f0' }}>
                                {getUniqueValues(f.name).map(val => (
                                    <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={(filters[f.name] || []).includes(val)}
                                            onChange={() => handleCheckboxChange(f.name, val)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span style={{ color: '#475569' }}>{val}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const DataPane = ({ dataset, isCollapsed, onToggle, onAddMeasure }) => {
    // customMeasures removed, state lifted to ReportDesigner
    const [showMeasureModal, setShowMeasureModal] = useState(false);
    const [measureTargetField, setMeasureTargetField] = useState(null);
    const [newMeasureConfig, setNewMeasureConfig] = useState({ type: 'count', name: '' });

    const openMeasureModal = (field) => {
        setMeasureTargetField(field);
        setNewMeasureConfig({ type: 'count', name: `${field.name} Count` });
        setShowMeasureModal(true);
    };

    const handleCreateMeasure = () => {
        if (!measureTargetField || !newMeasureConfig.name) return;

        const newMeasure = {
            name: newMeasureConfig.name,
            type: 'number', // Measures result in numbers
            isMeasure: true,
            derivedFrom: measureTargetField.name,
            aggregation: newMeasureConfig.type,
            label: newMeasureConfig.name
        };

        if (onAddMeasure) {
            onAddMeasure(newMeasure);
        }
        setShowMeasureModal(false);
        setMeasureTargetField(null);
    };

    // Use dataset.fields directly as source of truth
    const displayFields = dataset?.fields || [];

    return (
        <div style={{ width: '100%', height: '100%', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {isCollapsed ? (
                <div style={{ width: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '15px' }}>
                    <button onClick={onToggle} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', padding: '6px', marginBottom: '20px' }} title="Expand Data">
                        <Plus size={18} color="#2563eb" />
                    </button>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: '600', color: '#64748b', letterSpacing: '1px', fontSize: '0.85rem' }}>Data</div>
                </div>
            ) : (
                <>
                    <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>DATA</span>
                        <X size={16} style={{ cursor: 'pointer' }} onClick={onToggle} title="Close" />
                    </div>
                    <div style={{ padding: '10px', flex: 1, overflowY: 'auto' }}>
                        {displayFields.length > 0 ? displayFields.map((f, i) => (
                            <div
                                key={i}
                                draggable
                                onDragStart={e => {
                                    e.dataTransfer.setData("text/plain", f.name);
                                    if (f.isMeasure) {
                                        // Pass aggregation info if draggable logic supports it
                                        // For now we assume the name matches the data key
                                    }
                                }}
                                style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.9rem', color: '#334155', cursor: 'grab', position: 'relative', borderBottom: '1px solid transparent' }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#f8fafc';
                                    const btn = e.currentTarget.querySelector('.add-measure-btn');
                                    if (btn) btn.style.display = 'block';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    const btn = e.currentTarget.querySelector('.add-measure-btn');
                                    if (btn) btn.style.display = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '0.7rem', border: `1px solid ${f.isMeasure ? '#8b5cf6' : '#cbd5e1'}`, borderRadius: '3px', padding: '1px 3px', color: f.isMeasure ? '#8b5cf6' : '#64748b', fontWeight: f.isMeasure ? 'bold' : 'normal', minWidth: '24px', textAlign: 'center' }}>
                                        {f.isMeasure ? 'fx' : (f.type === 'category' ? 'abc' : '#')}
                                    </span>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.label || f.name}>{f.label || f.name}</span>
                                </div>

                                {!f.isMeasure && (
                                    <button
                                        className="add-measure-btn"
                                        onClick={() => openMeasureModal(f)}
                                        style={{ display: 'none', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px' }}
                                        title="Create Measure"
                                    >
                                        <MoreVertical size={14} color="#94a3b8" />
                                    </button>
                                )}
                            </div>
                        )) : <p style={{ padding: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>No Dataset Selected</p>}
                    </div>

                    {/* Quick Measure Modal */}
                    {showMeasureModal && (
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, background: 'rgba(255,255,255,0.95)', zIndex: 10, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Create Measure</h4>

                            <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '5px' }}>Source Field</label>
                            <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '15px', fontSize: '0.9rem' }}>{measureTargetField?.name}</div>

                            <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '5px' }}>Aggregation</label>
                            <select
                                value={newMeasureConfig.type}
                                onChange={e => setNewMeasureConfig({ ...newMeasureConfig, type: e.target.value, name: `${measureTargetField.name} ${e.target.value}` })}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '15px' }}
                            >
                                <option value="count">Count</option>
                                <option value="distinct">Count Distinct</option>
                                <option value="sum">Sum</option>
                                <option value="avg">Average</option>
                                <option value="min">Min</option>
                                <option value="max">Max</option>
                            </select>

                            <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '5px' }}>Measure Name</label>
                            <input
                                value={newMeasureConfig.name}
                                onChange={e => setNewMeasureConfig({ ...newMeasureConfig, name: e.target.value })}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '20px' }}
                            />

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleCreateMeasure} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Create</button>
                                <button onClick={() => setShowMeasureModal(false)} style={{ flex: 1, background: '#e2e8f0', color: '#475569', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const ClosedLoopPane = ({ detractors, onCreateTicket, stats }) => {
    return (
        <div style={{ width: '320px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={20} color="#ef4444" /> Action Required
                </h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Follow up with detractors to close the loop.
                </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {!detractors || detractors.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        <CheckCircle size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
                        <div style={{ fontSize: '0.85rem' }}>No pending detractors found for this report.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {detractors.map((d, idx) => (
                            <div key={idx} style={{
                                border: '1px solid #fee2e2', borderRadius: '10px', background: '#fff5f5',
                                padding: '12px', transition: 'transform 0.2s', cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ background: '#ef4444', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700' }}>
                                            {d.score || '?'}
                                        </div>
                                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1e293b' }}>{d.respondent || 'Anonymous'}</div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}><Clock size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> {d.time}</div>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '10px', fontStyle: 'italic', lineHeight: '1.4' }}>
                                    "{d.comment || 'No comment provided.'}"
                                </div>

                                {d.ticketId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '0.75rem', fontWeight: '600' }}>
                                        <CheckCircle size={14} /> Ticket: {d.ticketCode}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onCreateTicket(d)}
                                        style={{
                                            width: '100%', padding: '8px', background: '#ef4444', color: 'white',
                                            border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}
                                    >
                                        <MessageSquare size={14} /> CREATE TICKET
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>OPEN TASKS</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ef4444' }}>{stats?.openTasks || 0}</div>
                    </div>
                    <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>LOOP CLOSED</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>{stats?.closedLoop || 0}%</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReportDesigner = ({ report: initialReport, onBack }) => {
    const [report, setReport] = useState(initialReport);
    const [activeSidePane, setActiveSidePane] = useState('data'); // 'split', 'data', 'gallery', 'properties'
    const [activeRibbonTab, setActiveRibbonTab] = useState('Home');
    const [viewMode, setViewMode] = useState('designer'); // Default to designer for new/open
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);
    const [theme, setTheme] = useState('Light');
    const [showAiAssistant, setShowAiAssistant] = useState(false);
    const [editingWidgetId, setEditingWidgetId] = useState(null);
    const [detractors, setDetractors] = useState([]);
    const [closedLoopStats, setClosedLoopStats] = useState({ openTasks: 0, closedLoop: 0 });
    const [isMobileView, setIsMobileView] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [orientation, setOrientation] = useState(initialReport.orientation || 'landscape');
    const [isPublishing, setIsPublishing] = useState(false);
    const [shareUrl, setShareUrl] = useState(null);
    const [dataViewWidget, setDataViewWidget] = useState(null);
    const [showDataModal, setShowDataModal] = useState(false);

    // Header/Footer Editing State
    const [editingSection, setEditingSection] = useState(null);

    const handleSectionSave = (config) => {
        setReport(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [editingSection]: config
            }
        }));
        setEditingSection(null);
    };

    const togglePane = (pane) => {
        setActiveSidePane(prev => prev === pane ? null : pane);
    };

    useEffect(() => {
        console.log("ReportDesigner v1.2 Active");

        // Restore fields if missing (e.g. loaded from DB)
        if (report.surveyId && (!report.fields || report.fields.length === 0)) {
            getForms().then(forms => {
                const form = forms.find(f => f.id === report.surveyId);
                if (form && form.definition) {
                    const fields = extractFieldsFromDefinition(form.definition);
                    setReport(prev => ({ ...prev, fields }));
                }
            });
        }
    }, [report.surveyId]);

    // Initialize layout/widgets from prop if available
    const [layout, setLayout] = useState(initialReport.layout?.length > 0 ? initialReport.layout : []);
    const [widgets, setWidgets] = useState(initialReport.widgets || {});

    const [selectedWidgetId, setSelectedWidgetId] = useState(null);

    const [realData, setRealData] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Interactive Filters State
    const [activeFilters, setActiveFilters] = useState({}); // {key: [values] }

    const handleFilterChange = (key, values) => {
        setActiveFilters(prev => ({
            ...prev,
            [key]: values && values.length > 0 ? values : undefined // Remove key if empty
        }));
    };

    // Apply Filters
    const filteredData = useMemo(() => {
        if (!realData || realData.length === 0) return [];
        if (Object.keys(activeFilters).length === 0) return realData;

        return realData.filter(row => {
            return Object.entries(activeFilters).every(([key, values]) => {
                if (!values || values.length === 0) return true;
                const rowVal = String(row[key]);
                return values.includes(rowVal);
            });
        });
    }, [realData, activeFilters]);

    // Fetch Data on Load
    useEffect(() => {
        if (report && report.surveyId) {
            setLoadingData(true);
            getSubmissionsForForm(report.surveyId).then(data => {
                setRealData(data);
                setLoadingData(false);
            }).catch(err => {
                console.error("Failed to load submissions", err);
                setLoadingData(false);
            });
        }
    }, [report.surveyId]);

    // Update main report state when layout/widgets change
    useEffect(() => {
        setReport(prev => ({ ...prev, layout, widgets }));
    }, [layout, widgets]);

    const handleAddMeasure = (measure) => {
        console.log("Adding new measure:", measure);
        setReport(prev => ({
            ...prev,
            fields: [...(prev.fields || []), measure]
        }));
    };

    // Construct dataset from report and Real Data
    const dataset = {
        fields: report.fields || [],
        data: realData // Use fetched data
    };

    const addVisual = (type) => {
        const id = `v-${Date.now()}`;
        setWidgets(prev => ({ ...prev, [id]: { type, title: `New ${type} Chart`, config: {} } }));
        setLayout(prev => [...prev, { i: id, x: 0, y: Infinity, w: 4, h: 4 }]);
        setSelectedWidgetId(id);
    };

    const removeVisual = (id) => {
        const newW = { ...widgets };
        delete newW[id];
        setWidgets(newW);
        setLayout(prev => prev.filter(l => l.i !== id));
        if (selectedWidgetId === id) setSelectedWidgetId(null);
    };

    const handleUpdateWidget = (id, updatedWidget) => {
        if (id && updatedWidget) {
            console.log(`Updating widget ${id}:`, updatedWidget);
            setWidgets(prev => ({ ...prev, [id]: updatedWidget }));
        } else {
            console.warn("Update failed: Missing ID or Widget", { id, updatedWidget });
        }
    };

    const handleSave = async () => {
        try {
            // Ensure we save the latest layout and widgets from state
            const reportToSave = {
                ...report,
                layout,
                widgets,
                orientation
            };
            const savedReport = await saveReport(reportToSave);

            // Update local ID if it was a new report
            if (savedReport && savedReport.id) {
                setReport(prev => ({ ...prev, id: savedReport.id }));
            }

            alert('Report Saved to Database Successfully!');
            return savedReport;
        } catch (e) {
            console.error("Save Error:", e);
            const msg = e.response?.data?.error || e.message;
            alert('Failed to save report: ' + msg);
            throw e;
        }
    };

    const handlePublish = async () => {
        let targetId = report.id;

        // Auto-Save if new report
        if (targetId && targetId.toString().startsWith('r-')) {
            if (!confirm("This report must be saved before publishing. Save and continue?")) return;
            try {
                const saved = await handleSave();
                if (saved && saved.id) targetId = saved.id;
                else return;
            } catch (e) {
                return; // Save failed
            }
        }

        // Custom Link Name Prompt
        const currentSlug = report.slug || '';
        const userSlug = prompt("Enter a custom Link Name for this report (optional).\nExample: 'annual-sales-2024'.\nLeave empty to generate a unique ID.", currentSlug);
        if (userSlug === null) return; // Cancelled

        setIsPublishing(true);
        try {
            const res = await axios.post(`/api/reports/${targetId}/publish`, {
                is_published: true,
                slug: userSlug
            });

            const tokenOrSlug = res.data.slug || res.data.public_token;
            const url = `${window.location.origin}/s/report/${tokenOrSlug}`;

            setShareUrl(url);
            setReport(prev => ({ ...prev, slug: res.data.slug, is_published: true }));

            alert(`Report Published Successfully!\nPublic URL: ${url}`);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url);
                alert("URL copied to clipboard!");
            }
        } catch (err) {
            console.error("Publish Error:", err);
            alert("Failed to publish: " + (err.response?.data?.error || err.message));
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCreateTicket = (detractor) => {
        const confirm = window.confirm(`Create a CRM ticket for ${detractor.respondent}?`);
        if (confirm) {
            const ticketCode = 'TCK-' + Math.floor(100000 + Math.random() * 900000);
            setDetractors(prev => prev.map(d =>
                d.respondent === detractor.respondent ? { ...d, ticketId: 'new', ticketCode } : d
            ));
            setClosedLoopStats(prev => ({ ...prev, openTasks: prev.openTasks + 1 }));
            alert(`Ticket ${ticketCode} created and assigned to the support team.`);
        }
    };

    const handleWidgetDrop = (e, widgetId) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent canvas drop
        const fieldName = e.dataTransfer.getData("text/plain");
        if (!fieldName || !widgetId) return;

        const field = dataset.fields.find(f => f.name === fieldName);
        if (!field) return;

        const currentWidget = widgets[widgetId];
        if (!currentWidget) return;

        // Smart Assignment Logic
        let updates = {};
        const isMeasure = field.type === 'number' || field.isMeasure;

        if (isMeasure) {
            // If dropping a number/measure, likely intended for Y-Axis (Values)
            updates = { yKey: field.name, yAggregation: 'sum' };
        } else {
            // If dropping a string/date, likely intended for X-Axis (Category)
            updates = { xKey: field.name };
        }

        const newWidget = {
            ...currentWidget,
            config: {
                ...currentWidget.config,
                ...updates
            }
        };

        setWidgets(prev => ({ ...prev, [widgetId]: newWidget }));
        console.log(`Updated Widget ${widgetId} via Drop:`, updates);
    };

    const handleWidgetDoubleClick = (widgetId) => {
        const widget = widgets[widgetId];
        if (widget) {
            setDataViewWidget(widget);
            setShowDataModal(true);
        }
    };

    // Simulate fetching detractors when tab changes to 'Closed Loop'
    useEffect(() => {
        if (activeRibbonTab === 'Closed Loop' && detractors.length === 0) {
            setDetractors([
                { respondent: 'John Doe', score: 2, time: '2h ago', comment: 'The product interface is quite confusing and I had trouble finding the export button.' },
                { respondent: 'Sarah Smith', score: 1, time: '5h ago', comment: 'Extremely slow performance when loading large datasets. Unusable for my team.' },
                { respondent: 'Mike Johnson', score: 3, time: '1d ago', comment: 'pricing is too high compared to competitors.', ticketId: 't1', ticketCode: 'TCK-882912' }
            ]);
            setClosedLoopStats({ openTasks: 1, closedLoop: 33 });
        }
    }, [activeRibbonTab, detractors.length]);

    const handleAiAutoBuild = async () => {
        setIsAiLoading(true);
        setShowAiAssistant(true);
        try {
            const res = await axios.post('/api/ai/analyze-survey', {
                surveyTitle: report.title,
                questions: dataset.fields,
                submissions: realData
            });
            setAiInsights(res.data);

            // Auto Build if canvas is empty
            if (layout.length === 0 && dataset.fields) {
                const newWidgets = {};
                const newLayout = [];
                dataset.fields.slice(0, 4).forEach((field, index) => {
                    const id = `ai_${index}`;
                    newWidgets[id] = { id, type: field.type === 'number' ? 'bar' : 'pie', title: `AI: ${field.label}`, config: { xKey: field.name, yKey: field.type === 'number' ? field.name : 'count' } };
                    newLayout.push({ i: id, x: (index % 2) * 6, y: Math.floor(index / 2) * 4, w: 6, h: 4 });
                });
                setWidgets(newWidgets);
                setLayout(newLayout);
            }
        } catch (err) {
            console.error("AI Build Error", err);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleCanvasDrop = (e) => {
        e.preventDefault();
        const fieldName = e.dataTransfer.getData("text/plain");
        if (!fieldName) return;

        const field = dataset.fields.find(f => f.name === fieldName);
        if (!field) return;

        // Determine widget type based on field type
        let type = 'table';
        // Logic: if dropped, User likely wants to see the value.
        // If Date -> Date Card
        // If String -> Text Card (if uniqueness is high, maybe a list? defaulting to Card for single val rep or Table)
        // User said: "Drag field... put it over the system... Date should come there"
        if (field.type === 'date') type = 'card_date';
        else if (field.type === 'number') type = 'kpi';
        else type = 'card_text';

        const id = `w-${Date.now()}`;
        const newWidget = {
            id,
            type,
            title: field.label || field.name,
            config: {
                xKey: field.name,
                yKey: field.type === 'number' ? field.name : undefined,
                yAggregation: field.type === 'number' ? 'sum' : undefined
            }
        };

        // Append to bottom (y: Infinity handles this in RGL usually, but we set a high number)
        // A better UX would be to find the first available slot, but RGL handles compaction.
        const newLayoutItem = { i: id, x: 0, y: 1000, w: 3, h: 2 };

        setWidgets(prev => ({ ...prev, [id]: newWidget }));
        setLayout(prev => [...prev, newLayoutItem]);
        setSelectedWidgetId(id);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background-color, #f1f5f9)' }}>
            <style>{`
                @media print {
                    .no-print, header, aside, nav, .sidebar, .app-header, .designer-ribbon { display: none !important; }
                    .print-layout {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        z-index: 99999 !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                    }
                    body, html, #root { 
                        background: white !important; 
                        height: auto !important; 
                        overflow: visible !important;
                    }
                    /* Hide everything else */
                    body > *:not(#root) { display: none !important; }
                    #root > *:not(.App) { display: none !important; }
                    
                    /* Ensure grid items print clearly */
                    .layout > div {
                        page-break-inside: avoid;
                        border: 1px solid #ddd !important;
                    }
                }
            `}</style>
            <DesignerRibbon
                report={report}
                onUpdateReport={setReport}
                onBack={onBack}
                onSave={handleSave}
                onShare={handlePublish}
                visualsCollapsed={activeSidePane !== 'gallery'}
                onToggleVisuals={() => togglePane('gallery')}
                dataCollapsed={activeSidePane !== 'data'}
                onToggleData={() => togglePane('data')}
                activeTab={activeRibbonTab}
                onTabChange={setActiveRibbonTab}
                onAiAutoBuild={handleAiAutoBuild}
                isMobileView={isMobileView}
                onToggleMobile={() => setIsMobileView(!isMobileView)}
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid(!showGrid)}
                orientation={orientation}
                onToggleOrientation={() => setOrientation(orientation === 'landscape' ? 'portrait' : 'landscape')}
            />

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Main View Area */}
                <div style={{ flex: 1, overflowY: 'auto', background: viewMode === 'data' ? 'white' : '#e5e7eb', position: 'relative', display: 'flex', flexDirection: 'column' }}>

                    {viewMode === 'data' ? (
                        <DatasetViewer
                            data={filteredData}
                            fields={dataset.fields}
                            filters={activeFilters}
                            onFilterChange={handleFilterChange}
                        />
                    ) : (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {/* Active Filters Bar */}
                            {Object.keys(activeFilters).length > 0 && (
                                <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-color, #2563eb)', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                    <Filter size={12} fill="white" />
                                    <span>Filters Active: {Object.keys(activeFilters).length}</span>
                                    <X size={14} style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => setActiveFilters({})} title="Clear All" />
                                </div>
                            )}

                            {/* Report Header in Canvas */}
                            {!isMobileView && (
                                <div style={{ maxWidth: '1200px', margin: '0 auto 20px', textAlign: 'center' }}>
                                    {report.theme?.logo && <img src={report.theme.logo} style={{ height: '50px', marginBottom: '10px' }} />}
                                    <h1 style={{ margin: 0, color: '#334155' }}>{report.title}</h1>
                                </div>
                            )}

                            <div className="print-layout" style={{
                                background: 'white',
                                aspectRatio: isMobileView ? 'unset' : (orientation === 'landscape' ? '1.414' : '0.707'),
                                minHeight: isMobileView ? '600px' : 'unset',
                                height: isMobileView ? 'unset' : 'auto',
                                boxShadow: isMobileView ? '0 0 25px rgba(0,0,0,0.2)' : '0 0 10px rgba(0,0,0,0.1)',
                                maxWidth: isMobileView ? '375px' : '100%',
                                width: isMobileView ? 'unset' : '100%',
                                margin: '0 auto',
                                position: 'relative',
                                border: isMobileView ? '10px solid #1e293b' : 'none',
                                borderRadius: isMobileView ? '30px' : '0',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                                backgroundImage: showGrid && viewMode === 'designer' ? 'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)' : 'none',
                                backgroundSize: showGrid && viewMode === 'designer' ? '25px 25px' : 'auto',
                                display: 'flex', flexDirection: 'column'
                            }}
                                onClick={() => setSelectedWidgetId(null)}
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleCanvasDrop}
                            >

                                {/* HEADER SECTION -- Editable */}
                                {!isMobileView && viewMode === 'designer' && (
                                    <div style={{
                                        minHeight: '80px', borderBottom: '1px dashed #e2e8f0', padding: '15px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                        background: 'rgba(255,255,255,0.8)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'background 0.2s'
                                    }}
                                        onClick={(e) => { e.stopPropagation(); setEditingSection('header'); }}
                                        className="editable-section-hover"
                                        title="Click to Edit Header"
                                    >
                                        <div>
                                            {(report.config?.header?.showLogo !== false) && (
                                                <img src={report.config?.header?.logoUrl || report.theme?.logo || "https://placehold.co/150x50?text=LOGO"} style={{ height: '40px', marginBottom: '5px' }} alt="Logo" />
                                            )}
                                            {(report.config?.header?.showTitle !== false) && (
                                                <h1 style={{ margin: 0, color: '#334155', fontSize: '1.5rem' }}>{report.config?.header?.customTitle || report.title}</h1>
                                            )}
                                            {(report.config?.header?.showDate !== false) && (
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Report Generated: {new Date().toLocaleDateString()}</div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>CONFIDENTIAL</div>
                                            <div>{report.surveyName || 'Survey Report'}</div>
                                        </div>
                                        {/* Hover Hint */}
                                        <div style={{ position: 'absolute', top: 5, right: 5, fontSize: '10px', color: '#1e40af', background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', opacity: 1, fontWeight: 'bold' }}>EDIT HEADER</div>
                                    </div>
                                )}

                                {showGrid && viewMode === 'designer' && !isMobileView && (
                                    <>
                                        {/* Grid Column Headers (A, B, C...) */}
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '20px', background: '#f8fafc', display: 'flex', borderBottom: '1px solid #e2e8f0', zIndex: 5 }}>
                                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((label, idx) => (
                                                <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: '#94a3b8', borderRight: '1px solid #e2e8f0', lineHeight: '20px' }}>{label}</div>
                                            ))}
                                        </div>
                                        {/* Grid Row Headers (1, 2, 3...) */}
                                        <div style={{ position: 'absolute', top: '20px', left: 0, bottom: 0, width: '20px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', zIndex: 5 }}>
                                            {Array.from({ length: 20 }).map((_, idx) => (
                                                <div key={idx} style={{ height: '60px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', lineHeight: '60px' }}>{idx + 1}</div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {isMobileView && (
                                    <div style={{ background: '#1e293b', height: '25px', width: '150px', margin: '0 auto 10px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', zIndex: 50, position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }} />
                                )}

                                {layout.length === 0 && (
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#94a3b8' }}>
                                        <BarChart2 size={64} style={{ marginBottom: '20px', opacity: 0.3 }} />
                                        <h2 style={{ margin: '0 0 10px' }}>Your report canvas is empty</h2>
                                        <p style={{ maxWidth: '300px', margin: '0 auto' }}>Select a visual from the right-hand pane or use AI to auto-build.</p>
                                        <button
                                            onClick={handleAiAutoBuild}
                                            style={{ marginTop: '20px', background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '20px auto', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}
                                        >
                                            <Sparkles size={16} /> Auto-Build with AI
                                        </button>
                                    </div>
                                )}

                                <ResponsiveGridLayout
                                    className="layout"
                                    layouts={{ lg: layout }}
                                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                                    rowHeight={60}
                                    width={isMobileView ? 355 : (orientation === 'landscape' ? 1200 : 850)}
                                    margin={isMobileView ? [10, 10] : [10, 10]}
                                    onLayoutChange={(l) => setLayout(l)}
                                    draggableHandle=".drag-handle"
                                    isDraggable={viewMode !== 'report'}
                                    isResizable={viewMode !== 'report'}
                                    compactType="vertical"
                                    preventCollision={false}
                                >
                                    {layout.map(l => {
                                        const w = widgets[l.i];
                                        if (!w) return null;
                                        const isSelected = selectedWidgetId === l.i;
                                        return (
                                            <div key={l.i}
                                                style={{
                                                    background: 'white',
                                                    border: isSelected ? '2px solid var(--primary-color, #3b82f6)' : '1px solid var(--border-color, #e2e8f0)',
                                                    borderRadius: `${widgets[l.i].config?.borderRadius || 8}px`,
                                                    display: 'flex', flexDirection: 'column',
                                                    boxShadow: isSelected ? '0 10px 15px -3px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                                                    transition: 'all 0.2s ease',
                                                    overflow: 'hidden'
                                                }}
                                                onClick={(e) => { e.stopPropagation(); setSelectedWidgetId(l.i); }}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={(e) => handleWidgetDrop(e, l.i)}
                                                onDoubleClick={(e) => { e.stopPropagation(); handleWidgetDoubleClick(l.i); }}
                                            >
                                                <div className="drag-handle" style={{ padding: '8px', background: isSelected ? 'color-mix(in srgb, var(--primary-color, #2563eb), white 90%)' : '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#334155' }}>{w.title}</span>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <Settings
                                                            size={14}
                                                            color="#64748b"
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => { e.stopPropagation(); setActiveSidePane('properties'); setSelectedWidgetId(l.i); }}
                                                        />
                                                        <X
                                                            size={14}
                                                            color="#ef4444"
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => { e.stopPropagation(); removeVisual(l.i); }}
                                                        />
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        flex: 1, padding: '10px', minHeight: 0, overflow: 'hidden', position: 'relative',
                                                        background: w.config?.bgColor || 'white',
                                                        borderRadius: `${w.config?.borderRadius || 8}px`
                                                    }}
                                                    onMouseDown={(e) => {
                                                        // Prevent selection click from blocking interaction, but handle selection
                                                        if (selectedWidgetId !== l.i) {
                                                            setSelectedWidgetId(l.i);
                                                        }
                                                    }}
                                                >
                                                    {w.config?.showHeader !== false && (
                                                        <div style={{ marginBottom: '5px', fontWeight: '700', fontSize: '0.9rem', color: '#1e293b', textAlign: 'left', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' }}>
                                                            {w.title}
                                                        </div>
                                                    )}
                                                    {loadingData ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>Loading...</div> :
                                                        <ChartRenderer
                                                            type={w.type}
                                                            data={filteredData}
                                                            fullData={realData}
                                                            title={w.title}
                                                            config={w.config}
                                                            filters={activeFilters}
                                                            onFilterChange={handleFilterChange}
                                                            fields={dataset.fields}
                                                        />
                                                    }
                                                </div>
                                            </div>
                                        );
                                    })}
                                </ResponsiveGridLayout>


                                {/* FOOTER SECTION */}
                                {!isMobileView && viewMode === 'designer' && (
                                    <div style={{
                                        marginTop: 'auto',
                                        height: '50px', borderTop: '1px dashed #e2e8f0', padding: '0 20px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        color: '#94a3b8', fontSize: '0.75rem', background: 'rgba(255,255,255,0.8)',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                        onClick={(e) => { e.stopPropagation(); setEditingSection('footer'); }}
                                        title="Click to Edit Footer"
                                    >
                                        <div>{report.config?.footer?.footerText || `${report.title} - ${report.surveyName}`}</div>
                                        <div>{report.config?.footer?.showPageNumber !== false ? 'Page 1' : ''}</div>
                                        <div style={{ position: 'absolute', top: 5, right: 5, fontSize: '10px', color: '#3b82f6', opacity: 0.5 }}>EDIT FOOTER</div>
                                    </div>
                                )}
                            </div>

                            {/* Data View Modal - Shows raw data for the chart */}
                            {showDataModal && dataViewWidget && (
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.7)', zIndex: 10000,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div style={{
                                        background: 'white', width: '90%', height: '85%', borderRadius: '12px',
                                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                                    }}>
                                        <div style={{
                                            padding: '15px 20px', borderBottom: '1px solid #e2e8f0',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            background: '#f8fafc'
                                        }}>
                                            <div>
                                                <h3 style={{ margin: 0, color: '#1e293b' }}>Data View: {dataViewWidget.title}</h3>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    {filteredData.length} Records - {Object.keys(activeFilters).length > 0 ? 'Filtered' : 'Full Dataset'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowDataModal(false)}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                            >
                                                <X size={24} />
                                            </button>
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <DatasetViewer
                                                data={filteredData}
                                                fields={dataset.fields}
                                                filters={activeFilters}
                                                onFilterChange={() => { }} // Read-only view mainly
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Right Sidebar Structure */}
                <div className="no-print" style={{ display: 'flex', height: '100%', borderLeft: '1px solid #e2e8f0' }}>
                    {/* Dynamic Panel Content */}
                    <div style={{ width: activeSidePane ? '280px' : '0', background: 'white', transition: 'width 0.3s ease', overflow: 'hidden', borderRight: activeSidePane ? '1px solid #e2e8f0' : 'none', position: 'relative' }}>
                        <div style={{ width: '280px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {activeSidePane === 'data' && (
                                <DataPane dataset={dataset} isCollapsed={false} onToggle={() => setActiveSidePane(null)} onAddMeasure={handleAddMeasure} />
                            )}
                            {activeSidePane === 'filters' && (
                                <FiltersPane
                                    dataset={dataset}
                                    filters={filters}
                                    onFilterChange={handleFilterChange}
                                    isCollapsed={false}
                                    onToggle={() => setActiveSidePane(null)}
                                />
                            )}
                            {activeSidePane === 'gallery' && (
                                <VisualizationsPane
                                    onAddVisual={addVisual}
                                    isCollapsed={false}
                                    onToggle={() => setActiveSidePane(null)}
                                    selectedWidget={widgets[selectedWidgetId]}
                                    onEditWidget={() => setActiveSidePane('properties')}
                                />
                            )}
                            {activeSidePane === 'properties' && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Sliders size={18} color="#2563eb" />
                                            <span>PROPERTIES</span>
                                        </div>
                                        <X size={16} style={{ cursor: 'pointer' }} onClick={() => setActiveSidePane(null)} />
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        {selectedWidgetId ? (
                                            <div style={{ padding: '15px' }}>
                                                <WidgetSettingsModal
                                                    isOpen={true} // Embedded
                                                    isEmbedded={true}
                                                    onClose={() => setActiveSidePane(null)}
                                                    widget={widgets[selectedWidgetId]}
                                                    onUpdate={(updated) => handleUpdateWidget(selectedWidgetId, updated)}
                                                    dataset={dataset}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                                <Sliders size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                                <p style={{ fontSize: '0.85rem' }}>Select a visual on the canvas to edit its properties.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {activeSidePane === 'ai' && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', color: '#7c3aed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Sparkles size={18} />
                                            <span>AI INSIGHTS</span>
                                        </div>
                                        <X size={16} style={{ cursor: 'pointer' }} onClick={() => setActiveSidePane(null)} />
                                    </div>
                                    <div style={{ padding: '15px', flex: 1, overflowY: 'auto' }}>
                                        {isAiLoading ? <Loader2 className="animate-spin" size={24} style={{ margin: '20px auto', display: 'block' }} /> : (
                                            aiInsights ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '10px', borderRadius: '8px' }}>
                                                        <div style={{ fontWeight: '600', color: '#0369a1', fontSize: '0.8rem' }}>SENTIMENT</div>
                                                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: aiInsights.sentiment === 'Positive' ? '#10b981' : '#f59e0b' }}>{aiInsights.sentiment}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#475569' }}>SUMMARY</div>
                                                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{aiInsights.summary}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                                    <Sparkles size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                                    <p style={{ fontSize: '0.85rem' }}>AI is analyzing your report data. Insights will appear here shortly.</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Icon Side Dock */}
                    <div style={{
                        width: '72px',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: '20px',
                        gap: '16px',
                        borderLeft: '1px solid #e2e8f0',
                        boxShadow: 'inset 5px 0 10px rgba(0,0,0,0.02)',
                        zIndex: 100,
                        marginLeft: '15px'
                    }}>
                        {/* VIEW MODE TOGGLE */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            background: 'rgba(0,0,0,0.03)',
                            padding: '8px',
                            borderRadius: '16px',
                            marginBottom: '10px'
                        }}>
                            <button
                                onClick={() => setViewMode('report')}
                                style={{
                                    border: 'none', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px',
                                    color: viewMode === 'report' ? '#ffffff' : 'var(--primary-color, #2563eb)',
                                    background: viewMode === 'report' ? 'var(--primary-color, #2563eb)' : 'transparent',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: viewMode === 'report' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                                }}
                                title="Report View / Dashboard"
                            >
                                <LayoutDashboard size={24} />
                            </button>
                            <button
                                onClick={() => setViewMode('designer')} // We'll map 'designer' to the builder state
                                style={{
                                    border: 'none', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px',
                                    color: viewMode === 'designer' ? '#ffffff' : 'var(--primary-color, #2563eb)',
                                    background: viewMode === 'designer' ? 'var(--primary-color, #2563eb)' : 'transparent',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: viewMode === 'designer' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                                }}
                                title="Report Builder / Canvas"
                            >
                                <PenTool size={24} />
                            </button>
                            <button
                                onClick={() => setViewMode('data')}
                                style={{
                                    border: 'none', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px',
                                    color: viewMode === 'data' ? '#ffffff' : 'var(--primary-color, #2563eb)',
                                    background: viewMode === 'data' ? 'var(--primary-color, #2563eb)' : 'transparent',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: viewMode === 'data' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                                }}
                                title="Dataset / Raw Data"
                            >
                                <Database size={24} />
                            </button>
                        </div>

                        <div style={{ height: '1px', width: '40px', background: '#e2e8f0', margin: '5px 0' }} />

                        {/* UTILITY BUTTONS */}
                        <button
                            onClick={() => togglePane('data')}
                            style={{
                                border: 'none', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px',
                                color: activeSidePane === 'data' ? 'var(--primary-color, #2563eb)' : '#64748b',
                                background: activeSidePane === 'data' ? 'var(--primary-light, #eff6ff)' : 'transparent',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Field List"
                        >
                            <List size={26} />
                        </button>
                        <button
                            onClick={() => togglePane('filters')}
                            style={{
                                border: 'none', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px',
                                color: activeSidePane === 'filters' ? 'var(--primary-color, #2563eb)' : '#64748b',
                                background: activeSidePane === 'filters' ? 'var(--primary-light, #eff6ff)' : 'transparent',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Filters"
                        >
                            <Filter size={26} />
                        </button>
                        <button
                            onClick={() => togglePane('gallery')}
                            style={{
                                border: 'none', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px',
                                color: activeSidePane === 'gallery' ? 'var(--primary-color, #2563eb)' : '#64748b',
                                background: activeSidePane === 'gallery' ? 'var(--primary-light, #eff6ff)' : 'transparent',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Add Visuals"
                        >
                            <Plus size={26} />
                        </button>
                        <button
                            onClick={() => togglePane('properties')}
                            style={{
                                border: 'none', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px',
                                color: activeSidePane === 'properties' ? 'var(--primary-color, #2563eb)' : '#64748b',
                                background: activeSidePane === 'properties' ? 'var(--primary-light, #eff6ff)' : 'transparent',
                                position: 'relative',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Format Widget"
                        >
                            <Sliders size={26} />
                            {selectedWidgetId && activeSidePane !== 'properties' && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4d', border: '2px solid white' }} />
                            )}
                        </button>
                        <button
                            onClick={() => togglePane('ai')}
                            style={{
                                border: 'none', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '14px',
                                color: activeSidePane === 'ai' ? '#7c3aed' : '#64748b',
                                background: activeSidePane === 'ai' ? '#f5f3ff' : 'transparent',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="AI Insights"
                        >
                            <Sparkles size={26} />
                        </button>

                        <div style={{ flex: 1 }} />

                        {/* MOBILE TOGGLE AT BOTTOM */}
                        <button
                            onClick={() => setIsMobileView(!isMobileView)}
                            style={{
                                border: 'none', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '12px',
                                color: isMobileView ? 'var(--primary-color, #2563eb)' : '#64748b',
                                background: isMobileView ? 'var(--primary-light, #eff6ff)' : 'transparent',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '20px'
                            }}
                            title="Mobile Preview Mode"
                        >
                            <Smartphone size={22} />
                        </button>
                    </div>

                </div>
            </div>
            {
                editingSection && (
                    <SectionConfigModal
                        section={editingSection}
                        config={report.config?.[editingSection] || {}}
                        onSave={handleSectionSave}
                        onClose={() => setEditingSection(null)}
                    />
                )
            }
            {report.surveyId && (
                <SurveyAnalystChat
                    surveyId={report.surveyId}
                    surveyTitle={report.surveyName || report.title}
                />
            )}
        </div >
    );
};

// --- Survey Selection Modal ---
const CreateReportModal = ({ onClose, onSelect }) => {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getForms().then(data => {
            setSurveys(data.filter(f => f.title)); // Only forms with definition/title
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch forms", err);
            setLoading(false);
        });
    }, []);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h2 style={{ marginTop: 0, color: '#1e293b' }}>Select Survey Data Source</h2>
                <p style={{ color: '#64748b', marginBottom: '20px' }}>Choose a survey to bind to this report. One report is strictly bound to one survey dataset.</p>

                <div style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    {loading ? <div style={{ padding: '20px' }}>Loading surveys...</div> : surveys.map(s => (
                        <div
                            key={s.id} onClick={() => onSelect(s)}
                            style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        >
                            <span style={{ fontWeight: '500', color: '#334155' }}>{s.title}</span>
                            <ChevronRight size={16} color="#cbd5e1" />
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
                </div>


            </div>
        </div>
    );
};

// --- Main Container ---

export const AnalyticsStudio = () => {
    const [view, setView] = useState('list'); // list, designer
    const [activeReport, setActiveReport] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleCreateReport = () => setShowCreateModal(true);

    const handleSurveySelect = (survey) => {
        // Parse fields immediately
        const fields = extractFieldsFromDefinition(survey.definition);

        // Initialize new report
        setActiveReport({
            id: `r-${Date.now()}`,
            title: survey.title || 'New Report',
            surveyId: survey.id,
            surveyName: survey.title,
            fields: fields,

        });
        setShowCreateModal(false);
        setView('designer');
    };

    const handleOpenReport = (report) => {
        setActiveReport(report);
        setView('designer');
    };

    useEffect(() => {
        console.log("AnalyticsStudio v1.1 Loaded");
    }, []);

    if (view === 'designer') {
        return <ReportDesigner report={activeReport} onBack={() => setView('list')} />;
    }

    return (
        <div style={{ height: 'calc(100vh - 64px)', overflow: 'auto', background: '#f8fafc' }}>
            <ReportList onCreateReport={handleCreateReport} onOpenReport={handleOpenReport} />
            {showCreateModal && <CreateReportModal onClose={() => setShowCreateModal(false)} onSelect={handleSurveySelect} />}


        </div>
    );
};

const SectionConfigModal = ({ section, config, onSave, onClose }) => {
    const [localConfig, setLocalConfig] = React.useState({
        showLogo: true,
        logoUrl: '',
        showTitle: true,
        customTitle: '',
        showDate: true,
        showPageNumber: true,
        footerText: '',
        ...config
    });

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', padding: '24px', borderRadius: '12px',
                width: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
                <h3 style={{ margin: '0 0 20px', color: '#1e293b' }}>
                    Edit Report {section.charAt(0).toUpperCase() + section.slice(1)}
                </h3>

                {section === 'header' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" checked={localConfig.showLogo !== false}
                                onChange={e => setLocalConfig({ ...localConfig, showLogo: e.target.checked })} />
                            Show Logo
                        </label>
                        {localConfig.showLogo !== false && (
                            <input
                                placeholder="Logo URL (optional)"
                                value={localConfig.logoUrl || ''}
                                onChange={e => setLocalConfig({ ...localConfig, logoUrl: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                            />
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" checked={localConfig.showTitle !== false}
                                onChange={e => setLocalConfig({ ...localConfig, showTitle: e.target.checked })} />
                            Show Title
                        </label>
                        {localConfig.showTitle !== false && (
                            <input
                                placeholder="Custom Title (Overrides Report Title)"
                                value={localConfig.customTitle || ''}
                                onChange={e => setLocalConfig({ ...localConfig, customTitle: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                            />
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" checked={localConfig.showDate !== false}
                                onChange={e => setLocalConfig({ ...localConfig, showDate: e.target.checked })} />
                            Show Date
                        </label>
                    </div>
                )}

                {section === 'footer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '0.9em' }}>Footer Text</label>
                            <input
                                placeholder="e.g. Confidential - Internal Use Only"
                                value={localConfig.footerText || ''}
                                onChange={e => setLocalConfig({ ...localConfig, footerText: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                            />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" checked={localConfig.showPageNumber !== false}
                                onChange={e => setLocalConfig({ ...localConfig, showPageNumber: e.target.checked })} />
                            Show Page Number
                        </label>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(localConfig)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsStudio;
