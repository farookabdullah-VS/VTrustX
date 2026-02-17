import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area, AreaChart, FunnelChart, Funnel, LabelList,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Treemap, ScatterChart, Scatter, ZAxis,
    RadialBarChart, RadialBar, Sankey
} from 'recharts';
import { Chart as GoogleChart } from "react-google-charts";
import {
    BarChart2, Loader2, AlertCircle, FileText, Smartphone, Layout, Filter, X,
    Calendar, Search, Share2, Globe, ChevronRight, ChevronDown, Download
} from 'lucide-react';

import { Logo } from './common/Logo';
import { FiltersPanel } from './analytics/panels/FiltersPanel';
import { processChartData, getSeriesKeys, getColor } from './analytics/utils/chartDataProcessor';
import { getCommonChartProps, getElementProps, getXAxisProps, getYAxisProps, getSecondaryYAxisProps } from './analytics/utils/chartAxisConfig';
import { createChartClickHandler } from './analytics/utils/chartClickHandler';

// Widget Imports
import { KPIWidget } from './analytics/widgets/KPIWidget';
import { KeyDriverWidget } from './analytics/widgets/KeyDriverWidget';
import { WordCloudWidget } from './analytics/widgets/WordCloudWidget';
import { StatSigWidget } from './analytics/widgets/StatSigWidget';
import { PivotWidget } from './analytics/widgets/PivotWidget';
import { AnomalyWidget } from './analytics/widgets/AnomalyWidget';
import { CohortWidget } from './analytics/widgets/CohortWidget';
import { ForecastWidget } from './analytics/widgets/ForecastWidget';
import { TableWidget } from './analytics/widgets/TableWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// --- Slicer Renderer ---
const SlicerRenderer = ({ type, data, title, field, activeFilters, onFilterChange }) => {
    const distinctValues = useMemo(() => {
        if (!data || !field) return [];
        const values = data.map(row => row[field]).filter(v => v !== undefined && v !== null);
        return [...new Set(values.map(String))].sort();
    }, [data, field]);

    const handleToggle = (val) => {
        const current = activeFilters || [];
        const newFilters = current.includes(val)
            ? current.filter(c => c !== val)
            : [...current, val];
        if (onFilterChange) onFilterChange(field, newFilters);
    };

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

    // Default: Dropdown / List Slicer
    return (
        <div style={{ padding: '10px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                {title || 'Filter'}
                <div style={{ display: 'flex', gap: '5px' }}>
                    {activeFilters?.length > 0 && (
                        <div style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => onFilterChange && onFilterChange(field, [])} title="Clear Filter">
                            <X size={14} />
                        </div>
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
                        <input type="checkbox" checked={activeFilters?.includes(v) || false} readOnly style={{ cursor: 'pointer' }} />
                        <span style={{ fontWeight: activeFilters?.includes(v) ? '600' : '400', color: activeFilters?.includes(v) ? '#2563eb' : '#334155' }}>{String(v)}</span>
                    </div>
                )) : <div style={{ padding: '10px', fontSize: '0.75rem', color: '#94a3b8' }}>No values found</div>}
            </div>
        </div>
    );
};

