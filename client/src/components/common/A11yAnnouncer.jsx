import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * A11yAnnouncer - Invisible live region for screen reader announcements
 *
 * This component provides an accessible way to announce dynamic content changes
 * to screen reader users without disrupting their current focus.
 *
 * @component
 * @example
 * // Polite announcement (non-interrupting)
 * <A11yAnnouncer message="Data loaded successfully" />
 *
 * @example
 * // Assertive announcement (interrupts current speech)
 * <A11yAnnouncer message="Error: Failed to save" politeness="assertive" />
 *
 * @param {Object} props
 * @param {string} props.message - The message to announce to screen readers
 * @param {('polite'|'assertive')} [props.politeness='polite'] - How urgently to announce
 *   - 'polite': Wait for current speech to finish (default, for non-critical updates)
 *   - 'assertive': Interrupt current speech (for critical errors/warnings)
 */
export function A11yAnnouncer({ message, politeness = 'polite' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (message && ref.current) {
      // Clear and re-set to ensure announcement triggers even if message is the same
      ref.current.textContent = '';
      setTimeout(() => {
        if (ref.current) {
          ref.current.textContent = message;
        }
      }, 100);
    }
  }, [message]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
  );
}

A11yAnnouncer.propTypes = {
  message: PropTypes.string,
  politeness: PropTypes.oneOf(['polite', 'assertive']),
};

A11yAnnouncer.defaultProps = {
  message: '',
  politeness: 'polite',
};

export default A11yAnnouncer;
