/**
 * Chart Widget
 *
 * Displays various chart types using Recharts
 */

import React from 'react';
import { X } from 'lucide-react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];

const ChartWidget = ({ widget, data, onRemove, onClick, isSelected }) => {
    const chartData = data?.data || [];
    const chartType = widget.config?.chartType || 'bar';

    const renderChart = () => {
        if (chartData.length === 0) {
            return (
                <div className="chart-empty">
                    <p>No data available</p>
                </div>
            );
        }

        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill={COLORS[0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'area':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={`${COLORS[0]}40`} />
                        </AreaChart>
                    </ResponsiveContainer>
                );

            default:
                return <div>Unsupported chart type: {chartType}</div>;
        }
    };

    return (
        <div
            className={`widget chart-widget ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            style={widget.style}
        >
            <div className="widget-header">
                {widget.showTitle && <h3 className="widget-title">{widget.title}</h3>}
                <button className="widget-remove" onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}>
                    <X size={16} />
                </button>
            </div>

            <div className="chart-content">
                {renderChart()}
            </div>

            {widget.subtitle && <div className="widget-subtitle">{widget.subtitle}</div>}
        </div>
    );
};

export default ChartWidget;
