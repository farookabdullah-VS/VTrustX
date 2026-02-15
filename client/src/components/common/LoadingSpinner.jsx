import React from 'react';
import './LoadingSpinner.css';

export function LoadingSpinner({
  size = 50,
  message = 'Loading...',
  variant = 'modern', // modern, dots, pulse, dual-ring
  color = 'var(--primary-color, #10B981)'
}) {
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="spinner-dots" style={{ '--dot-size': `${size / 4}px`, '--spinner-color': color }}>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        );

      case 'pulse':
        return (
          <div className="spinner-pulse" style={{ width: size, height: size, '--spinner-color': color }}>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
          </div>
        );

      case 'dual-ring':
        return (
          <div className="spinner-dual-ring" style={{ width: size, height: size }}>
            <div className="ring" style={{ borderTopColor: color, borderBottomColor: color }}></div>
          </div>
        );

      case 'modern':
      default:
        return (
          <div className="spinner-modern">
            <div className="spinner-circle" style={{ width: size, height: size }}>
              <svg viewBox="0 0 50 50">
                <circle
                  className="spinner-path"
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  strokeWidth="4"
                  style={{ stroke: color }}
                />
              </svg>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="loading-spinner-container" role="status" aria-label={message}>
      {renderSpinner()}
      {message && (
        <div className="spinner-message">
          {message}
        </div>
      )}
    </div>
  );
}
