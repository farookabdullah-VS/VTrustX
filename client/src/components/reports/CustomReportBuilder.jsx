/**
 * Custom Report Builder
 *
 * Visual drag-and-drop report designer with grid layout
 * Features:
 * - Drag widgets from library onto canvas
 * - Resize and reposition widgets
 * - Configure widget data sources and appearance
 * - Save, load, and share reports
 * - Real-time data preview
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
    Save,
    Plus,
    Settings,
    Eye,
    Share2,
    X,
    BarChart3,
    LineChart,
    PieChart,
    Table as TableIcon,
    TrendingUp,
    Filter,
    Calendar,
    Download
} from 'lucide-react';
import axios from '../../axiosConfig';
import WidgetLibrary from './WidgetLibrary';
import WidgetConfigPanel from './WidgetConfigPanel';
import MetricWidget from './widgets/MetricWidget';
import ChartWidget from './widgets/ChartWidget';
import TableWidget from './widgets/TableWidget';
import TextWidget from './widgets/TextWidget';
import FunnelWidget from './widgets/FunnelWidget';
import GaugeWidget from './widgets/GaugeWidget';
import './CustomReportBuilder.css';

const CustomReportBuilder = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    // Report state
    const [report, setReport] = useState({
        name: 'Untitled Report',
        description: '',
        category: 'custom',
        tags: [],
        filters: {
            dateRange: 'last_30_days',
            formIds: [],
            customFilters: []
        },
        layout: {
            columns: 12,
            rowHeight: 80
        }
    });

    const [widgets, setWidgets] = useState([]);
    const [layout, setLayout] = useState([]);
    const [selectedWidget, setSelectedWidget] = useState(null);
    const [widgetData, setWidgetData] = useState({});

    // UI state
    const [showLibrary, setShowLibrary] = useState(true);
    const [showConfigPanel, setShowConfigPanel] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load report in edit mode
    useEffect(() => {
        if (isEditMode) {
            loadReport();
        }
    }, [id]);

    const loadReport = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/custom-reports/${id}`);
            const reportData = response.data.data;

            setReport({
                name: reportData.name,
                description: reportData.description,
                category: reportData.category,
                tags: reportData.tags,
                filters: reportData.filters,
                layout: reportData.layout
            });

            setWidgets(reportData.widgets || []);
            setLayout(reportData.widgets.map(w => ({
                i: w.widgetKey,
                x: w.position.x,
                y: w.position.y,
                w: w.position.w,
                h: w.position.h
            })));

            // Fetch data for all widgets
            await fetchAllWidgetData(id);
        } catch (error) {
            console.error('Failed to load report:', error);
            alert('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllWidgetData = async (reportId) => {
        try {
            const response = await axios.get(`/api/custom-reports/${reportId}/data`);
            setWidgetData(response.data.data.widgets);
        } catch (error) {
            console.error('Failed to fetch widget data:', error);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Update widget positions from layout
            const updatedWidgets = widgets.map(widget => {
                const layoutItem = layout.find(l => l.i === widget.widgetKey);
                if (layoutItem) {
                    return {
                        ...widget,
                        position: {
                            x: layoutItem.x,
                            y: layoutItem.y,
                            w: layoutItem.w,
                            h: layoutItem.h
                        }
                    };
                }
                return widget;
            });

            if (isEditMode) {
                // Update existing report
                await axios.put(`/api/custom-reports/${id}`, {
                    ...report,
                    layout: {
                        ...report.layout,
                        widgets: layout
                    }
                });

                // Update all widgets
                for (const widget of updatedWidgets) {
                    if (widget.id) {
                        await axios.put(`/api/custom-reports/${id}/widgets/${widget.id}`, widget);
                    } else {
                        await axios.post(`/api/custom-reports/${id}/widgets`, widget);
                    }
                }

                alert('Report saved successfully!');
            } else {
                // Create new report
                const response = await axios.post('/api/custom-reports', {
                    ...report,
                    layout: {
                        ...report.layout,
                        widgets: layout
                    }
                });

                const reportId = response.data.data.id;

                // Add all widgets
                for (const widget of updatedWidgets) {
                    await axios.post(`/api/custom-reports/${reportId}/widgets`, widget);
                }

                alert('Report created successfully!');
                navigate(`/custom-reports/${reportId}`);
            }

            // Refresh data
            if (isEditMode) {
                await fetchAllWidgetData(id);
            }
        } catch (error) {
            console.error('Failed to save report:', error);
            alert('Failed to save report');
        } finally {
            setSaving(false);
        }
    };

    const handleAddWidget = (widgetType) => {
        const widgetKey = `widget-${Date.now()}`;

        const newWidget = {
            widgetKey,
            widgetType,
            position: { x: 0, y: Infinity, w: 4, h: 3 },
            config: getDefaultConfig(widgetType),
            dataSource: { type: 'submissions', formIds: [], filters: [] },
            localFilters: {},
            title: `New ${widgetType}`,
            showTitle: true,
            style: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16 }
        };

        setWidgets([...widgets, newWidget]);
        setLayout([...layout, {
            i: widgetKey,
            x: 0,
            y: Infinity,
            w: 4,
            h: 3
        }]);

        setSelectedWidget(newWidget);
        setShowConfigPanel(true);
        setShowLibrary(false);
    };

    const handleRemoveWidget = (widgetKey) => {
        if (!confirm('Are you sure you want to remove this widget?')) return;

        setWidgets(widgets.filter(w => w.widgetKey !== widgetKey));
        setLayout(layout.filter(l => l.i !== widgetKey));

        if (selectedWidget?.widgetKey === widgetKey) {
            setSelectedWidget(null);
            setShowConfigPanel(false);
        }
    };

    const handleWidgetClick = (widget) => {
        setSelectedWidget(widget);
        setShowConfigPanel(true);
    };

    const handleUpdateWidget = (updatedWidget) => {
        setWidgets(widgets.map(w =>
            w.widgetKey === updatedWidget.widgetKey ? updatedWidget : w
        ));
    };

    const handleLayoutChange = (newLayout) => {
        setLayout(newLayout);
    };

    const getDefaultConfig = (widgetType) => {
        switch (widgetType) {
            case 'metric':
                return { metric: 'total_responses', aggregate: 'count', comparisonPeriod: null };
            case 'chart':
                return { chartType: 'bar', metric: 'count', groupBy: 'date', limit: 10 };
            case 'table':
                return { columns: [], sortBy: 'created_at', sortOrder: 'DESC', pageSize: 10 };
            case 'funnel':
                return { steps: [] };
            case 'gauge':
                return { metric: 'nps_score', goal: 50, min: -100, max: 100 };
            case 'text':
                return { content: 'Enter text here', fontSize: 16, alignment: 'left' };
            default:
                return {};
        }
    };

    const renderWidget = (widget) => {
        const data = widgetData[widget.id] || null;

        const commonProps = {
            widget,
            data,
            onRemove: () => handleRemoveWidget(widget.widgetKey),
            onClick: () => handleWidgetClick(widget),
            isSelected: selectedWidget?.widgetKey === widget.widgetKey
        };

        switch (widget.widgetType) {
            case 'metric':
                return <MetricWidget {...commonProps} />;
            case 'chart':
                return <ChartWidget {...commonProps} />;
            case 'table':
                return <TableWidget {...commonProps} />;
            case 'text':
                return <TextWidget {...commonProps} />;
            case 'funnel':
                return <FunnelWidget {...commonProps} />;
            case 'gauge':
                return <GaugeWidget {...commonProps} />;
            default:
                return <div>Unknown widget type: {widget.widgetType}</div>;
        }
    };

    if (loading) {
        return (
            <div className="report-builder-loading">
                <div className="spinner"></div>
                <p>Loading report...</p>
            </div>
        );
    }

    return (
        <div className="custom-report-builder">
            {/* Header */}
            <div className="builder-header">
                <div className="header-left">
                    <input
                        type="text"
                        className="report-name-input"
                        value={report.name}
                        onChange={(e) => setReport({ ...report, name: e.target.value })}
                        placeholder="Report Name"
                    />
                    <span className="report-status">
                        {saving ? 'Saving...' : isEditMode ? 'Saved' : 'Unsaved'}
                    </span>
                </div>

                <div className="header-actions">
                    <button
                        className="btn-icon"
                        onClick={() => setShowLibrary(!showLibrary)}
                        title="Widget Library"
                    >
                        <Plus size={20} />
                    </button>

                    <button
                        className="btn-icon"
                        onClick={() => setPreviewMode(!previewMode)}
                        title={previewMode ? 'Edit Mode' : 'Preview Mode'}
                    >
                        <Eye size={20} />
                    </button>

                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Report'}
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/custom-reports')}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="builder-content">
                {/* Widget Library Sidebar */}
                {showLibrary && !previewMode && (
                    <WidgetLibrary
                        onAddWidget={handleAddWidget}
                        onClose={() => setShowLibrary(false)}
                    />
                )}

                {/* Report Canvas */}
                <div className="report-canvas">
                    {widgets.length === 0 ? (
                        <div className="empty-canvas">
                            <BarChart3 size={64} color="#D1D5DB" />
                            <h3>Start Building Your Report</h3>
                            <p>Drag widgets from the library to get started</p>
                            <button
                                className="btn-primary"
                                onClick={() => setShowLibrary(true)}
                            >
                                <Plus size={18} />
                                Add Widget
                            </button>
                        </div>
                    ) : (
                        <GridLayout
                            className="grid-layout"
                            layout={layout}
                            cols={report.layout.columns}
                            rowHeight={report.layout.rowHeight}
                            width={1200}
                            onLayoutChange={handleLayoutChange}
                            isDraggable={!previewMode}
                            isResizable={!previewMode}
                            compactType="vertical"
                        >
                            {widgets.map(widget => (
                                <div key={widget.widgetKey} className="grid-item">
                                    {renderWidget(widget)}
                                </div>
                            ))}
                        </GridLayout>
                    )}
                </div>

                {/* Widget Config Panel */}
                {showConfigPanel && selectedWidget && !previewMode && (
                    <WidgetConfigPanel
                        widget={selectedWidget}
                        onUpdate={handleUpdateWidget}
                        onClose={() => {
                            setShowConfigPanel(false);
                            setSelectedWidget(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default CustomReportBuilder;
