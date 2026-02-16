/**
 * Live Region for Screen Reader Announcements
 *
 * Provides accessible announcements for dynamic content changes in Analytics Studio.
 * Uses ARIA live regions to communicate updates to screen reader users.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// Context for managing announcements across the application
const AnnouncerContext = createContext(null);

/**
 * Custom hook to access the announcer
 */
export function useAnalyticsAnnouncer() {
  const context = useContext(AnnouncerContext);

  if (!context) {
    // Fallback if used outside provider
    return {
      announce: (message) => console.log('[Screen Reader]:', message),
      message: ''
    };
  }

  return context;
}

/**
 * Announcer Provider
 * Wraps components that need announcement functionality
 */
export function AnnouncerProvider({ children }) {
  const [message, setMessage] = useState('');
  const [messageId, setMessageId] = useState(0);

  const announce = useCallback((msg, priority = 'polite') => {
    // Clear previous message
    setMessage('');

    // Set new message after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      setMessage(msg);
      setMessageId((prev) => prev + 1);

      // Auto-clear after 3 seconds
      setTimeout(() => {
        setMessage('');
      }, 3000);
    }, 100);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce, message, messageId }}>
      {children}
    </AnnouncerContext.Provider>
  );
}

/**
 * Analytics Live Region Component
 * Displays announcements for screen readers
 */
export function AnalyticsLiveRegion() {
  const { message, messageId } = useAnalyticsAnnouncer();

  return (
    <>
      {/* Polite announcements (don't interrupt) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      >
        {message && <span key={`polite-${messageId}`}>{message}</span>}
      </div>

      {/* Assertive announcements (interrupt current speech) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      >
        {/* Reserved for critical announcements */}
      </div>
    </>
  );
}

/**
 * Common announcement messages
 * Provides consistent wording for common actions
 */
export const AnnouncementMessages = {
  // Report actions
  reportCreated: (title) => `Report "${title}" created successfully`,
  reportSaved: (title) => `Report "${title}" saved`,
  reportDeleted: (title) => `Report "${title}" deleted`,
  reportOpened: (title) => `Opened report "${title}"`,

  // Widget actions
  widgetAdded: (type) => `${type} widget added to report`,
  widgetRemoved: (type) => `${type} widget removed`,
  widgetUpdated: (type) => `${type} widget updated`,

  // Data loading
  dataLoading: 'Loading data',
  dataLoaded: (count) => `Loaded ${count} ${count === 1 ? 'record' : 'records'}`,
  dataError: 'Failed to load data',

  // Filter actions
  filterApplied: (field) => `Filter applied to ${field}`,
  filterRemoved: (field) => `Filter removed from ${field}`,
  filtersCleared: 'All filters cleared',

  // Export actions
  exportStarted: (format) => `Exporting report to ${format}`,
  exportCompleted: (format) => `Report exported to ${format} successfully`,
  exportFailed: (format) => `Failed to export report to ${format}`,

  // Template actions
  templateSelected: (name) => `Template "${name}" selected`,
  templateApplied: (name) => `Template "${name}" applied to report`,

  // Navigation
  viewChanged: (view) => `Switched to ${view} view`,
  tabChanged: (tab) => `Switched to ${tab} tab`,

  // Pagination
  pageChanged: (page, total) => `Page ${page} of ${total}`,
  moreDataLoaded: (count) => `Loaded ${count} more ${count === 1 ? 'record' : 'records'}`,

  // Errors
  genericError: 'An error occurred. Please try again',
  networkError: 'Network error. Please check your connection',
  permissionError: 'You don\'t have permission to perform this action'
};

/**
 * Hook for common announcement patterns
 */
export function useCommonAnnouncements() {
  const { announce } = useAnalyticsAnnouncer();

  return {
    announceSuccess: (action, item) => {
      announce(`${action} ${item} successfully`);
    },

    announceError: (action, item) => {
      announce(`Failed to ${action} ${item}. Please try again`, 'assertive');
    },

    announceLoading: (item) => {
      announce(`Loading ${item}`);
    },

    announceLoaded: (item, count) => {
      if (count !== undefined) {
        announce(`Loaded ${count} ${item}${count !== 1 ? 's' : ''}`);
      } else {
        announce(`${item} loaded`);
      }
    }
  };
}

export default AnalyticsLiveRegion;
