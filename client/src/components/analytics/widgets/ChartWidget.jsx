import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, FunnelChart, Funnel,
  LabelList, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, ScatterChart, Scatter, ZAxis
} from 'recharts';
import styles from '../styles/Analytics.module.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

/**
 * ChartWidget - Universal chart component supporting multiple chart types
 */
export function ChartWidget({ type, data, config = {} }) {
  const {
    xKey,
    yKey,
    title,
    showLegend = true,
    showGrid = true,
    height = 400
  } = config;

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>📊</div>
        <div className={styles.emptyStateText}>No data available for chart</div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey || 'name'} />
              <YAxis />
              <Tooltip />
              {showLegend && <Legend />}
              <Bar dataKey={yKey || 'value'} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey || 'name'} />
              <YAxis />
              <Tooltip />
              {showLegend && <Legend />}
              <Line type="monotone" dataKey={yKey || 'value'} stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey || 'name'} />
              <YAxis />
              <Tooltip />
              {showLegend && <Legend />}
              <Area type="monotone" dataKey={yKey || 'value'} fill="#2563eb" stroke="#2563eb" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={entry => `${entry[xKey || 'name']}: ${entry[yKey || 'value']}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={yKey || 'value'}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <FunnelChart>
              <Tooltip />
              <Funnel
                dataKey={yKey || 'value'}
                data={data}
                isAnimationActive
              >
                <LabelList position="right" fill="#000" stroke="none" dataKey={xKey || 'name'} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xKey || 'name'} />
              <PolarRadiusAxis />
              <Radar name="Value" dataKey={yKey || 'value'} stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
              <Tooltip />
              {showLegend && <Legend />}
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey || 'x'} name="X" />
              <YAxis dataKey={yKey || 'y'} name="Y" />
              <ZAxis dataKey="z" range={[60, 400]} name="Size" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {showLegend && <Legend />}
              <Scatter name="Data Points" data={data} fill="#2563eb" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <Treemap
              data={data}
              dataKey={yKey || 'size'}
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#2563eb"
            >
              <Tooltip />
            </Treemap>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateText}>Unsupported chart type: {type}</div>
          </div>
        );
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {renderChart()}
    </div>
  );
}

export default ChartWidget;
