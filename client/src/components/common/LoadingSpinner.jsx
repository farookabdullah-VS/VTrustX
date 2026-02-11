import React from 'react';

export function LoadingSpinner({ size = 40, message = 'Loading...' }) {
  return (
    <div
      role="status"
      aria-label={message}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          border: '3px solid #e2e8f0',
          borderTopColor: 'var(--primary-color, #0f172a)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{message}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
