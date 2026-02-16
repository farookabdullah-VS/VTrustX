import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { DesignerRibbon } from '../ribbon/DesignerRibbon';
import { DataPanel, VisualsGallery, FiltersPanel, ClosedLoopPanel } from '../panels';
import { WidgetContainer, KPIWidget, TableWidget, ChartWidget } from '../widgets';
import { useReportState, useReportData, useFilters, useResponsive } from '../hooks';
import { saveReport } from '../../../services/reportService';
import { getSubmissionsForForm } from '../../../services/formService';
import { useToast } from '../../common/Toast';
import styles from '../styles/Analytics.module.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

/**
 * extractFieldsFromDefinition - Helper to extract fields from survey definition
 */
function extractFieldsFromDefinition(definition) {
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
}

/**
 * ReportDesigner - Main report designer component
 */
export function ReportDesigner({ report: initialReport, onBack }) {
  const toast = useToast();
  const { isMobile } = useResponsive();

  // State management
  const {
    report,
    isDirty,
    selectedWidget,
    setSelectedWidget,
    updateReport,
    updateWidget,
    addWidget,
    removeWidget,
    updateLayout,
    markClean
  } = useReportState(initialReport);

  // UI state
  const [activeTab, setActiveTab] = useState('Home');
  const [visualsCollapsed, setVisualsCollapsed] = useState(false);
  const [dataCollapsed, setDataCollapsed] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [showClosedLoop, setShowClosedLoop] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [orientation, setOrientation] = useState('landscape');

  // Data management
  const [dataset, setDataset] = useState({ data: [], fields: report?.fields || [] });
  const { filters, addFilter, removeFilter, clearFilters } = useFilters({});

  // Load survey data
  useEffect(() => {
    if (report?.surveyId) {
      loadData();
    }
  }, [report?.surveyId]);

  const loadData = async () => {
    try {
      const submissions = await getSubmissionsForForm(report.surveyId);
      const parsedData = submissions.map(s => ({
        ...s.response_data,
        submission_date: new Date(s.created_at).toLocaleDateString()
      }));

      setDataset({
        data: parsedData,
        fields: report.fields || extractFieldsFromDefinition(report.definition)
      });
    } catch (err) {
      console.error('Failed to load survey data:', err);
      toast.error('Failed to load survey data');
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      await saveReport({
        ...report,
        layout: report.layout || [],
        widgets: report.widgets || []
      });
      markClean();
      toast.success('Report saved successfully');
    } catch (err) {
      console.error('Failed to save report:', err);
      toast.error('Failed to save report');
    }
  };

  // Handle add visual
  const handleAddVisual = useCallback((type) => {
    const newWidget = {
      id: `widget-${Date.now()}`,
      type,
      config: {
        title: `New ${type} Chart`,
        xKey: null,
        yKey: null
      },
      layout: {
        i: `widget-${Date.now()}`,
        x: 0,
        y: Infinity,
        w: type === 'kpi' ? 3 : 6,
        h: type === 'table' ? 6 : 4
      }
    };

    addWidget(newWidget);
    setSelectedWidget(newWidget);
    toast.success(`${type} widget added`);
  }, [addWidget, setSelectedWidget, toast]);

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout) => {
    updateLayout(newLayout);
  }, [updateLayout]);

  // Render widget content
  const renderWidgetContent = (widget) => {
    const filteredData = filters.applyFilters ? filters.applyFilters(dataset.data) : dataset.data;

    switch (widget.type) {
      case 'kpi':
        return (
          <KPIWidget
            title={widget.config?.title}
            value={widget.config?.value || filteredData.length}
            target={widget.config?.target}
            trend={widget.config?.trend}
            format={widget.config?.format || 'number'}
          />
        );

      case 'table':
        return (
          <TableWidget
            data={filteredData.slice(0, 100)}
            columns={widget.config?.columns}
            pageSize={20}
          />
        );

      case 'column':
      case 'bar':
      case 'line':
      case 'area':
      case 'pie':
      case 'funnel':
      case 'radar':
      case 'scatter':
      case 'treemap':
        // Aggregate data for chart
        const chartData = aggregateDataForChart(filteredData, widget);
        return (
          <ChartWidget
            type={widget.type}
            data={chartData}
            config={widget.config}
          />
        );

      default:
        return (
          <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>
            {widget.type} widget - Configuration pending
          </div>
        );
    }
  };

  // Simple data aggregation for charts
  const aggregateDataForChart = (data, widget) => {
    if (!widget.config?.xKey || !widget.config?.yKey) {
      return [{ name: 'Sample', value: 100 }];
    }

    const grouped = {};
    data.forEach(row => {
      const key = row[widget.config.xKey] || 'Unknown';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(row[widget.config.yKey]);
    });

    return Object.entries(grouped).map(([name, values]) => ({
      name,
      value: values.length // Count for now, could be sum/avg/etc.
    }));
  };

  // Handle filter change
  const handleFilterChange = (fieldKey, values) => {
    if (!values || values.length === 0) {
      removeFilter(fieldKey);
    } else {
      addFilter(fieldKey, 'in', values);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Ribbon */}
      <DesignerRibbon
        report={report}
        onUpdateReport={updateReport}
        onSave={handleSave}
        onBack={onBack}
        onShare={() => toast.info('Share feature coming soon')}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAiAutoBuild={() => toast.info('AI build feature coming soon')}
        isMobileView={isMobileView}
        onToggleMobile={() => setIsMobileView(!isMobileView)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        orientation={orientation}
        onToggleOrientation={() => setOrientation(orientation === 'landscape' ? 'portrait' : 'landscape')}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel: Visuals Gallery */}
        {!visualsCollapsed && (
          <div style={{ width: '280px', borderRight: '1px solid #e2e8f0' }}>
            <VisualsGallery
              onAddVisual={handleAddVisual}
              isCollapsed={false}
              onToggle={() => setVisualsCollapsed(true)}
              selectedWidget={selectedWidget}
              onEditWidget={() => toast.info('Edit widget feature coming soon')}
            />
          </div>
        )}

        {/* Center: Canvas */}
        <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc', padding: '20px' }}>
          {report?.widgets && report.widgets.length > 0 ? (
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: report.widgets.map(w => w.layout) }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={60}
              onLayoutChange={handleLayoutChange}
              isDraggable={!isMobileView}
              isResizable={!isMobileView}
              compactType="vertical"
              preventCollision={false}
            >
              {report.widgets.map(widget => (
                <div key={widget.layout.i} data-grid={widget.layout}>
                  <WidgetContainer
                    widget={widget}
                    onEdit={() => {
                      setSelectedWidget(widget);
                      toast.info('Widget settings coming soon');
                    }}
                    onRemove={() => {
                      if (window.confirm('Remove this widget?')) {
                        removeWidget(widget.id);
                      }
                    }}
                    onExpand={() => toast.info('Expand feature coming soon')}
                  >
                    {renderWidgetContent(widget)}
                  </WidgetContainer>
                </div>
              ))}
            </ResponsiveGridLayout>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📊</div>
              <div className={styles.emptyStateText}>
                No widgets yet. Add visualizations from the gallery!
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Data or Filters */}
        {!dataCollapsed && (
          <div style={{ width: '280px', borderLeft: '1px solid #e2e8f0' }}>
            <DataPanel
              dataset={dataset}
              isCollapsed={false}
              onToggle={() => setDataCollapsed(true)}
              onAddMeasure={(measure) => {
                toast.success(`Measure ${measure.name} created`);
                // Add measure to dataset fields
                setDataset(prev => ({
                  ...prev,
                  fields: [...prev.fields, measure]
                }));
              }}
            />
          </div>
        )}

        {!filtersCollapsed && (
          <div style={{ width: '280px', borderLeft: '1px solid #e2e8f0' }}>
            <FiltersPanel
              dataset={dataset}
              filters={filters}
              onFilterChange={handleFilterChange}
              isCollapsed={false}
              onToggle={() => setFiltersCollapsed(true)}
            />
          </div>
        )}
      </div>

      {/* Dirty indicator */}
      {isDirty && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#ef4444',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}>
          Unsaved changes
        </div>
      )}
    </div>
  );
}

export default ReportDesigner;
