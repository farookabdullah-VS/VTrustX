import React, { useState, useEffect } from 'react';
import { X, PieChart, BarChart2, Plus, Trash2, GripVertical } from 'lucide-react';
import { PieChart as RPieChart, Pie, Cell, BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#60A5FA', '#A3E635', '#FBBF24', '#F87171', '#818CF8', '#C084FC', '#22D3EE', '#94A3B8'];

export function ChartEditorModal({ isOpen, onClose, onSave, initialData }) {
    const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar'

    // Pie State
    const [pieData, setPieData] = useState([
        { name: 'Sector 1', value: 50, fill: COLORS[0] },
        { name: 'Sector 2', value: 30, fill: COLORS[1] },
        { name: 'Sector 3', value: 20, fill: COLORS[2] }
    ]);

    // Bar State
    const [barCategories, setBarCategories] = useState(['1st Qtr', '2nd Qtr', '3rd Qtr', '4th Qtr']);
    const [barSeries, setBarSeries] = useState([
        { name: 'Title 1', color: COLORS[6], data: [20, 63, 52, 88] },
        { name: 'Title 2', color: COLORS[1], data: [30, 42, 66, 76] },
        { name: 'Title 3', color: COLORS[3], data: [50, 36, 47, 51] }
    ]);

    useEffect(() => {
        if (isOpen && initialData && initialData.chartType) {
            setChartType(initialData.chartType);
            if (initialData.chartType === 'pie') {
                setPieData(initialData.data || []);
            } else {
                setBarCategories(initialData.categories || []);
                setBarSeries(initialData.series || []);
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (chartType === 'pie') {
            onSave({ chartType: 'pie', data: pieData });
        } else {
            onSave({ chartType: 'bar', categories: barCategories, series: barSeries });
        }
        onClose();
    };

    // --- PIE LOGIC ---
    const updatePieRow = (idx, field, val) => {
        const newData = [...pieData];
        newData[idx] = { ...newData[idx], [field]: val };
        setPieData(newData);
    };
    const addPieRow = () => {
        setPieData([...pieData, { name: 'New Sector', value: 10, fill: COLORS[pieData.length % COLORS.length] }]);
    };
    const removePieRow = (idx) => {
        setPieData(pieData.filter((_, i) => i !== idx));
    };

    // --- BAR LOGIC ---
    const updateBarCategory = (idx, val) => {
        const newCats = [...barCategories];
        newCats[idx] = val;
        setBarCategories(newCats);
    };
    const updateBarSeriesName = (idx, val) => {
        const newSeries = [...barSeries];
        newSeries[idx].name = val;
        setBarSeries(newSeries);
    };
    const updateBarValue = (seriesIdx, catIdx, val) => {
        const newSeries = [...barSeries];
        const newData = [...newSeries[seriesIdx].data];
        newData[catIdx] = Number(val);
        newSeries[seriesIdx].data = newData;
        setBarSeries(newSeries);
    };
    const addBarSeries = () => {
        const newData = new Array(barCategories.length).fill(0);
        setBarSeries([...barSeries, { name: 'New Series', color: COLORS[barSeries.length % COLORS.length], data: newData }]);
    };
    const removeBarSeries = (idx) => {
        setBarSeries(barSeries.filter((_, i) => i !== idx));
    };

    const formatBarDataForRecharts = () => {
        return barCategories.map((cat, i) => {
            const point = { name: cat };
            barSeries.forEach(s => {
                point[s.name] = s.data[i];
            });
            return point;
        });
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '12px', width: '1000px', maxWidth: '95%', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>EDIT CHART</div>
                        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '4px' }}>
                            <button
                                onClick={() => setChartType('pie')}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '4px', border: 'none', background: chartType === 'pie' ? 'white' : 'transparent', color: chartType === 'pie' ? '#10B981' : '#64748b', fontWeight: 'bold', cursor: 'pointer', boxShadow: chartType === 'pie' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                <PieChart size={16} /> PIE CHART
                            </button>
                            <button
                                onClick={() => setChartType('bar')}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '4px', border: 'none', background: chartType === 'bar' ? 'white' : 'transparent', color: chartType === 'bar' ? '#10B981' : '#64748b', fontWeight: 'bold', cursor: 'pointer', boxShadow: chartType === 'bar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                <BarChart2 size={16} /> BAR CHART
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* LEFT PANEL: EDITOR */}
                    <div style={{ flex: 1, borderRight: '1px solid #e2e8f0', padding: '20px', overflowY: 'auto', background: '#fcfcfc' }}>
                        {chartType === 'pie' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {pieData.map((row, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                        <input type="color" value={row.fill} onChange={e => updatePieRow(i, 'fill', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer', background: 'none' }} />
                                        <input value={row.name} onChange={e => updatePieRow(i, 'name', e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }} placeholder="Label" />
                                        <input type="number" value={row.value} onChange={e => updatePieRow(i, 'value', Number(e.target.value))} style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }} placeholder="Value" />
                                        <button onClick={() => removePieRow(i)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                <button onClick={addPieRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '12px', border: '2px dashed #e2e8f0', borderRadius: '8px', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer', background: 'transparent' }}>
                                    <Plus size={16} /> Add Sector
                                </button>
                            </div>
                        ) : (
                            // BAR EDITOR TABLE
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                        <div style={{ width: '150px', padding: '10px' }}></div>
                                        {barCategories.map((cat, i) => (
                                            <input key={i} value={cat} onChange={e => updateBarCategory(i, e.target.value)} style={{ flex: 1, minWidth: '60px', border: 'none', background: 'transparent', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }} />
                                        ))}
                                        <div style={{ width: '40px' }}></div>
                                    </div>
                                    {barSeries.map((series, sIdx) => (
                                        <div key={sIdx} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '150px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', borderRight: '1px solid #f1f5f9' }}>
                                                <input type="color" value={series.color} onChange={e => { const ns = [...barSeries]; ns[sIdx].color = e.target.value; setBarSeries(ns); }} style={{ width: '24px', height: '24px', border: 'none', padding: 0, background: 'none' }} />
                                                <input value={series.name} onChange={e => updateBarSeriesName(sIdx, e.target.value)} style={{ width: '100%', border: 'none' }} />
                                            </div>
                                            {series.data.map((val, dIdx) => (
                                                <input key={dIdx} type="number" value={val} onChange={e => updateBarValue(sIdx, dIdx, e.target.value)} style={{ flex: 1, minWidth: '60px', border: 'none', padding: '10px', textAlign: 'center', borderRight: '1px solid #f8fafc' }} />
                                            ))}
                                            <button onClick={() => removeBarSeries(sIdx)} style={{ width: '40px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addBarSeries} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '12px', border: '2px dashed #e2e8f0', borderRadius: '8px', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer', background: 'transparent' }}>
                                    <Plus size={16} /> Add Series
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: PREVIEW */}
                    <div style={{ width: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
                        <div style={{ fontSize: '1em', color: '#64748b', marginBottom: '20px' }}>Preview</div>
                        <div style={{ width: '100%', height: '400px', background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'pie' ? (
                                    <RPieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%" cy="50%"
                                            outerRadius={100}
                                            label
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </RPieChart>
                                ) : (
                                    <RBarChart data={formatBarDataForRecharts()}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                        <Legend />
                                        {barSeries.map((series, i) => (
                                            <Bar key={i} dataKey={series.name} fill={series.color} radius={[4, 4, 0, 0]} />
                                        ))}
                                    </RBarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
                    <button onClick={handleSave} style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: '24px', padding: '12px 40px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
                        DONE
                    </button>
                </div>
            </div>
        </div>
    );
}
