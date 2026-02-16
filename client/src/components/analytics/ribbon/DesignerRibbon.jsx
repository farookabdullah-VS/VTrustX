import React from 'react';
import { ChevronRight, Save, Printer, Share2, Smartphone, Sparkles, Grid, Layout } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * DesignerRibbon - Main ribbon/toolbar for the report designer
 * Provides navigation, report title editing, and action buttons
 */
export function DesignerRibbon({
  report,
  onUpdateReport,
  onSave,
  onBack,
  onShare,
  activeTab = 'Home',
  onTabChange,
  onAiAutoBuild,
  isMobileView,
  onToggleMobile,
  showGrid,
  onToggleGrid,
  orientation,
  onToggleOrientation
}) {
  const tabs = ['Home', 'Insert', 'Modeling', 'View'];

  return (
    <div
      className={`${styles.ribbon} no-print`}
      style={{
        height: '50px',
        background: 'var(--primary-color, #1e293b)',
        color: '#e2e8f0',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* Left Section: Back Button & Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        paddingRight: '15px',
        borderRight: '1px solid var(--border-color-dark, #334155)'
      }}>
        <button
          onClick={onBack}
          className={styles.iconButton}
          style={{
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}
          aria-label="Go back to report list"
        >
          <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> BACK
        </button>

        <div style={{
          color: 'white',
          fontWeight: '600',
          fontSize: '1rem',
          marginLeft: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>Analytics Studio |</span>
          <input
            type="text"
            value={report?.title || 'Untitled Report'}
            onChange={(e) => onUpdateReport({ ...report, title: e.target.value })}
            className={styles.input}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color-light, #94a3b8)',
              fontSize: '0.9rem',
              fontWeight: '500',
              width: '200px',
              padding: '4px 8px'
            }}
            onFocus={(e) => e.target.style.color = 'white'}
            onBlur={(e) => e.target.style.color = 'var(--text-color-light, #94a3b8)'}
            aria-label="Report title"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.ribbonTabs} style={{ marginLeft: '20px' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`${styles.ribbonTab} ${activeTab === tab ? styles.active : ''}`}
            aria-label={`${tab} tab`}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Tab-Specific Actions */}
      {activeTab === 'Insert' && onAiAutoBuild && (
        <button
          onClick={onAiAutoBuild}
          className={`${styles.button} ${styles.buttonPrimary}`}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            marginRight: '20px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          aria-label="Build report with AI"
        >
          <Sparkles size={16} /> BUILD WITH AI
        </button>
      )}

      {activeTab === 'View' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '20px' }}>
          <button
            onClick={onToggleGrid}
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{
              background: showGrid ? 'var(--secondary-background-color, #334155)' : 'transparent',
              border: '1px solid var(--border-color-medium, #475569)',
              color: 'white',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            aria-pressed={showGrid}
            aria-label={showGrid ? 'Hide grid' : 'Show grid'}
          >
            <Grid size={14} /> {showGrid ? 'Hide Grid' : 'Show Grid'}
          </button>

          <button
            onClick={onToggleOrientation}
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{
              background: 'var(--secondary-background-color, #334155)',
              border: '1px solid var(--border-color-medium, #475569)',
              color: 'white',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            aria-label={`Switch to ${orientation === 'landscape' ? 'portrait' : 'landscape'} orientation`}
          >
            <Layout size={14} /> {orientation === 'landscape' ? 'Portrait' : 'Landscape'}
          </button>
        </div>
      )}

      {/* Right Section: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onToggleMobile}
          className={styles.iconButton}
          style={{
            background: isMobileView ? 'var(--primary-color, #1e293b)' : 'transparent',
            color: isMobileView ? 'var(--accent-color-light, #60a5fa)' : 'var(--text-color-light, #94a3b8)',
            border: isMobileView ? '1px solid var(--border-color-medium, #475569)' : 'none',
            padding: '6px 12px',
            borderRadius: '4px'
          }}
          aria-pressed={isMobileView}
          aria-label="Toggle mobile view"
          title="Mobile Layout View"
        >
          <Smartphone size={18} />
        </button>

        <button
          onClick={onSave}
          className={`${styles.button} ${styles.buttonPrimary}`}
          style={{
            background: 'var(--button-primary-background, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          aria-label="Save report"
        >
          <Save size={16} /> SAVE
        </button>

        <button
          onClick={() => window.print()}
          className={`${styles.button} ${styles.buttonSecondary}`}
          style={{
            background: 'var(--button-secondary-background, #475569)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          aria-label="Print report"
        >
          <Printer size={16} /> PRINT
        </button>

        <button
          onClick={onShare}
          className={`${styles.button} ${styles.buttonPrimary}`}
          style={{
            background: 'var(--button-success-background, #10b981)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          aria-label="Publish or share report"
        >
          <Share2 size={16} /> PUBLISH
        </button>
      </div>
    </div>
  );
}

export default DesignerRibbon;