// --- Chart Renderer ---
const ChartRenderer = ({ type, data, title, config = {}, filters = {}, onFilterChange, fullData, fields }) => {
    // Process chart data using utility function
    const chartData = useMemo(() => {
        return processChartData(data, config, fields);
    }, [data, config.xKey, config.yKey, config.legendKey, config.yAggregation, config.secondaryYKey, config.secondaryYAggregation, config.sortBy, config.topN, fields]);

    const seriesKeys = useMemo(() => getSeriesKeys(chartData), [chartData]);

    // Create click handler using utility
    const handleClick = createChartClickHandler(config, filters, onFilterChange);

    // Common props using utility functions
    const commonProps = getCommonChartProps(handleClick);
    const elementProps = getElementProps(handleClick);

    if (type.startsWith('slicer_')) {
        return <SlicerRenderer type={type} data={fullData || data} title={title} field={config.xKey} activeFilters={filters[config.xKey]} onFilterChange={onFilterChange} />;
    }

    if (chartData.length === 0) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.8rem' }}>No data available</div>;
    }

    const xKey = config.xKey || (type === 'scatter' ? 'val' : 'name');
    const singleSeriesKey = 'value';
    const showLegend = config.showLegend !== false;
    const xAxisLabel = config.xAxisAxisTitleText || '';
    const yAxisLabel = config.yAxisAxisTitleText || '';
    const color = config.color || '#0088FE';
    const getSeriesColor = (key, idx) => config.seriesColors?.[key] || COLORS[idx % COLORS.length];

    // Reuse axis props utils (passing minimal context as needed)
    // We are simplifying props here for brevity, assuming utils handle defaults
    const getAxisTickStyle = (axis) => ({
        fontSize: parseInt(config[`${axis}AxisFontSize`] || 12),
        fill: config[`${axis}AxisColor`] || '#64748b'
    });

    const xAxisProps = { ...getXAxisProps(config), dataKey: "name" };
    const yAxisProps = getYAxisProps(config);
    const secondaryYAxisProps = getSecondaryYAxisProps(config, fields);

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
                                <Bar key={s} dataKey={s} fill={getSeriesColor(s, i)} radius={[0, 4, 4, 0]} {...elementProps} />
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
                                <Bar key={s} dataKey={s} stackId="a" fill={getSeriesColor(s, i)} {...elementProps} />
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
                                <Line key={s} type="monotone" dataKey={s} stroke={getSeriesColor(s, i)} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} {...elementProps} />
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
                                <Area key={s} type="monotone" dataKey={s} stackId="1" stroke={getSeriesColor(s, i)} fill={getSeriesColor(s, i)} fillOpacity={0.3} {...elementProps} />
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
                    />
                </div>
            );
        }
        case 'kpi':
            return <KPIWidget title={title} value={chartData[0]?.[singleSeriesKey] || "0"} trend={null} />;
        case 'key_driver':
            return <KeyDriverWidget surveyId={config.surveyId} targetMetric={config.targetMetric} />;
        case 'word_cloud':
            return (
                <WordCloudWidget
                    surveyId={config.surveyId}
                    textField={config.xKey}
                    textFieldName={config.xKey}
                    sentimentMetric={config.targetMetric}
                    onFilterChange={onFilterChange}
                />
            );
        case 'stat_sig':
            return <StatSigWidget surveyId={config.surveyId} />;
        case 'pivot':
            return (
                <PivotWidget
                    surveyId={config.surveyId}
                    rowField={config.xKey}
                    colField={config.legendKey}
                    valueField={config.yKey}
                    operation={config.operation || 'count'}
                />
            );
        case 'anomaly':
            return <AnomalyWidget surveyId={config.surveyId} targetMetric={config.targetMetric} />;
        case 'cohort':
            return <CohortWidget surveyId={config.surveyId} metric={config.metric || 'nps'} cohortBy={config.cohortBy || 'month'} />;
        case 'forecast':
            return <ForecastWidget surveyId={config.surveyId} metric={config.metric || 'nps'} periods={config.periods || 7} interval={config.interval || 'day'} />;
        case 'table':
            return <TableWidget data={chartData} />;
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

