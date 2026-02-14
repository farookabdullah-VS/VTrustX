/**
 * Widget Config Panel
 *
 * Right sidebar for configuring selected widget properties
 */

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const WidgetConfigPanel = ({ widget, onUpdate, onClose }) => {
    const [config, setConfig] = useState(widget.config || {});
    const [title, setTitle] = useState(widget.title || '');
    const [dataSource, setDataSource] = useState(widget.dataSource || { type: 'submissions' });

    const handleSave = () => {
        onUpdate({
            ...widget,
            title,
            config,
            dataSource
        });
        onClose();
    };

    const handleConfigChange = (key, value) => {
        setConfig({ ...config, [key]: value });
    };

    const renderConfigFields = () => {
        switch (widget.widgetType) {
            case 'metric':
                return (
                    <>
                        <div className="config-field">
                            <label>Metric</label>
                            <select
                                value={config.metric || 'total_responses'}
                                onChange={(e) => handleConfigChange('metric', e.target.value)}
                            >
                                <option value="total_responses">Total Responses</option>
                                <option value="nps_score">NPS Score</option>
                                <option value="csat_score">CSAT Score</option>
                                <option value="completion_rate">Completion Rate</option>
                                <option value="avg_response_time">Avg Response Time</option>
                            </select>
                        </div>

                        <div className="config-field">
                            <label>Aggregate</label>
                            <select
                                value={config.aggregate || 'count'}
                                onChange={(e) => handleConfigChange('aggregate', e.target.value)}
                            >
                                <option value="count">Count</option>
                                <option value="average">Average</option>
                                <option value="sum">Sum</option>
                                <option value="min">Minimum</option>
                                <option value="max">Maximum</option>
                            </select>
                        </div>
                    </>
                );

            case 'chart':
                return (
                    <>
                        <div className="config-field">
                            <label>Chart Type</label>
                            <select
                                value={config.chartType || 'bar'}
                                onChange={(e) => handleConfigChange('chartType', e.target.value)}
                            >
                                <option value="bar">Bar Chart</option>
                                <option value="line">Line Chart</option>
                                <option value="pie">Pie Chart</option>
                                <option value="area">Area Chart</option>
                            </select>
                        </div>

                        <div className="config-field">
                            <label>Group By</label>
                            <select
                                value={config.groupBy || 'date'}
                                onChange={(e) => handleConfigChange('groupBy', e.target.value)}
                            >
                                <option value="date">Date</option>
                                <option value="form">Form</option>
                                <option value="sentiment">Sentiment</option>
                            </select>
                        </div>

                        <div className="config-field">
                            <label>Limit</label>
                            <input
                                type="number"
                                value={config.limit || 10}
                                onChange={(e) => handleConfigChange('limit', parseInt(e.target.value))}
                                min="1"
                                max="50"
                            />
                        </div>
                    </>
                );

            case 'table':
                return (
                    <>
                        <div className="config-field">
                            <label>Page Size</label>
                            <input
                                type="number"
                                value={config.pageSize || 10}
                                onChange={(e) => handleConfigChange('pageSize', parseInt(e.target.value))}
                                min="5"
                                max="50"
                            />
                        </div>

                        <div className="config-field">
                            <label>Sort By</label>
                            <select
                                value={config.sortBy || 'created_at'}
                                onChange={(e) => handleConfigChange('sortBy', e.target.value)}
                            >
                                <option value="created_at">Created Date</option>
                                <option value="updated_at">Updated Date</option>
                                <option value="form_id">Form</option>
                            </select>
                        </div>
                    </>
                );

            case 'text':
                return (
                    <div className="config-field">
                        <label>Content</label>
                        <textarea
                            value={config.content || ''}
                            onChange={(e) => handleConfigChange('content', e.target.value)}
                            rows="5"
                            placeholder="Enter text content..."
                        />
                    </div>
                );

            case 'gauge':
                return (
                    <>
                        <div className="config-field">
                            <label>Metric</label>
                            <select
                                value={config.metric || 'nps_score'}
                                onChange={(e) => handleConfigChange('metric', e.target.value)}
                            >
                                <option value="nps_score">NPS Score</option>
                                <option value="csat_score">CSAT Score</option>
                                <option value="completion_rate">Completion Rate</option>
                            </select>
                        </div>

                        <div className="config-field">
                            <label>Goal</label>
                            <input
                                type="number"
                                value={config.goal || 50}
                                onChange={(e) => handleConfigChange('goal', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="config-field">
                            <label>Min Value</label>
                            <input
                                type="number"
                                value={config.min || 0}
                                onChange={(e) => handleConfigChange('min', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="config-field">
                            <label>Max Value</label>
                            <input
                                type="number"
                                value={config.max || 100}
                                onChange={(e) => handleConfigChange('max', parseFloat(e.target.value))}
                            />
                        </div>
                    </>
                );

            default:
                return <p>No configuration available for this widget type.</p>;
        }
    };

    return (
        <div className="widget-config-panel">
            <div className="panel-header">
                <h3>Configure Widget</h3>
                <button className="btn-icon" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            <div className="panel-content">
                <div className="config-section">
                    <h4>Basic Settings</h4>

                    <div className="config-field">
                        <label>Widget Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter widget title..."
                        />
                    </div>

                    <div className="config-field">
                        <label>Widget Type</label>
                        <input
                            type="text"
                            value={widget.widgetType}
                            disabled
                            style={{ backgroundColor: '#F3F4F6', cursor: 'not-allowed' }}
                        />
                    </div>
                </div>

                <div className="config-section">
                    <h4>Data Configuration</h4>
                    {renderConfigFields()}
                </div>
            </div>

            <div className="panel-footer">
                <button className="btn-secondary" onClick={onClose}>
                    Cancel
                </button>
                <button className="btn-primary" onClick={handleSave}>
                    <Save size={16} />
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default WidgetConfigPanel;
