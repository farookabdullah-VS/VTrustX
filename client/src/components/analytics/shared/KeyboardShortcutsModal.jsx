/**
 * KeyboardShortcutsModal - Displays available keyboard shortcuts
 */

import React from 'react';
import { X, Keyboard } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation',
      shortcuts: [
        { keys: 'Alt + M', description: 'Jump to main content' },
        { keys: 'Alt + N', description: 'Jump to navigation' },
        { keys: 'Tab', description: 'Move to next element' },
        { keys: 'Shift + Tab', description: 'Move to previous element' }
      ]
    },
    {
      category: 'Widget Actions',
      shortcuts: [
        { keys: 'Ctrl + E', description: 'Edit selected widget' },
        { keys: 'Ctrl + Delete', description: 'Remove selected widget' },
        { keys: 'Ctrl + F', description: 'Expand widget to fullscreen' },
        { keys: 'Ctrl + D', description: 'Duplicate widget' }
      ]
    },
    {
      category: 'Report Actions',
      shortcuts: [
        { keys: 'Ctrl + S', description: 'Save report' },
        { keys: 'Ctrl + P', description: 'Print report' },
        { keys: 'Esc', description: 'Close modal/dialog' }
      ]
    },
    {
      category: 'Help',
      shortcuts: [
        { keys: 'Alt + K or ?', description: 'Show keyboard shortcuts' },
        { keys: 'Ctrl + /', description: 'Focus search' }
      ]
    }
  ];

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Keyboard size={24} color="#2563eb" />
            <h2 id="shortcuts-title" className={styles.modalTitle}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className={styles.iconButton}
            aria-label="Close shortcuts dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {shortcuts.map((section, index) => (
            <div key={index} style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '12px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '8px'
              }}>
                {section.category}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {section.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0'
                    }}
                  >
                    <span style={{ color: '#475569', fontSize: '0.9rem' }}>
                      {shortcut.description}
                    </span>
                    <kbd style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      color: '#1e293b',
                      fontWeight: '600'
                    }}>
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe'
          }}>
            <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
              <strong>Tip:</strong> Press <kbd style={{
                background: 'white',
                border: '1px solid #60a5fa',
                borderRadius: '3px',
                padding: '2px 6px',
                fontFamily: 'monospace',
                fontSize: '0.8rem'
              }}>?</kbd> anytime to show this help
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
