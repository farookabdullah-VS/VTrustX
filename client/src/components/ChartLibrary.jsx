import React from 'react';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie,
    RadarChart, Radar, ScatterChart, Scatter, FunnelChart, Funnel, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Treemap
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

// --- 1. Simple Charts (Single Series) ---

export const SimpleBarChart = ({ data, config, onClick }) => (
    <ResponsiveContainer>
        <BarChart data={data} onClick={onClick}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={config.yAxisKey} fill={config.color || "#8884d8"} onClick={(data, index) => onClick && onClick(data, index)} />
        </BarChart>
    </ResponsiveContainer>
);

export const SimplePieChart = ({ data, config }) => (
    <ResponsiveContainer>
        <PieChart>
            <Pie
                data={data} innerRadius={config.innerRadius || 0} outerRadius={80}
                dataKey={config.yAxisKey} nameKey={config.xAxisKey}
            >
                {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
        </PieChart>
    </ResponsiveContainer>
);

export const SimpleRadarChart = ({ data, config }) => (
    <ResponsiveContainer>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={config.xAxisKey} />
            <PolarRadiusAxis />
            <Radar name={config.title} dataKey={config.yAxisKey} stroke={config.color} fill={config.color} fillOpacity={0.6} />
            <Legend />
        </RadarChart>
    </ResponsiveContainer>
);

// --- 2. Advanced Composed Chart (Multi Series) ---

export const AdvancedComposedChart = ({ data, config }) => {
    const hasRightAxis = config.series?.some(s => s.yAxisId === 'right');

    return (
        <ResponsiveContainer>
            <ComposedChart data={data}>
                <CartesianGrid stroke="#f5f5f5" />
                <XAxis dataKey={config.xAxisKey} />
                <YAxis yAxisId="left" />
                {hasRightAxis && <YAxis yAxisId="right" orientation="right" />}
                <Tooltip />
                <Legend />
                {(config.series || []).map((s, i) => {
                    const Props = {
                        key: i,
                        dataKey: s.dataKey,
                        name: s.name,
                        fill: s.color,
                        stroke: s.color,
                        yAxisId: s.yAxisId || 'left' // Support Dual Axis
                    };
                    if (s.type === 'bar') return <Bar {...Props} />;
                    if (s.type === 'line') return <Line type="monotone" {...Props} />;
                    if (s.type === 'area') return <Area type="monotone" {...Props} />;
                    return null;
                })}
            </ComposedChart>
        </ResponsiveContainer>
    );
};
