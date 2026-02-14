/**
 * Gauge Widget
 *
 * Displays progress toward a goal as a gauge
 */

import React from 'react';
import { X } from 'lucide-react';

const GaugeWidget = ({ widget, data, onRemove, onClick, isSelected }) => {
    const value = data?.value || 0;
    const goal = data?.goal || 100;
    const percentage = data?.percentage || 0;

    const getColor = () => {
        if (percentage >= 90) return '#10B981';
        if (percentage >= 70) return '#F59E0B';
        return '#EF4444';
    };

    return (
        <div
            className={`widget gauge-widget ${isSelected ? 'selected' : ''}`}
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

            <div className="gauge-content">
                <div className="gauge-circle">
                    <svg width="200" height="200" viewBox="0 0 200 200">
                        <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth="20"
                        />
                        <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke={getColor()}
                            strokeWidth="20"
                            strokeDasharray={`${(percentage / 100) * 502.4} 502.4`}
                            transform="rotate(-90 100 100)"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="gauge-value">
                        <div className="gauge-percentage">{percentage}%</div>
                        <div className="gauge-label">{value} / {goal}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GaugeWidget;
