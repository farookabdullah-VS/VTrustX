import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';

/**
 * Unified theme-aware color palette for all charts.
 * Uses CSS-friendly hex values that work in both light and dark mode.
 */
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
];

export const STATUS_COLORS = {
  positive: '#10b981',
  neutral: '#3b82f6',
  negative: '#ef4444',
  warning: '#f59e0b',
};

/**
 * Themed tooltip for all charts — reads CSS variables for styling.
 */
function ThemedTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--glass-border, #e2e8f0)',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        fontSize: '0.85rem',
      }}
    >
      {label && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '6px', fontWeight: 600 }}>
          {label}
        </div>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-color)', fontWeight: 500 }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Unified Bar Chart with theme awareness.
 *
 * Usage:
 *   <ThemeBarChart
 *     data={[{ name: 'Mon', count: 12 }, ...]}
 *     xKey="name"
 *     yKey="count"
 *     height={300}
 *     color="#3b82f6"
 *   />
 */
export function ThemeBarChart({
  data = [],
  xKey = 'name',
  yKey = 'value',
  color,
  colors,
  height = 300,
  showGrid = true,
  showLegend = false,
  barRadius = [6, 6, 0, 0],
  formatter,
  onClick,
  isRtl = false,
  style = {},
}) {
  const fillColor = color || CHART_COLORS[0];

  return (
    <div style={{ width: '100%', height, ...style }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="horizontal">
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--input-border, #e2e8f0)" vertical={false} />}
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--input-border, #e2e8f0)' }}
            tickLine={false}
            reversed={isRtl}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            orientation={isRtl ? 'right' : 'left'}
          />
          <RTooltip content={<ThemedTooltip formatter={formatter} />} cursor={{ fill: 'var(--sidebar-hover-bg, rgba(0,0,0,0.04))' }} />
          {showLegend && <Legend />}
          <Bar
            dataKey={yKey}
            radius={barRadius}
            cursor={onClick ? 'pointer' : 'default'}
            onClick={onClick}
          >
            {colors
              ? data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)
              : data.map((_, i) => <Cell key={i} fill={fillColor} />)
            }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Unified Line/Area Chart.
 *
 * Usage:
 *   <ThemeLineChart
 *     data={dailyTrend}
 *     xKey="date"
 *     yKey="count"
 *     area
 *   />
 */
export function ThemeLineChart({
  data = [],
  xKey = 'name',
  yKey = 'value',
  series, // [{ key: 'a', color: '#3b82f6', name: 'Series A' }, ...]
  color,
  height = 300,
  area = false,
  showGrid = true,
  showLegend = false,
  showDots = true,
  formatter,
  isRtl = false,
  style = {},
}) {
  const lineColor = color || CHART_COLORS[0];
  const ChartComponent = area ? AreaChart : LineChart;
  const DataComponent = area ? Area : Line;

  const seriesList = series || [{ key: yKey, color: lineColor, name: yKey }];

  return (
    <div style={{ width: '100%', height, ...style }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--input-border, #e2e8f0)" vertical={false} />}
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--input-border, #e2e8f0)' }}
            tickLine={false}
            reversed={isRtl}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            orientation={isRtl ? 'right' : 'left'}
          />
          <RTooltip content={<ThemedTooltip formatter={formatter} />} />
          {showLegend && <Legend />}
          {seriesList.map((s, i) =>
            area ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name || s.key}
                stroke={s.color || CHART_COLORS[i]}
                fill={s.color || CHART_COLORS[i]}
                fillOpacity={0.1}
                strokeWidth={2}
                dot={showDots ? { r: 3, fill: s.color || CHART_COLORS[i] } : false}
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name || s.key}
                stroke={s.color || CHART_COLORS[i]}
                strokeWidth={2}
                dot={showDots ? { r: 3, fill: s.color || CHART_COLORS[i] } : false}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            )
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Unified Pie/Donut Chart.
 *
 * Usage:
 *   <ThemePieChart
 *     data={[{ name: 'Active', value: 12 }, { name: 'Draft', value: 5 }]}
 *     height={250}
 *     donut
 *   />
 */
export function ThemePieChart({
  data = [],
  nameKey = 'name',
  valueKey = 'value',
  colors,
  height = 250,
  donut = false,
  showLegend = true,
  formatter,
  style = {},
}) {
  const palette = colors || CHART_COLORS;

  return (
    <div style={{ width: '100%', height, ...style }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={donut ? '55%' : 0}
            outerRadius="80%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <RTooltip content={<ThemedTooltip formatter={formatter} />} />
          {showLegend && (
            <Legend
              formatter={(value) => (
                <span style={{ color: 'var(--text-color)', fontSize: '0.85rem' }}>{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Mini sparkline for inline usage in tables/cards.
 * No axes, no tooltip — just the shape.
 */
export function Sparkline({
  data = [],
  dataKey = 'value',
  color,
  width = 120,
  height = 32,
  area = true,
  style = {},
}) {
  const lineColor = color || CHART_COLORS[0];

  return (
    <div style={{ width, height, ...style }}>
      <ResponsiveContainer width="100%" height="100%">
        {area ? (
          <AreaChart data={data}>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              fill={lineColor}
              fillOpacity={0.15}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
