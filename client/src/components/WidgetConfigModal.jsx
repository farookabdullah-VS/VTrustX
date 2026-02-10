import React, { useState, useEffect } from 'react';
import SeriesConfigurator from './SeriesConfigurator';

const WidgetConfigModal = ({ isOpen, onClose, onSave, widgetData }) => {
    const [config, setConfig] = useState({
        title: '', type: 'bar_chart', apiEndpoint: '', xAxisKey: '', yAxisKey: '', series: []
    });

    useEffect(() => {
        if (widgetData && isOpen) setConfig({ ...widgetData.config, type: widgetData.type });
    }, [widgetData, isOpen]);

    const handleSave = () => { onSave(widgetData.i, config); onClose(); };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content" style={{
                background: 'white', padding: '20px', borderRadius: '8px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h3>Configure Widget</h3>

                {/* Common Fields */}
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Title</label>
                    <input style={{ width: '100%', padding: '8px' }} value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Type</label>
                    <select style={{ width: '100%', padding: '8px' }} value={config.type} onChange={(e) => setConfig({ ...config, type: e.target.value })}>
                        <option value="bar_chart">Bar Chart</option>
                        <option value="pie_chart">Pie Chart</option>
                        <option value="donut_chart">Donut Chart</option>
                        <option value="radar_chart">Radar Chart</option>
                        <option value="composed_chart">Composed (Combo) Chart</option>
                    </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>API Endpoint</label>
                    <input style={{ width: '100%', padding: '8px' }} value={config.apiEndpoint} onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })} />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>X-Axis Key (Label)</label>
                    <input style={{ width: '100%', padding: '8px' }} value={config.xAxisKey} onChange={(e) => setConfig({ ...config, xAxisKey: e.target.value })} />
                </div>

                {/* Conditional Logic */}
                {config.type === 'composed_chart' ? (
                    <SeriesConfigurator
                        series={config.series}
                        onChange={(newSeries) => setConfig({ ...config, series: newSeries })}
                    />
                ) : (
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Y-Axis Key (Value)</label>
                        <input style={{ width: '100%', padding: '8px' }} value={config.yAxisKey} onChange={(e) => setConfig({ ...config, yAxisKey: e.target.value })} />
                    </div>
                )}

                <div className="footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSave} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};
export default WidgetConfigModal;
