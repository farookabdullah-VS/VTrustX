import React, { useState, useEffect, useRef } from 'react';
import { Filter, X } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * FilterModal - A proper modal for filtering data fields
 * Replaces the browser prompt() with a better UX
 */
export function FilterModal({ field, currentFilter, onApply, onClose }) {
  const [filterOperator, setFilterOperator] = useState(currentFilter?.operator || 'equals');
  const [filterValue, setFilterValue] = useState(currentFilter?.value || '');
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filterValue, filterOperator]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    if (filterValue === '') {
      // Empty value = clear filter
      onApply(field.name, null);
    } else {
      onApply(field.name, {
        operator: filterOperator,
        value: filterValue
      });
    }
    onClose();
  };

  const handleClear = () => {
    onApply(field.name, null);
    onClose();
  };

  // Determine input type based on field type
  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';

  // Get available operators based on field type
  const getOperators = () => {
    if (field.type === 'number') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'greaterThan', label: 'Greater Than' },
        { value: 'lessThan', label: 'Less Than' },
        { value: 'greaterThanOrEqual', label: 'Greater Than or Equal' },
        { value: 'lessThanOrEqual', label: 'Less Than or Equal' },
        { value: 'notEquals', label: 'Not Equals' }
      ];
    } else {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'notEquals', label: 'Not Equals' }
      ];
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
    >
      <div
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Filter size={20} color="#2563eb" />
            <h3 id="filter-modal-title" className={styles.modalTitle}>
              Filter: {field.label || field.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={styles.iconButton}
            aria-label="Close filter modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="filter-operator" className={styles.label}>
              Operator
            </label>
            <select
              id="filter-operator"
              value={filterOperator}
              onChange={e => setFilterOperator(e.target.value)}
              className={styles.select}
            >
              {getOperators().map(op => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="filter-value" className={styles.label}>
              Value
            </label>
            <input
              ref={inputRef}
              id="filter-value"
              type={inputType}
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              className={styles.input}
              placeholder={`Enter ${field.label || field.name}...`}
              aria-describedby="filter-hint"
            />
            <div id="filter-hint" style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
              Leave empty to clear the filter
            </div>
          </div>

          {/* Quick value suggestions for category fields */}
          {field.type === 'category' && field.values && field.values.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>
                Quick Select:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {field.values.slice(0, 10).map(value => (
                  <button
                    key={value}
                    onClick={() => setFilterValue(value)}
                    className={styles.badge + ' ' + styles.badgePrimary}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {currentFilter && (
            <button
              onClick={handleClear}
              className={`${styles.button} ${styles.buttonSecondary}`}
              style={{ marginRight: 'auto' }}
            >
              Clear Filter
            </button>
          )}
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.buttonSecondary}`}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterModal;
