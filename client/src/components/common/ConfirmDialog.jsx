import React, { useState, useCallback, createContext, useContext, useRef, useEffect } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);
  const inputRef = useRef(null);

  const showConfirm = useCallback((message, { title, confirmText, cancelText } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ type: 'confirm', message, title, confirmText, cancelText });
    });
  }, []);

  const showPrompt = useCallback((message, { title, defaultValue, placeholder } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ type: 'prompt', message, title, defaultValue: defaultValue || '', placeholder });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (state?.type === 'prompt') {
      resolveRef.current?.(inputRef.current?.value ?? '');
    } else {
      resolveRef.current?.(true);
    }
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(state?.type === 'prompt' ? null : false);
    setState(null);
  }, [state]);

  useEffect(() => {
    if (state && state.type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const handler = (e) => { if (e.key === 'Escape') handleCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, handleCancel]);

  return (
    <ConfirmContext.Provider value={{ confirm: showConfirm, prompt: showPrompt }}>
      {children}
      {state && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={state.title || 'Confirmation'}
          style={{
            position: 'fixed', inset: 0, zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
        >
          <div style={{
            background: 'var(--card-bg, #fff)', borderRadius: '16px',
            padding: 'clamp(20px, 4vw, 28px)', maxWidth: 'min(440px, calc(100vw - 32px))', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {state.title && (
              <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: 'var(--text-color, #1a1c1e)' }}>
                {state.title}
              </h3>
            )}
            <p style={{
              margin: '0 0 20px', fontSize: '0.95rem', lineHeight: 1.5,
              color: 'var(--text-muted, #444)', whiteSpace: 'pre-wrap',
            }}>
              {state.message}
            </p>
            {state.type === 'prompt' && (
              <input
                ref={inputRef}
                defaultValue={state.defaultValue}
                placeholder={state.placeholder || ''}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                style={{
                  width: '100%', padding: '10px 14px', marginBottom: '16px',
                  border: '1px solid var(--input-border, #ddd)', borderRadius: '10px',
                  fontSize: '0.9rem', background: 'var(--input-bg, #f8f9fa)',
                  color: 'var(--text-color, #1a1c1e)', boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '9px 20px', borderRadius: '10px', fontSize: '0.9rem',
                  border: '1px solid var(--input-border, #ddd)', cursor: 'pointer',
                  background: 'transparent', color: 'var(--text-muted, #444)',
                }}
              >
                {state.cancelText || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                autoFocus={state.type !== 'prompt'}
                style={{
                  padding: '9px 20px', borderRadius: '10px', fontSize: '0.9rem',
                  border: 'none', cursor: 'pointer',
                  background: 'var(--primary-color, #00695C)', color: '#fff',
                  fontWeight: 600,
                }}
              >
                {state.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
};
