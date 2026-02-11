import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

let globalToast = null;

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const COLORS = {
  success: { bg: 'var(--status-success, #14AE5C)', text: '#fff' },
  error: { bg: 'var(--status-error, #B3261E)', text: '#fff' },
  info: { bg: 'var(--primary-color, #00695C)', text: '#fff' },
  warning: { bg: '#F59E0B', text: '#fff' },
};

function ToastItem({ id, message, type, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const color = COLORS[type] || COLORS.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 20px',
        borderRadius: '10px',
        background: color.bg,
        color: color.text,
        fontSize: '0.9rem',
        fontWeight: 500,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(100%)' : 'translateX(0)',
        transition: 'all 0.3s ease',
        maxWidth: '420px',
        wordBreak: 'break-word',
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{ICONS[type] || ICONS.info}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onRemove(id), 300); }}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: color.text,
          cursor: 'pointer',
          fontSize: '1.1rem',
          padding: '0 0 0 8px',
          opacity: 0.7,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
  }, []);

  const toast = React.useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }), [addToast]);

  // Expose globally for non-component code
  useEffect(() => { globalToast = toast; return () => { globalToast = null; }; }, [toast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem id={t.id} message={t.message} type={t.type} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// For use outside React components
export const toast = {
  success: (msg) => globalToast?.success(msg),
  error: (msg) => globalToast?.error(msg),
  info: (msg) => globalToast?.info(msg),
  warning: (msg) => globalToast?.warning(msg),
};
