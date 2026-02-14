/**
 * Funnel Widget
 *
 * Displays conversion funnel visualization
 */

import React from 'react';
import { X } from 'lucide-react';

const FunnelWidget = ({ widget, data, onRemove, onClick, isSelected }) => {
    const funnelData = data?.data || [];

    return (
        <div
            className={`widget funnel-widget ${isSelected ? 'selected' : ''}`}
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

            <div className="funnel-content">
                {funnelData.length === 0 ? (
                    <div className="funnel-empty">
                        <p>Configure funnel steps in settings</p>
                    </div>
                ) : (
                    <div className="funnel-steps">
                        {funnelData.map((step, index) => (
                            <div key={index} className="funnel-step">
                                <div className="step-bar" style={{ width: `${step.conversionRate}%`, backgroundColor: step.color }}>
                                    <span className="step-label">{step.label}</span>
                                    <span className="step-value">{step.value} ({step.conversionRate}%)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FunnelWidget;
