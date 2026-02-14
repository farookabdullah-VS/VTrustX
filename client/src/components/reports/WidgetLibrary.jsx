/**
 * Widget Library
 *
 * Sidebar panel showing available widget types that can be added to reports
 */

import React from 'react';
import {
    BarChart3,
    LineChart,
    PieChart,
    Table,
    TrendingUp,
    Gauge,
    FileText,
    Filter,
    X
} from 'lucide-react';

const WidgetLibrary = ({ onAddWidget, onClose }) => {
    const widgetTypes = [
        {
            type: 'metric',
            name: 'Metric Card',
            description: 'Display a single KPI or metric',
            icon: <TrendingUp size={24} />,
            color: '#3B82F6'
        },
        {
            type: 'chart',
            name: 'Chart',
            description: 'Bar, line, or pie charts',
            icon: <BarChart3 size={24} />,
            color: '#8B5CF6'
        },
        {
            type: 'table',
            name: 'Data Table',
            description: 'Paginated data table',
            icon: <Table size={24} />,
            color: '#10B981'
        },
        {
            type: 'funnel',
            name: 'Funnel',
            description: 'Conversion funnel visualization',
            icon: <Filter size={24} />,
            color: '#F59E0B'
        },
        {
            type: 'gauge',
            name: 'Gauge',
            description: 'Progress toward a goal',
            icon: <Gauge size={24} />,
            color: '#EF4444'
        },
        {
            type: 'text',
            name: 'Text Block',
            description: 'Headings and descriptions',
            icon: <FileText size={24} />,
            color: '#6B7280'
        }
    ];

    return (
        <div className="widget-library">
            <div className="library-header">
                <h3>Widget Library</h3>
                <button className="btn-icon" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            <div className="library-content">
                {widgetTypes.map(widget => (
                    <div
                        key={widget.type}
                        className="widget-type-card"
                        onClick={() => onAddWidget(widget.type)}
                        style={{ borderLeftColor: widget.color }}
                    >
                        <div className="widget-icon" style={{ backgroundColor: `${widget.color}15`, color: widget.color }}>
                            {widget.icon}
                        </div>
                        <div className="widget-info">
                            <h4>{widget.name}</h4>
                            <p>{widget.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WidgetLibrary;
