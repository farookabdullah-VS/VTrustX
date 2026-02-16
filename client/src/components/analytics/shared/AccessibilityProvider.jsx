/**
 * AccessibilityProvider - Provides accessibility context and features
 * for the Analytics Studio
 */

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useAnalyticsAnnouncer, AnalyticsLiveRegion } from '../hooks/useAnalyticsAnnouncer';

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const { message, announce, clear } = useAnalyticsAnnouncer();
  const skipLinksRef = useRef(null);

  // Handle keyboard shortcuts globally
  useEffect(() => {
    const handleGlobalKeyboard = (e) => {
      // Skip to main content (Alt + M)
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        const mainContent = document.getElementById('analytics-main-content');
        if (mainContent) {
          mainContent.focus();
          announce('Jumped to main content');
        }
      }

      // Skip to navigation (Alt + N)
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        const nav = document.getElementById('analytics-navigation');
        if (nav) {
          nav.focus();
          announce('Jumped to navigation');
        }
      }

      // Show keyboard shortcuts (Alt + K or ?)
      if ((e.altKey && e.key === 'k') || e.key === '?') {
        e.preventDefault();
        showKeyboardShortcuts();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyboard);
    return () => window.removeEventListener('keydown', handleGlobalKeyboard);
  }, [announce]);

  const showKeyboardShortcuts = useCallback(() => {
    announce('Keyboard shortcuts dialog opened');
    // This would open a modal with keyboard shortcuts
    // Implementation depends on your modal system
  }, [announce]);

  const value = {
    announce,
    clear,
    showKeyboardShortcuts
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {/* Skip Links */}
      <div
        ref={skipLinksRef}
        style={{
          position: 'absolute',
          top: '-100px',
          left: 0,
          zIndex: 10000
        }}
      >
        <a
          href="#analytics-main-content"
          style={{
            position: 'absolute',
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: '600'
          }}
          onFocus={(e) => {
            e.target.style.top = '10px';
          }}
          onBlur={(e) => {
            e.target.style.top = '-100px';
          }}
        >
          Skip to main content
        </a>
      </div>

      {children}

      {/* Live Region for Screen Readers */}
      <AnalyticsLiveRegion message={message} />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

export default AccessibilityProvider;
