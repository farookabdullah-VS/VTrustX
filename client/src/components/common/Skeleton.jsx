import React from 'react';

/**
 * Base skeleton block with shimmer animation.
 * Uses the .skeleton class from index.css for the shimmer effect.
 */
export function Skeleton({ width, height, borderRadius = '8px', style = {} }) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius,
        ...style,
      }}
    />
  );
}

/** Skeleton for metric/stat cards on dashboards */
export function SkeletonCard({ style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton width="60%" height="14px" />
          <Skeleton width="40%" height="48px" borderRadius="12px" />
          <Skeleton width="50%" height="14px" />
        </div>
        <Skeleton width="52px" height="52px" borderRadius="16px" />
      </div>
    </div>
  );
}

/** Skeleton for chart/graph areas */
export function SkeletonChart({ height = '300px', style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        ...style,
      }}
    >
      <Skeleton width="30%" height="18px" style={{ marginBottom: '20px' }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px', height }}>
        {[65, 40, 80, 55, 90, 35, 70].map((h, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '100%', height, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <Skeleton width="60%" height={`${h}%`} borderRadius="4px 4px 0 0" />
            </div>
            <Skeleton width="80%" height="12px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for list items (e.g. top performing surveys) */
export function SkeletonList({ rows = 5, style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        height: '100%',
        ...style,
      }}
    >
      <Skeleton width="40%" height="18px" style={{ marginBottom: '8px' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '15px',
            borderBottom: i < rows - 1 ? '1px solid var(--input-border)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Skeleton width="32px" height="32px" borderRadius="8px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width={`${120 + (i * 15)}px`} height="14px" />
              <Skeleton width="40px" height="10px" />
            </div>
          </div>
          <Skeleton width="30px" height="14px" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for table rows */
export function SkeletonTable({ rows = 5, cols = 5, style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        ...style,
      }}
    >
      <Skeleton width="25%" height="18px" style={{ marginBottom: '20px' }} />
      {/* Header row */}
      <div style={{ display: 'flex', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--input-border)', marginBottom: '8px' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? '25%' : '15%'} height="12px" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'flex',
            gap: '16px',
            padding: '14px 0',
            borderBottom: rowIdx < rows - 1 ? '1px solid var(--input-border)' : 'none',
          }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              width={colIdx === 0 ? '25%' : '15%'}
              height="14px"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full dashboard skeleton layout combining all skeleton types */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: '1 1 250px', minWidth: '250px' }}>
            <SkeletonCard />
          </div>
        ))}
      </div>
      {/* Chart + List Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        <div style={{ flex: '2 1 600px', minWidth: '300px' }}>
          <SkeletonChart />
        </div>
        <div style={{ flex: '1 1 350px', minWidth: '300px' }}>
          <SkeletonList />
        </div>
      </div>
      {/* Table Row */}
      <SkeletonTable />
    </div>
  );
}
