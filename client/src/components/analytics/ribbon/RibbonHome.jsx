import React from 'react';
import { Save, Download, Upload, Trash2, Copy, Undo, Redo } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * RibbonHome - Home tab actions for the ribbon
 * Provides common file operations and clipboard actions
 */
export function RibbonHome({
  onSave,
  onExport,
  onImport,
  onDelete,
  onDuplicate,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) {
  return (
    <div className={styles.ribbonSection}>
      {/* Clipboard Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          Clipboard
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo size={14} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo size={14} />
          </button>
          <button
            onClick={onDuplicate}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            title="Duplicate (Ctrl+D)"
            aria-label="Duplicate"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className={styles.ribbonDivider} />

      {/* File Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          File
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onSave}
            className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonSmall}`}
            aria-label="Save report"
          >
            <Save size={14} /> Save
          </button>
          <button
            onClick={onExport}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            aria-label="Export report"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={onImport}
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            aria-label="Import data"
          >
            <Upload size={14} /> Import
          </button>
        </div>
      </div>

      <div className={styles.ribbonDivider} />

      {/* Delete Group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
          Actions
        </div>
        <button
          onClick={onDelete}
          className={`${styles.button} ${styles.buttonDanger} ${styles.buttonSmall}`}
          aria-label="Delete report"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}

export default RibbonHome;
