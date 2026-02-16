/**
 * ForecastWidget - Displays predictive forecasting with trend analysis
 *
 * Features:
 * - Linear regression forecasting
 * - Confidence intervals
 * - Historical vs forecast visualization
 * - Trend analysis
 * - Multiple metrics support
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import styles from '../styles/Analytics.module.css';

export function ForecastWidget({ widget, surveyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const config = widget.config || {};
  const metric = config.metric || 'nps';
  const periods = config.forecastPeriods || 7;
  const interval = config.interval || 'day';

  useEffect(() => {
    if (surveyId) {
      fetchForecastData();
    }
  }, [surveyId, metric, periods, interval]);

  const fetchForecastData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/analytics/forecast', {
        params: { surveyId, metric, periods, interval }
      });

      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch forecast data:', err);
      setError(err.response?.data?.error || 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.widgetLoading}>
        <div className={styles.loadingSpinner} />
        <div>Generating forecast...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.widgetError}>
        <p>{error}</p>
        <button onClick={fetchForecastData} className={styles.button}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.widgetEmpty}>
        <p>No forecast data available</p>
      </div>
    );
  }

  // Combine historical and forecast data for chart
  const chartData = [
    ...data.historical.map(point => ({
      ...point,
      type: 'historical'
    })),
    ...data.forecast.map(point => ({
      ...point,
      value: point.predicted,
      type: 'forecast'
    }))
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Trend Analysis */}
      <div style={{
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
              {metric.toUpperCase()} Forecast
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {periods} {interval}s ahead
            </p>
          </div>

          {data.trend && (
            <TrendBadge trend={data.trend} />
          )}
        </div>

        {/* Forecast Metrics */}
        {data.regression && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginTop: '12px'
          }}>
            <MetricCard
              label="R² Score"
              value={data.regression.r2.toFixed(3)}
              description="Model fit quality"
            />
            <MetricCard
              label="MSE"
              value={data.regression.mse.toFixed(2)}
              description="Mean squared error"
            />
            <MetricCard
              label="Next Value"
              value={data.forecast[0]?.predicted.toFixed(1)}
              description={`Predicted ${metric.toUpperCase()}`}
            />
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

            <XAxis
              dataKey="periodLabel"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />

            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />

            <Tooltip content={<CustomTooltip metric={metric} />} />

            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />

            {/* Historical Data */}
            <Line
              type="monotone"
              dataKey="value"
              name="Historical"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              activeDot={{ r: 5 }}
              connectNulls
            />

            {/* Forecast Line */}
            <Line
              type="monotone"
              dataKey="predicted"
              name="Forecast"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#2563eb' }}
              activeDot={{ r: 5 }}
              connectNulls
            />

            {/* Confidence Interval */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stackId="1"
              stroke="none"
              fill="url(#confidenceGradient)"
              fillOpacity={0.4}
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stackId="1"
              stroke="none"
              fill="url(#confidenceGradient)"
              fillOpacity={0.4}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <AlertCircle size={12} />
          <span style={{ fontWeight: '600' }}>Forecast Information</span>
        </div>
        <p>
          Based on {data.historical?.length || 0} historical data points using linear regression.
          Shaded area represents 95% confidence interval.
        </p>
      </div>
    </div>
  );
}

/**
 * Trend badge component
 */
function TrendBadge({ trend }) {
  const { direction, strength, description } = trend;

  let bgColor, textColor, icon;

  if (direction === 'increasing') {
    bgColor = '#dcfce7';
    textColor = '#16a34a';
    icon = <TrendingUp size={14} />;
  } else if (direction === 'decreasing') {
    bgColor = '#fee2e2';
    textColor = '#dc2626';
    icon = <TrendingDown size={14} />;
  } else {
    bgColor = '#f1f5f9';
    textColor = '#64748b';
    icon = null;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      background: bgColor,
      color: textColor,
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: '600'
    }}>
      {icon}
      <span>{strength} {direction}</span>
    </div>
  );
}

/**
 * Metric card component
 */
function MetricCard({ label, value, description }) {
  return (
    <div style={{
      padding: '12px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{
        fontSize: '0.75rem',
        color: '#64748b',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '2px'
      }}>
        {value || 'N/A'}
      </div>
      <div style={{
        fontSize: '0.65rem',
        color: '#94a3b8'
      }}>
        {description}
      </div>
    </div>
  );
}

/**
 * Custom tooltip for forecast chart
 */
function CustomTooltip({ active, payload, metric }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isForecast = data.type === 'forecast';

  return (
    <div style={{
      background: 'white',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        {data.periodLabel || data.period}
        {isForecast && (
          <span style={{
            marginLeft: '8px',
            padding: '2px 6px',
            background: '#eff6ff',
            color: '#2563eb',
            borderRadius: '4px',
            fontSize: '0.65rem',
            fontWeight: '600'
          }}>
            FORECAST
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
        {isForecast ? (
          <>
            <div style={{ marginBottom: '6px' }}>
              <strong>Predicted:</strong> {data.predicted?.toFixed(2)}
            </div>
            {data.confidence && (
              <div style={{ marginBottom: '6px' }}>
                <strong>Confidence:</strong> {data.confidence}%
              </div>
            )}
            {data.lowerBound !== undefined && data.upperBound !== undefined && (
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                Range: {data.lowerBound.toFixed(2)} - {data.upperBound.toFixed(2)}
              </div>
            )}
          </>
        ) : (
          <div>
            <strong>{metric.toUpperCase()}:</strong> {data.value?.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}

export default ForecastWidget;
