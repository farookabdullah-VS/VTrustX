/**
 * CohortWidget - Displays cohort analysis data with visualizations
 *
 * Features:
 * - Cohort analysis visualization
 * - Retention matrix
 * - Trend indicators
 * - Multiple metrics support
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import styles from '../styles/Analytics.module.css';

export function CohortWidget({ widget, surveyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  const config = widget.config || {};
  const metric = config.metric || 'nps';
  const cohortBy = config.cohortBy || 'month';

  useEffect(() => {
    if (surveyId) {
      fetchCohortData();
    }
  }, [surveyId, metric, cohortBy]);

  const fetchCohortData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/analytics/cohorts', {
        params: { surveyId, metric, cohortBy }
      });

      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch cohort data:', err);
      setError('Failed to load cohort data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.widgetLoading}>
        <div className={styles.loadingSpinner} />
        <div>Loading cohort analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.widgetError}>
        <p>{error}</p>
        <button onClick={fetchCohortData} className={styles.button}>
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.widgetEmpty}>
        <p>No cohort data available</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
            Cohort Analysis
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {metric.toUpperCase()} by {cohortBy}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('chart')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'chart' ? '#2563eb' : 'transparent',
              color: viewMode === 'chart' ? 'white' : '#64748b',
              border: `1px solid ${viewMode === 'chart' ? '#2563eb' : '#e2e8f0'}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Chart
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'table' ? '#2563eb' : 'transparent',
              color: viewMode === 'table' ? 'white' : '#64748b',
              border: `1px solid ${viewMode === 'table' ? '#2563eb' : '#e2e8f0'}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Table
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {viewMode === 'chart' ? (
          <CohortChart data={data} metric={metric} />
        ) : (
          <CohortTable data={data} metric={metric} />
        )}
      </div>
    </div>
  );
}

/**
 * Cohort visualization chart
 */
function CohortChart({ data, metric }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="cohort"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <Tooltip
          content={<CustomTooltip metric={metric} />}
          cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="circle"
        />
        <Bar
          dataKey="metricValue"
          name={metric.toUpperCase()}
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="totalResponses"
          name="Responses"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Cohort data table
 */
function CohortTable({ data, metric }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <table className={styles.table} style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Cohort</th>
            <th style={{ textAlign: 'right' }}>Responses</th>
            <th style={{ textAlign: 'right' }}>{metric.toUpperCase()}</th>
            <th style={{ textAlign: 'center' }}>Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((cohort, index) => (
            <tr key={index}>
              <td style={{ fontWeight: '600', color: '#1e293b' }}>
                {cohort.cohort}
              </td>
              <td style={{ textAlign: 'right', color: '#64748b' }}>
                {cohort.totalResponses.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>
                {cohort.metricValue.toFixed(1)}
              </td>
              <td style={{ textAlign: 'center' }}>
                {cohort.trend && <TrendIndicator trend={cohort.trend} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Custom tooltip for chart
 */
function CustomTooltip({ active, payload, metric }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div style={{
      background: 'white',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
        {data.cohort}
      </p>
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>{metric.toUpperCase()}:</strong> {data.metricValue.toFixed(1)}
        </div>
        <div>
          <strong>Responses:</strong> {data.totalResponses.toLocaleString()}
        </div>
        {data.trend && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            <TrendIndicator trend={data.trend} showText />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Trend indicator component
 */
function TrendIndicator({ trend, showText = false }) {
  const { direction, percentChange } = trend;

  let icon, color;

  if (direction === 'up') {
    icon = <TrendingUp size={16} />;
    color = '#16a34a';
  } else if (direction === 'down') {
    icon = <TrendingDown size={16} />;
    color = '#dc2626';
  } else {
    icon = <Minus size={16} />;
    color = '#94a3b8';
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      color
    }}>
      {icon}
      {showText && (
        <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>
          {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export default CohortWidget;
