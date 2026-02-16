import React, { useState } from 'react';
import { Filter, X, ChevronRight } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * FiltersPanel - Power BI style filters panel with field expansion and checkbox selection
 */
export function FiltersPanel({ dataset, filters, onFilterChange, isCollapsed, onToggle }) {
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
    return Array.from(values).sort().slice(0, 50); // Limit for performance
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

  const fieldsToShow = dataset?.fields?.filter(f =>
    (f.label || f.name).toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isCollapsed) {
    return (
      <div className={styles.rightPanel} style={{ width: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '15px' }}>
          <button
            onClick={onToggle}
            className={styles.iconButton}
            title="Show Filters"
            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '20px' }}
          >
            <Filter size={18} color="#2563eb" />
          </button>
          <div style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontWeight: '600',
            color: '#64748b',
            letterSpacing: '1px',
            fontSize: '0.85rem'
          }}>
            Filters
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panelContainer}>
      <div className={styles.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} />
          <h4 className={styles.panelTitle}>FILTERS</h4>
        </div>
        <button
          onClick={onToggle}
          className={styles.iconButton}
          aria-label="Close filters panel"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
        <input
          type="text"
          placeholder="Search fields..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={styles.input}
          style={{ fontSize: '0.85rem' }}
        />
      </div>

      <div className={styles.panelContent}>
        {/* Active Filters Section */}
        {Object.keys(filters).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#94a3b8',
              marginBottom: '10px',
              textTransform: 'uppercase'
            }}>
              Active Filters
            </div>
            {Object.entries(filters).map(([key, values]) => values.length > 0 && (
              <div
                key={key}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  padding: '8px',
                  background: '#dbeafe',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#1e40af'
                }}>
                  {key}
                  <button
                    onClick={() => onFilterChange(key, [])}
                    className={styles.iconButton}
                    aria-label={`Clear filter: ${key}`}
                  >
                    <X size={12} />
                  </button>
                </div>
                <div style={{ padding: '8px', fontSize: '0.8rem', color: '#334155' }}>
                  {values.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Fields */}
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#94a3b8',
          marginBottom: '10px',
          textTransform: 'uppercase'
        }}>
          Filter on this page
        </div>

        {fieldsToShow.map(field => (
          <div
            key={field.name}
            style={{
              marginBottom: '8px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <button
              onClick={() => toggleField(field.name)}
              style={{
                width: '100%',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#334155',
                border: 'none',
                borderRadius: '6px 6px 0 0'
              }}
              aria-expanded={expandedFields[field.name]}
              aria-controls={`filter-values-${field.name}`}
            >
              {field.label || field.name}
              <ChevronRight
                size={14}
                style={{
                  transform: expandedFields[field.name] ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </button>

            {expandedFields[field.name] && (
              <div
                id={`filter-values-${field.name}`}
                style={{
                  padding: '10px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  borderTop: '1px solid #e2e8f0'
                }}
              >
                {getUniqueValues(field.name).map(value => (
                  <div
                    key={value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`filter-${field.name}-${value}`}
                      checked={(filters[field.name] || []).includes(value)}
                      onChange={() => handleCheckboxChange(field.name, value)}
                      className={styles.checkbox}
                    />
                    <label
                      htmlFor={`filter-${field.name}-${value}`}
                      style={{ color: '#475569', cursor: 'pointer' }}
                    >
                      {value}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {fieldsToShow.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateText}>
              {searchTerm ? 'No fields match your search' : 'No fields available'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FiltersPanel;
