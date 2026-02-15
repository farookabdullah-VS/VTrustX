import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { WidgetRenderer } from './WidgetRegistry';
import WidgetConfigModal from './WidgetConfigModal';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DynamicDashboard = () => {
    // 1. Layout State
    const [layout, setLayout] = useState([
        { i: 'w1', x: 0, y: 0, w: 6, h: 4 },
        { i: 'w2', x: 6, y: 0, w: 6, h: 4 }
    ]);

    // 2. Widget Content State (Mock Initial Data)
    const [widgets, setWidgets] = useState({
        'w1': { type: 'bar_chart', title: 'Sales', config: { apiEndpoint: '/sales', xAxisKey: 'month', yAxisKey: 'val' } },
        'w2': { type: 'composed_chart', title: 'Growth', config: { apiEndpoint: '/growth', xAxisKey: 'year', series: [{ type: 'bar', dataKey: 'rev' }, { type: 'line', dataKey: 'margin' }] } }
    });

    const [editingId, setEditingId] = useState(null);

    // In a real app, this data comes from useFetch(widget.config.apiEndpoint)
    const MOCK_DATA = [
        { month: 'Jan', year: '2023', val: 400, rev: 2400, margin: 400 },
        { month: 'Feb', year: '2023', val: 300, rev: 1398, margin: 300 },
        { month: 'Mar', year: '2023', val: 200, rev: 9800, margin: 200 },
        { month: 'Apr', year: '2023', val: 278, rev: 3908, margin: 278 },
        { month: 'May', year: '2023', val: 189, rev: 4800, margin: 189 },
        { month: 'Jun', year: '2023', val: 239, rev: 3800, margin: 239 },
    ];

    const handleSaveConfig = (id, newConfig) => {
        setWidgets(prev => ({
            ...prev,
            [id]: { ...prev[id], type: newConfig.type, config: newConfig }
        }));
    };

    return (
        <div className="dashboard-container" style={{ padding: '20px' }}>
            <h1 style={{ marginBottom: '20px' }}>Dynamic Enterprise Dashboard</h1>
            <ResponsiveGridLayout
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
                rowHeight={60}
                onLayoutChange={(l) => setLayout(l)}
                draggableHandle=".drag-handle"
            >
                {layout.map(item => {
                    const w = widgets[item.i];
                    if (!w) return null;
                    return (
                        <div key={item.i} style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div className="drag-handle" style={{ padding: '10px', background: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move', borderBottom: '1px solid #eee' }}>
                                <span style={{ fontWeight: 600 }}>{w.title}</span>
                                <button onClick={() => setEditingId(item.i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} aria-label={`Configure widget ${w.title}`}>⚙️</button>
                            </div>
                            <div style={{ flex: 1, padding: '10px', minHeight: 0 }}>
                                <WidgetRenderer type={w.type} config={w.config} data={MOCK_DATA} />
                            </div>
                        </div>
                    );
                })}
            </ResponsiveGridLayout>

            <WidgetConfigModal
                isOpen={!!editingId}
                onClose={() => setEditingId(null)}
                widgetData={editingId ? { ...widgets[editingId], i: editingId } : null}
                onSave={handleSaveConfig}
            />
        </div>
    );
};
export default DynamicDashboard;
