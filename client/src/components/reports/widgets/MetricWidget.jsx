/**
 * Metric Widget
 *
 * Displays a single KPI metric with optional comparison
 */

import React from 'react';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

const MetricWidget = ({ widget, data, onRemove, onClick, isSelected }) => {
    const value = data?.value || 0;
    const changePercent = data?.changePercent || null;
    const isPositive = changePercent > 0;

    return (
        <div
            className={`widget metric-widget ${isSelected ? 'selected' : ''}`}
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

            <div className="metric-content">
                <div className="metric-value">{value.toLocaleString()}</div>

                {changePercent !== null && (
                    <div className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{Math.abs(changePercent)}%</span>
                    </div>
                )}
            </div>

            {widget.subtitle && <div className="widget-subtitle">{widget.subtitle}</div>}
        </div>
    );
};

export default MetricWidget;
