import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Premium stat card with gradient accent border and glass morphism.
 *
 * Usage:
 *   <PremiumCard accentColor="#3b82f6">
 *     <h3>Revenue</h3><p>$12,340</p>
 *   </PremiumCard>
 */
export function PremiumCard({
  children,
  accentColor,
  accentGradient,
  hover = true,
  style = {},
}) {
  const gradient = accentGradient || (accentColor
    ? `linear-gradient(135deg, ${accentColor}, ${adjustColor(accentColor, -30)})`
    : 'var(--primary-gradient)');

  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' } : {}}
      transition={{ duration: 0.2 }}
      style={{
        position: 'relative',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '20px',
          right: '20px',
          height: '3px',
          background: gradient,
          borderRadius: '0 0 3px 3px',
        }}
      />
      {children}
    </motion.div>
  );
}

/**
 * Status badge with dot indicator.
 *
 * Usage:
 *   <StatusBadge status="active" />
 *   <StatusBadge status="draft" label="Draft" />
 *   <StatusBadge status="error" label="Failed" />
 */
const STATUS_CONFIG = {
  active: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Active' },
  published: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Published' },
  draft: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: 'Draft' },
  pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: 'Pending' },
  error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', label: 'Error' },
  failed: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', label: 'Failed' },
  closed: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', label: 'Closed' },
  resolved: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', label: 'Resolved' },
  'in-progress': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', label: 'In Progress' },
  open: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', label: 'Open' },
};

export function StatusBadge({ status, label, style = {} }) {
  const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.pending;
  const displayLabel = label || config.label;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.8em',
        fontWeight: '600',
        background: config.bg,
        color: config.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {/* Animated dot */}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: config.color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${config.color}40`,
        }}
      />
      {displayLabel}
    </span>
  );
}

/**
 * Animated tooltip component.
 *
 * Usage:
 *   <Tooltip content="This is a tooltip">
 *     <button>Hover me</button>
 *   </Tooltip>
 */
export function Tooltip({ children, content, position = 'top', style = {} }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const show = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2,
      y: position === 'top' ? rect.top - 8 : rect.bottom + 8,
    });
    setVisible(true);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
      {visible && content && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            transform: position === 'top'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
            zIndex: 120000,
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'var(--text-color)',
            color: 'var(--deep-bg)',
            fontSize: '0.78rem',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            opacity: 1,
            animation: 'tooltipFadeIn 0.15s ease',
            ...style,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

/**
 * Gradient border card — wraps content with an animated gradient border.
 *
 * Usage:
 *   <GradientBorderCard gradient="linear-gradient(135deg, #3b82f6, #8b5cf6)">
 *     <p>Content</p>
 *   </GradientBorderCard>
 */
export function GradientBorderCard({
  children,
  gradient = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
  borderWidth = 1.5,
  borderRadius = 20,
  style = {},
}) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: `${borderRadius}px`,
        padding: `${borderWidth}px`,
        background: gradient,
        ...style,
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: `${borderRadius - borderWidth}px`,
          padding: '24px',
          height: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Premium table with hover effects, alternating rows, and sticky header.
 *
 * Usage:
 *   <PremiumTable
 *     columns={[{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }]}
 *     data={[{ name: 'Survey 1', status: 'Active' }]}
 *     onRowClick={(row) => console.log(row)}
 *   />
 */
export function PremiumTable({
  columns = [],
  data = [],
  onRowClick,
  onRowDoubleClick,
  isRtl = false,
  renderCell,
  emptyState,
  style = {},
}) {
  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <div style={{ overflowX: 'auto', borderRadius: '16px', ...style }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          textAlign: isRtl ? 'right' : 'left',
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '14px 16px',
                  fontSize: '0.8em',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-muted)',
                  borderBottom: '2px solid var(--input-border)',
                  background: 'var(--card-bg)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  whiteSpace: 'nowrap',
                  ...(col.style || {}),
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && emptyState ? (
            <tr>
              <td colSpan={columns.length}>{emptyState}</td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
                onMouseEnter={() => setHoveredRow(rowIdx)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  cursor: onRowClick || onRowDoubleClick ? 'pointer' : 'default',
                  background: hoveredRow === rowIdx
                    ? 'var(--sidebar-hover-bg)'
                    : rowIdx % 2 === 1
                      ? 'rgba(0,0,0,0.015)'
                      : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '14px 16px',
                      fontSize: '0.9em',
                      color: 'var(--text-color)',
                      borderBottom: '1px solid var(--input-border)',
                      ...(col.cellStyle || {}),
                    }}
                  >
                    {renderCell ? renderCell(col.key, row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Metric card for dashboard — premium design with icon, value, label, and change indicator.
 */
export function MetricCard({
  icon,
  label,
  value,
  change,
  changeLabel,
  accentColor = '#3b82f6',
  style = {},
  children,
}) {
  const gradientBg = `linear-gradient(135deg, ${accentColor}14 0%, ${accentColor}0D 100%)`;
  const iconGradient = `linear-gradient(135deg, ${accentColor}, ${adjustColor(accentColor, -30)})`;

  return (
    <PremiumCard accentColor={accentColor} style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85em',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              color: 'var(--text-color)',
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
            }}
          >
            {value}
          </div>
          {(change !== undefined || changeLabel) && (
            <div
              style={{
                fontSize: '0.85em',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: change > 0 ? '#10b981' : change < 0 ? '#ef4444' : 'var(--text-muted)',
                fontWeight: '600',
              }}
            >
              {change > 0 && <span style={{ fontSize: '0.9em' }}>↑</span>}
              {change < 0 && <span style={{ fontSize: '0.9em' }}>↓</span>}
              {changeLabel || `${Math.abs(change || 0)}`}
            </div>
          )}
          {children}
        </div>
        {icon && (
          <div
            style={{
              background: iconGradient,
              color: 'white',
              padding: '14px',
              borderRadius: '16px',
              fontSize: '1.4em',
              boxShadow: `0 4px 12px ${accentColor}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </PremiumCard>
  );
}

/**
 * Avatar circle badge with initial letter.
 */
export function AvatarBadge({ name, size = 32, style = {} }) {
  const initial = (name || '?')[0].toUpperCase();
  const hue = name
    ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
    : 200;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `hsl(${hue}, 60%, 90%)`,
        color: `hsl(${hue}, 60%, 35%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.4}px`,
        fontWeight: 700,
        flexShrink: 0,
        ...style,
      }}
    >
      {initial}
    </div>
  );
}

// Helper: adjust hex color brightness
function adjustColor(hex, amount) {
  if (!hex || !hex.startsWith('#')) return hex;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
