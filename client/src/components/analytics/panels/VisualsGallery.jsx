import React from 'react';
import {
  Map, Layers, BarChart2, Activity, PieChart as PieIcon, Filter, StopCircle,
  Grid, CreditCard, List, Zap, MessageSquare, AlertCircle, Type, Calendar,
  Plus, X, Settings
} from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * VisualsGallery - Gallery of available visualizations and slicers
 */
export function VisualsGallery({ onAddVisual, isCollapsed, onToggle, selectedWidget, onEditWidget }) {
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

  if (isCollapsed) {
    return (
      <div className={styles.leftPanel} style={{ width: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '15px' }}>
          <button
            onClick={onToggle}
            className={styles.iconButton}
            title="Add Visuals"
            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '20px' }}
          >
            <Plus size={18} color="#2563eb" />
          </button>
          <div style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontWeight: '600',
            color: '#64748b',
            letterSpacing: '1px',
            fontSize: '0.85rem'
          }}>
            Gallery
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panelContainer}>
      <div className={styles.panelHeader}>
        <h4 className={styles.panelTitle}>GALLERY</h4>
        <button
          onClick={onToggle}
          className={styles.iconButton}
          aria-label="Close visuals gallery"
        >
          <X size={16} />
        </button>
      </div>

      <div className={styles.panelContent}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {[...visuals, ...slicers].map(visual => (
            <button
              key={visual.type}
              onClick={() => onAddVisual(visual.type)}
              title={visual.label}
              className={styles.iconButton}
              style={{
                height: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                gap: '4px',
                transition: 'all 0.2s',
                padding: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {visual.icon}
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '500' }}>
                {visual.label}
              </span>
            </button>
          ))}
        </div>

        {selectedWidget && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#eff6ff',
            borderRadius: '12px',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#1e40af',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              Selected: {selectedWidget.title}
            </div>
            <button
              onClick={onEditWidget}
              className={`${styles.button} ${styles.buttonPrimary}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              <Settings size={14} /> Format Visual
            </button>
            <p style={{
              fontSize: '0.7rem',
              color: '#64748b',
              marginTop: '8px',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              Tip: Use the gear icon on the chart header to edit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VisualsGallery;
