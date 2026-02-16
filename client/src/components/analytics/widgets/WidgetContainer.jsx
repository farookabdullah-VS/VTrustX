import React, { useState } from 'react';
import { Edit, Trash2, Maximize2, MoreVertical } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * WidgetContainer - Base container for all widget types
 * Provides common functionality: toolbar, accessibility, keyboard navigation
 */
export function WidgetContainer({
  widget,
  children,
  onEdit,
  onRemove,
  onExpand,
  className = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleKeyDown = (e) => {
    // Delete widget: Ctrl+Delete
    if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (onRemove) onRemove();
    }
    // Edit widget: Ctrl+E
    else if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (onEdit) onEdit();
    }
    // Expand widget: Ctrl+F
    else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (onExpand) onExpand();
    }
  };

  const widgetTitle = widget?.config?.title || widget?.type || 'Untitled Widget';

  return (
    <div
      role="region"
      aria-label={`${widget?.type || 'Widget'}: ${widgetTitle}`}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      className={`${styles.widgetContainer} ${isFocused ? styles.focused : ''} ${className}`}
      {...props}
    >
      {/* Widget Header */}
      <div className={styles.widgetHeader}>
        <h4 className={styles.widgetTitle}>{widgetTitle}</h4>

        <div className={styles.widgetToolbar} role="toolbar" aria-label="Widget actions">
          {onEdit && (
            <button
              onClick={onEdit}
              className={styles.iconButton}
              aria-label="Edit widget"
              title="Edit widget (Ctrl+E)"
            >
              <Edit size={16} />
            </button>
          )}

          {onExpand && (
            <button
              onClick={onExpand}
              className={styles.iconButton}
              aria-label="Expand widget"
              title="Expand widget (Ctrl+F)"
            >
              <Maximize2 size={16} />
            </button>
          )}

          {onRemove && (
            <button
              onClick={onRemove}
              className={styles.iconButton}
              aria-label="Remove widget"
              title="Remove widget (Ctrl+Delete)"
              style={{ color: '#ef4444' }}
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* More options menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={styles.iconButton}
              aria-label="More options"
              aria-expanded={showMenu}
              aria-haspopup="true"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '4px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 10,
                  minWidth: '150px'
                }}
                role="menu"
              >
                <button
                  onClick={() => {
                    if (onEdit) onEdit();
                    setShowMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                  role="menuitem"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (onRemove) onRemove();
                    setShowMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#ef4444'
                  }}
                  role="menuitem"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className={styles.widgetContent}>
        {children}
      </div>

      {/* Keyboard shortcuts hint (only shown when focused) */}
      {isFocused && (
        <div
          className={styles.srOnly}
          role="status"
          aria-live="polite"
        >
          Widget focused. Press Ctrl+E to edit, Ctrl+Delete to remove, Ctrl+F to expand.
        </div>
      )}
    </div>
  );
}

export default WidgetContainer;
