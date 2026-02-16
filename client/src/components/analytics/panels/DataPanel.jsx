import React, { useState } from 'react';
import { Plus, X, MoreVertical } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * DataPanel - Displays available data fields and allows creating custom measures
 */
export function DataPanel({ dataset, isCollapsed, onToggle, onAddMeasure }) {
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
      type: 'number',
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

  const displayFields = dataset?.fields || [];

  if (isCollapsed) {
    return (
      <div className={styles.leftPanel} style={{ width: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '15px' }}>
          <button
            onClick={onToggle}
            className={styles.iconButton}
            title="Expand Data"
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
            Data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panelContainer}>
      <div className={styles.panelHeader}>
        <h4 className={styles.panelTitle}>DATA</h4>
        <button
          onClick={onToggle}
          className={styles.iconButton}
          aria-label="Close data panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className={styles.panelContent}>
        {displayFields.length > 0 ? (
          displayFields.map((field, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", field.name);
              }}
              style={{
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                fontSize: '0.9rem',
                color: '#334155',
                cursor: 'grab',
                borderBottom: '1px solid transparent',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                const btn = e.currentTarget.querySelector('.add-measure-btn');
                if (btn) btn.style.display = 'block';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                const btn = e.currentTarget.querySelector('.add-measure-btn');
                if (btn) btn.style.display = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <span
                  className={field.isMeasure ? styles.badgePrimary : styles.badge}
                  style={{
                    fontSize: '0.7rem',
                    border: `1px solid ${field.isMeasure ? '#8b5cf6' : '#cbd5e1'}`,
                    color: field.isMeasure ? '#8b5cf6' : '#64748b',
                    fontWeight: field.isMeasure ? 'bold' : 'normal',
                    minWidth: '24px',
                    textAlign: 'center'
                  }}
                >
                  {field.isMeasure ? 'fx' : (field.type === 'category' ? 'abc' : '#')}
                </span>
                <span
                  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={field.label || field.name}
                >
                  {field.label || field.name}
                </span>
              </div>

              {!field.isMeasure && (
                <button
                  className="add-measure-btn"
                  onClick={() => openMeasureModal(field)}
                  style={{
                    display: 'none',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                  title="Create Measure"
                >
                  <MoreVertical size={14} color="#94a3b8" />
                </button>
              )}
            </div>
          ))
        ) : (
          <p style={{ padding: '20px', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
            No Dataset Selected
          </p>
        )}
      </div>

      {/* Quick Measure Modal */}
      {showMeasureModal && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            background: 'rgba(255,255,255,0.98)',
            zIndex: 10,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Create Measure</h4>

          <div className={styles.formGroup}>
            <label className={styles.label}>Source Field</label>
            <div style={{
              padding: '8px',
              background: '#f1f5f9',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              {measureTargetField?.name}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="measure-aggregation" className={styles.label}>Aggregation</label>
            <select
              id="measure-aggregation"
              value={newMeasureConfig.type}
              onChange={(e) =>
                setNewMeasureConfig({
                  ...newMeasureConfig,
                  type: e.target.value,
                  name: `${measureTargetField.name} ${e.target.value}`
                })
              }
              className={styles.select}
            >
              <option value="count">Count</option>
              <option value="distinct">Count Distinct</option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="measure-name" className={styles.label}>Measure Name</label>
            <input
              id="measure-name"
              value={newMeasureConfig.name}
              onChange={(e) => setNewMeasureConfig({ ...newMeasureConfig, name: e.target.value })}
              className={styles.input}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <button
              onClick={handleCreateMeasure}
              className={`${styles.button} ${styles.buttonPrimary}`}
              style={{ flex: 1 }}
            >
              Create
            </button>
            <button
              onClick={() => setShowMeasureModal(false)}
              className={`${styles.button} ${styles.buttonSecondary}`}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataPanel;
