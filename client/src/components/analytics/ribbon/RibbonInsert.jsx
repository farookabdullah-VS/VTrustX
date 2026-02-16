import React from 'react';
import {
  BarChart2, PieChart, LineChart, Table, CreditCard, Zap,
  MessageSquare, AlertCircle, Type, Image, Sparkles
} from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * RibbonInsert - Insert tab actions for the ribbon
 * Provides quick access to add visualizations and elements
 */
export function RibbonInsert({
  onAddVisual,
  onAddKPI,
  onAddTable,
  onAddText,
  onAddImage,
  onAiAutoBuild
}) {
  const quickInserts = [
    { type: 'column', icon: <BarChart2 size={16} />, label: 'Column Chart' },
    { type: 'pie', icon: <PieChart size={16} />, label: 'Pie Chart' },
    { type: 'line', icon: <LineChart size={16} />, label: 'Line Chart' },
    { type: 'kpi', icon: <CreditCard size={16} />, label: 'KPI Card' },
    { type: 'table', icon: <Table size={16} />, label: 'Table' },
  ];

  const advancedInserts = [
    { type: 'key_driver', icon: <Zap size={16} />, label: 'Key Drivers', color: '#eab308' },
    { type: 'word_cloud', icon: <MessageSquare size={16} />, label: 'Word Cloud' },
    { type: 'anomaly', icon: <AlertCircle size={16} />, label: 'AI Watchdog', color: '#dc2626' },
  ];

  return (
    <div className={styles.ribbonSection}>
      {/* Charts Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          Charts
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {quickInserts.map(item => (
            <button
              key={item.type}
              onClick={() => onAddVisual(item.type)}
              className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
              title={item.label}
              aria-label={`Add ${item.label}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {item.icon}
              <span style={{ fontSize: '0.75rem' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.ribbonDivider} />

      {/* AI & Advanced Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          AI & Advanced
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {onAiAutoBuild && (
            <button
              onClick={onAiAutoBuild}
              className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonSmall}`}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
              }}
              aria-label="Build report with AI"
            >
              <Sparkles size={14} /> AI Build
            </button>
          )}

          {advancedInserts.map(item => (
            <button
              key={item.type}
              onClick={() => onAddVisual(item.type)}
              className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
              title={item.label}
              aria-label={`Add ${item.label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: item.color || undefined
              }}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.ribbonDivider} />

      {/* Elements Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          Elements
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onAddText}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            aria-label="Add text box"
          >
            <Type size={14} /> Text
          </button>
          <button
            onClick={onAddImage}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            aria-label="Add image"
          >
            <Image size={14} /> Image
          </button>
        </div>
      </div>
    </div>
  );
}

export default RibbonInsert;
