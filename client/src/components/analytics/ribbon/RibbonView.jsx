import React from 'react';
import {
  Grid, Layout, Smartphone, Eye, EyeOff, Maximize2,
  Sidebar, ZoomIn, ZoomOut, RefreshCw
} from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * RibbonView - View tab actions for the ribbon
 * Provides view settings, zoom, and display options
 */
export function RibbonView({
  showGrid,
  onToggleGrid,
  showPanels,
  onTogglePanels,
  orientation,
  onToggleOrientation,
  isMobileView,
  onToggleMobile,
  isFullscreen,
  onToggleFullscreen,
  zoom = 100,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onRefresh
}) {
  return (
    <div className={styles.ribbonSection}>
      {/* Display Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          Display
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onToggleGrid}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            style={{
              background: showGrid ? 'var(--secondary-background-color, #334155)' : 'transparent'
            }}
            aria-pressed={showGrid}
            aria-label={showGrid ? 'Hide grid' : 'Show grid'}
          >
            <Grid size={14} /> {showGrid ? 'Hide' : 'Show'} Grid
          </button>

          <button
            onClick={onTogglePanels}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            aria-pressed={showPanels}
            aria-label={showPanels ? 'Hide panels' : 'Show panels'}
          >
            {showPanels ? <EyeOff size={14} /> : <Eye size={14} />} Panels
          </button>
        </div>
      </div>

      <div className={styles.ribbonDivider} />

      {/* Layout Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          Layout
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onToggleOrientation}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            aria-label={`Switch to ${orientation === 'landscape' ? 'portrait' : 'landscape'} orientation`}
          >
            <Layout size={14} /> {orientation === 'landscape' ? 'Portrait' : 'Landscape'}
          </button>

          <button
            onClick={onToggleMobile}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            style={{
              background: isMobileView ? 'var(--secondary-background-color, #334155)' : 'transparent'
            }}
            aria-pressed={isMobileView}
            aria-label="Toggle mobile view"
          >
            <Smartphone size={14} /> Mobile
          </button>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
              aria-pressed={isFullscreen}
              aria-label="Toggle fullscreen"
            >
              <Maximize2 size={14} /> Fullscreen
            </button>
          )}
        </div>
      </div>

      <div className={styles.ribbonDivider} />

      {/* Zoom Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          Zoom
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={onZoomOut}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            disabled={zoom <= 50}
            aria-label="Zoom out"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <span style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#1e293b',
            minWidth: '50px',
            textAlign: 'center'
          }}>
            {zoom}%
          </span>

          <button
            onClick={onZoomIn}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            disabled={zoom >= 200}
            aria-label="Zoom in"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          {onResetZoom && (
            <button
              onClick={onResetZoom}
              className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
              aria-label="Reset zoom to 100%"
              title="Reset Zoom"
            >
              100%
            </button>
          )}
        </div>
      </div>

      {onRefresh && (
        <>
          <div className={styles.ribbonDivider} />

          {/* Refresh Group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
              Data
            </div>
            <button
              onClick={onRefresh}
              className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonSmall}`}
              aria-label="Refresh data"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default RibbonView;
