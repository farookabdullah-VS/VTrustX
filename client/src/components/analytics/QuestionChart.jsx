import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';

export function QuestionChart({ question, submissions, themeColor = '#059669', forceCollapsed }) {
    const chartRef = useRef(null);
    const [chartType, setChartType] = useState('bar');
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (count), 'asc' (count), 'alpha-asc', 'alpha-desc'

    const [isCollapsed, setIsCollapsed] = useState(false);

    // Sync with forceCollapsed prop
    useEffect(() => {
        if (forceCollapsed !== undefined) {
            setIsCollapsed(forceCollapsed);
        }
    }, [forceCollapsed]);

    // Question Metadata
    const title = question.title || question.name;
    const type = question.type;

    // determine supported charts based on question type
    const getSupportedCharts = () => {
        if (['text', 'comment'].includes(type)) return ['list'];
        if (type === 'rating') return ['bar', 'gauge', 'pie'];
        return ['bar', 'pie', 'donut'];
    };

    // Calculate Data
    const processData = () => {
        const counts = {};
        let total = 0;
        let numericSum = 0;
        let numericCount = 0;

        submissions.forEach(sub => {
            const val = sub.data?.[question.name];
            if (val !== undefined && val !== null && val !== "") {
                if (Array.isArray(val)) {
                    // Checkbox or multi-select
                    val.forEach(v => {
                        counts[v] = (counts[v] || 0) + 1;
                        total++;
                    });
                } else {
                    counts[val] = (counts[val] || 0) + 1;
                    total++;
                    if (type === 'rating' || !isNaN(Number(val))) {
                        numericSum += Number(val);
                        numericCount++;
                    }
                }
            }
        });

        // Convert to Array
        let dataArr = Object.entries(counts).map(([label, count]) => ({ label, count }));

        // Sort
        if (sortOrder === 'desc') dataArr.sort((a, b) => b.count - a.count);
        else if (sortOrder === 'asc') dataArr.sort((a, b) => a.count - b.count);
        else if (sortOrder === 'alpha-asc') dataArr.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        else if (sortOrder === 'alpha-desc') dataArr.sort((a, b) => String(b.label).localeCompare(String(a.label)));

        return { dataArr, total, average: numericCount ? (numericSum / numericCount).toFixed(2) : null };
    };

    const { dataArr, total, average } = processData();

    useEffect(() => {
        if (!chartRef.current || isCollapsed) return;
        if (chartType === 'list') return; // Handled by JSX
        if (dataArr.length === 0) {
            Plotly.purge(chartRef.current);
            return;
        }

        let plotData = [];
        let layout = {
            autosize: true,
            margin: { l: 40, r: 40, t: 30, b: 40 },
            font: { family: 'Inter, sans-serif' },
            showlegend: chartType !== 'bar',
            height: 300,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent'
        };

        const labels = dataArr.map(d => d.label);
        const values = dataArr.map(d => d.count);
        // Aesthetics
        const colors = [
            '#059669', '#34d399', '#6ee7b7', '#10b981', '#047857',
            '#065f46', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'
        ];

        if (chartType === 'bar') {
            plotData = [{
                x: labels,
                y: values,
                type: 'bar',
                marker: { color: themeColor }, // Use primary theme color
                text: values.map(v => String(v)),
                textposition: 'auto'
            }];
        } else if (chartType === 'pie' || chartType === 'donut') {
            plotData = [{
                labels: labels,
                values: values,
                type: 'pie',
                hole: chartType === 'donut' ? 0.4 : 0,
                marker: { colors: colors },
                textinfo: 'label+percent',
                textposition: 'inside',
                hoverinfo: 'label+value+percent'
            }];
        } else if (chartType === 'gauge') {
            // Gauge for Average (Rating)
            const maxVal = question.rateMax || 10; // Default to 10
            plotData = [{
                domain: { x: [0, 1], y: [0, 1] },
                value: average,
                title: { text: "Average Score" },
                type: "indicator",
                mode: "gauge+number",
                gauge: {
                    axis: { range: [null, maxVal] },
                    bar: { color: themeColor },
                    steps: [
                        { range: [0, maxVal * 0.33], color: "#fca5a5" },
                        { range: [maxVal * 0.33, maxVal * 0.66], color: "#fcd34d" },
                        { range: [maxVal * 0.66, maxVal], color: "#86efac" }
                    ]
                }
            }];
        }

        Plotly.newPlot(chartRef.current, plotData, layout, { displayModeBar: false, responsive: true });

        return () => {
            if (chartRef.current) Plotly.purge(chartRef.current);
        };
    }, [dataArr, chartType, themeColor, question, isCollapsed]);

    if (total === 0) return null;

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.5s ease-out',
            height: 'fit-content'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isCollapsed ? '0' : '20px' }}>
                <div style={{ maxWidth: '70%' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '1.1em' }}>{title}</h3>
                    {!isCollapsed && <div style={{ fontSize: '0.85em', color: '#64748b' }}>{total} responses</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!isCollapsed && (
                        <>
                            {/* Sort Control */}
                            {!['gauge', 'list'].includes(chartType) && (
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.85em',
                                        color: '#475569',
                                        background: '#f8fafc',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="desc">Sort: Highest</option>
                                    <option value="asc">Sort: Lowest</option>
                                    <option value="alpha-asc">Sort: A-Z</option>
                                </select>
                            )}

                            {/* Chart Type Control */}
                            {getSupportedCharts().length > 1 && (
                                <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '2px', display: 'flex' }}>
                                    {getSupportedCharts().map(ct => (
                                        <button
                                            key={ct}
                                            onClick={() => setChartType(ct)}
                                            title={ct.charAt(0).toUpperCase() + ct.slice(1)}
                                            style={{
                                                padding: '6px 10px',
                                                border: 'none',
                                                background: chartType === ct ? 'white' : 'transparent',
                                                color: chartType === ct ? themeColor : '#64748b',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.9em',
                                                fontWeight: chartType === ct ? '600' : 'normal',
                                                boxShadow: chartType === ct ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {ct === 'bar' && '📊'}
                                            {ct === 'pie' && '🥧'}
                                            {ct === 'donut' && '🍩'}
                                            {ct === 'gauge' && '🏎️'}
                                            {ct === 'list' && '📝'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{
                            padding: '6px',
                            background: 'none',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? '➕' : '➖'}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <>
                    {chartType === 'list' ? (
                        <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8fafc', borderRadius: '12px', padding: '10px' }}>
                            {dataArr.map((item, i) => (
                                <div key={i} style={{
                                    padding: '12px',
                                    borderBottom: i < dataArr.length - 1 ? '1px solid #e2e8f0' : 'none',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{ color: '#334155' }}>"{item.label}"</span>
                                    <span style={{ fontSize: '0.8em', background: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', color: '#64748b' }}>{item.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div ref={chartRef} style={{ width: '100%' }}></div>
                    )}
                </>
            )}
        </div>
    );
}

// Add simple CSS for fade in if not exists
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);
