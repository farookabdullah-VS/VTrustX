import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Format a date in Hijri (Islamic) calendar using Intl.DateTimeFormat.
 * No external library needed — uses the browser's built-in ICU support.
 *
 * @param {string|Date} date - ISO date string or Date object
 * @param {object} options
 * @param {string} options.locale - 'ar-SA' for Arabic, 'en-SA' for English with Hijri
 * @param {'long'|'short'|'numeric'} options.month - month display format
 * @param {boolean} options.weekday - whether to include weekday
 * @returns {string} formatted Hijri date string
 */
export function formatHijriDate(date, options = {}) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const locale = options.locale || 'ar-SA';
  const fmt = new Intl.DateTimeFormat(`${locale}-u-ca-islamic`, {
    year: 'numeric',
    month: options.month || 'long',
    day: 'numeric',
    ...(options.weekday ? { weekday: 'long' } : {}),
  });
  return fmt.format(d);
}

/**
 * Format a date as Gregorian string with locale awareness.
 */
export function formatGregorianDate(date, options = {}) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const locale = options.locale || 'en-US';
  const fmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: options.month || 'short',
    day: 'numeric',
    ...(options.weekday ? { weekday: 'short' } : {}),
  });
  return fmt.format(d);
}

/**
 * Format relative time: "Just now", "5m ago", "2h ago", "3d ago"
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatGregorianDate(d, { month: 'short' });
}

/**
 * Dual-calendar date display component.
 * Shows Gregorian date with Hijri date underneath (or vice versa for Arabic).
 *
 * Usage:
 *   <DualDate date="2026-02-11" />
 *   <DualDate date={someDate} showRelative />
 *   <DualDate date={someDate} compact />
 */
export function DualDate({
  date,
  compact = false,
  showRelative = false,
  showWeekday = false,
  style = {},
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const formatted = useMemo(() => {
    if (!date) return { gregorian: '', hijri: '', relative: '' };
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return { gregorian: '', hijri: '', relative: '' };

    const gregorian = formatGregorianDate(d, {
      locale: isAr ? 'ar-EG' : 'en-US',
      month: compact ? 'short' : 'long',
      weekday: showWeekday,
    });

    const hijri = formatHijriDate(d, {
      locale: isAr ? 'ar-SA' : 'en-SA',
      month: compact ? 'short' : 'long',
      weekday: false,
    });

    const relative = showRelative ? formatRelativeTime(d) : '';

    return { gregorian, hijri, relative };
  }, [date, isAr, compact, showWeekday, showRelative]);

  if (!formatted.gregorian) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '1px',
        lineHeight: 1.3,
        ...style,
      }}
      title={`${formatted.gregorian}\n${formatted.hijri}`}
    >
      <span style={{ fontSize: 'inherit', color: 'inherit' }}>
        {showRelative && formatted.relative ? formatted.relative : formatted.gregorian}
      </span>
      <span
        style={{
          fontSize: compact ? '0.7em' : '0.75em',
          color: 'var(--text-muted)',
          opacity: 0.8,
          fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : 'inherit',
        }}
      >
        {hijriLabel(formatted.hijri, isAr)}
      </span>
    </span>
  );
}

function hijriLabel(hijriStr, isAr) {
  if (!hijriStr) return '';
  if (isAr) return hijriStr;
  return `${hijriStr} AH`;
}

/**
 * Inline Hijri date — single line with Hijri in parentheses.
 * Usage: <InlineHijriDate date="2026-02-11" />
 * Renders: "Feb 11, 2026 (15 Sha'ban 1447 AH)"
 */
export function InlineHijriDate({ date, style = {} }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const formatted = useMemo(() => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const greg = formatGregorianDate(d, {
      locale: isAr ? 'ar-EG' : 'en-US',
      month: 'short',
    });
    const hijri = formatHijriDate(d, {
      locale: isAr ? 'ar-SA' : 'en-SA',
      month: 'short',
    });
    if (isAr) return `${greg} (${hijri})`;
    return `${greg} (${hijri} AH)`;
  }, [date, isAr]);

  if (!formatted) return null;
  return <span style={style}>{formatted}</span>;
}
