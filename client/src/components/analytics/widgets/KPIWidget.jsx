import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * KPIWidget - Displays a single key performance indicator
 */
export function KPIWidget({ title, value, target, trend, format = 'number', icon }) {
  const formatValue = (val) => {
    if (val === null || val === undefined) return '—';

    switch (format) {
      case 'percentage':
        return `${val}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val);
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = () => {
    if (!trend || trend === 0) return <Minus size={16} />;
    if (trend > 0) return <TrendingUp size={16} />;
    return <TrendingDown size={16} />;
  };

  const trendClass = trend > 0 ? styles.kpiTrend + ' ' + styles.positive : styles.kpiTrend + ' ' + styles.negative;

  return (
    <div className={styles.kpiCard}>
      {icon && (
        <div style={{ marginBottom: '12px', color: '#2563eb' }}>
          {icon}
        </div>
      )}

      <div className={styles.kpiLabel}>{title || 'KPI Title'}</div>
      <div className={styles.kpiValue}>{formatValue(value)}</div>

      {target !== undefined && target !== null && (
        <div className={styles.kpiTarget}>
          Target: {formatValue(target)}
        </div>
      )}

      {trend !== undefined && trend !== null && (
        <div className={trendClass}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {getTrendIcon()}
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default KPIWidget;
