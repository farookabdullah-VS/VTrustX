import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import './LoadingSpinner.css';

/**
 * Full-page loading overlay with spinner
 *
 * @param {boolean} isLoading - Show/hide the loader
 * @param {string} message - Loading message
 * @param {string} variant - Spinner variant (modern, dots, pulse, dual-ring)
 * @param {string} color - Spinner color
 */
export function FullPageLoader({
  isLoading = false,
  message = 'Loading...',
  variant = 'modern',
  color = 'var(--primary-color, #10B981)'
}) {
  if (!isLoading) return null;

  return (
    <div className="loading-spinner-overlay">
      <LoadingSpinner
        size={60}
        message={message}
        variant={variant}
        color={color}
      />
    </div>
  );
}