export const PublicReportViewer = () => {
    const { id } = useParams();
    const [reportData, setReportData] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                setLoading(true);
                // 1. Fetch Report Config
                const reportRes = await axios.get(`/api/reports/public/${id}`);
                const report = reportRes.data;

                // Parse special fields if they are strings
                if (typeof report.layout === 'string') report.layout = JSON.parse(report.layout);
                if (typeof report.widgets === 'string') report.widgets = JSON.parse(report.widgets);
                if (typeof report.fields === 'string') report.fields = JSON.parse(report.fields);
                if (typeof report.theme === 'string') report.theme = JSON.parse(report.theme);
                if (typeof report.filters === 'string') report.filters = JSON.parse(report.filters);

                setReportData(report);
                // Initialize filters from saved report state
                if (report.filters) {
                    setFilters(report.filters);
                }

                if (report.theme) {
                    const t = report.theme;
                    if (t.primaryColor) document.documentElement.style.setProperty('--primary-color', t.primaryColor);
                    if (t.secondaryColor) document.documentElement.style.setProperty('--secondary-color', t.secondaryColor);
                    if (t.backgroundColor) document.body.style.backgroundColor = t.backgroundColor;
                    if (t.textColor) document.body.style.color = t.textColor;
                    if (t.fontFamily) document.body.style.fontFamily = t.fontFamily;
                }

                // 2. Fetch submissions for the form
                const subRes = await axios.get(`/api/submissions?formId=${report.form_id}`);
                setSubmissions(subRes.data || []);
                setLoading(false);

                if (report.title) document.title = report.title;

            } catch (err) {
                console.error('Error loading report:', err);
                setError('Report not found or access denied.');
                setLoading(false);
            }
        };

        if (id) fetchReport();
    }, [id]);

    const handleFilterChange = (field, values) => {
        setFilters(prev => ({
            ...prev,
            [field]: values
        }));
    };

    const toggleFilters = () => {
        setShowFilters(!showFilters);
        // Force resize event for charts
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    };

    // Calculate filtered data
    const filteredData = useMemo(() => {
        if (Object.keys(filters).length === 0) return submissions;

        return submissions.filter(row => {
            return Object.entries(filters).every(([key, values]) => {
                if (!values || values.length === 0) return true;
                const rowVal = String(row[key]);
                return values.includes(rowVal);
            });
        });
    }, [submissions, filters]);

    // Construct Dataset for FiltersPanel
    const dataset = useMemo(() => ({
        data: submissions,
        fields: reportData?.fields || []
    }), [submissions, reportData]);


    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary-color, #2563eb)" />
            <p style={{ marginTop: '20px', color: '#64748b' }}>Loading Report...</p>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
            <AlertCircle size={48} color="#ef4444" />
            <p style={{ marginTop: '20px', color: '#ef4444', fontSize: '1.2rem' }}>{error}</p>
        </div>
    );

    if (!reportData) return null;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: reportData.theme?.backgroundColor || '#f8fafc' }}>

            {/* Header */}
            <header style={{
                height: '70px', background: 'white', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px',
                position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Logo size={32} showText={true} textColor="var(--text-main, #1e293b)" />
                    <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>{reportData.title}</h1>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Report Viewer</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={toggleFilters}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', borderRadius: '8px',
                            background: showFilters ? '#eff6ff' : 'white',
                            border: showFilters ? '1px solid #2563eb' : '1px solid #e2e8f0',
                            color: showFilters ? '#2563eb' : '#64748b', transition: 'all 0.2s', cursor: 'pointer'
                        }}
                    >
                        <Filter size={16} />
                        Filter
                    </button>
                    <div style={{ padding: '8px 16px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} />
                        {new Date().toLocaleDateString()}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Report Canvas */}
                <div style={{ flex: 1, padding: '30px', overflowY: 'auto', position: 'relative' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                        <ResponsiveGridLayout
                            className="layout"
                            layouts={reportData.layout}
                            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                            rowHeight={60}
                            width={showFilters ? window.innerWidth - 340 : window.innerWidth - 60}
                            margin={[20, 20]}
                            isDraggable={false}
                            isResizable={false}
                        >
                            {reportData.layout.lg.map(item => {
                                const widgetConfig = reportData.widgets[item.i];
                                if (!widgetConfig) return <div key={item.i}></div>;
                                return (
                                    <div key={item.i} style={{
                                        background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                                    }}>
                                        {widgetConfig.title && !widgetConfig.hideTitle && (
                                            <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#334155', fontSize: '0.95rem' }}>
                                                {widgetConfig.title}
                                            </div>
                                        )}
                                        <div style={{ flex: 1, padding: '10px', minHeight: 0 }}>
                                            <ChartRenderer
                                                type={widgetConfig.type}
                                                data={filteredData}
                                                fullData={submissions} /* Pass full data for slicers */
                                                config={widgetConfig}
                                                title={widgetConfig.title}
                                                filters={filters}
                                                onFilterChange={handleFilterChange}
                                                fields={reportData.fields}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </ResponsiveGridLayout>
                    </div>
                </div>

                {/* Filter Sidebar */}
                {showFilters && (
                    <div style={{
                        width: '320px', background: 'white', borderLeft: '1px solid #e2e8f0',
                        display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 16px rgba(0,0,0,0.05)',
                        zIndex: 90
                    }}>
                        <FiltersPanel
                            dataset={dataset}
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onToggle={toggleFilters}
                        />
                    </div>
                )}

            </div>

            {/* Footer */}
            <footer style={{
                padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0',
                textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem'
            }}>
                Powered by RayiX Studio &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
};
