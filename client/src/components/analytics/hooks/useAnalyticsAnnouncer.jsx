import { useState, useCallback, useRef } from 'react';

/**
 * Hook for accessibility announcements (screen readers)
 * @returns {Object} - { message, announce }
 */
export function useAnalyticsAnnouncer() {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef(null);

  const announce = useCallback((msg, duration = 3000) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set the new message
    setMessage(msg);

    // Clear the message after duration
    timeoutRef.current = setTimeout(() => {
      setMessage('');
      timeoutRef.current = null;
    }, duration);
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage('');
  }, []);

  return {
    message,
    announce,
    clear
  };
}

/**
 * Component for rendering live regions for screen readers
 */
export function AnalyticsLiveRegion({ message }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0
      }}
    >
      {message}
    </div>
  );
}
