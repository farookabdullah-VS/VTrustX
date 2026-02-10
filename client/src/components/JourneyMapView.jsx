
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, GripHorizontal, MoreHorizontal, MessageSquare, Mail, Phone, Globe, User, Map, Image as ImageIcon } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- ICONS MAP ---
const TYPE_ICONS = {
    email: <Mail size={14} />,
    sms: <MessageSquare size={14} />,
    call: <Phone size={14} />,
    web: <Globe size={14} />,
    user: <User size={14} />,
    default: <MoreHorizontal size={14} />
};

const TYPE_COLORS = {
    email: '#dbeafe', // blue
    sms: '#fce7f3', // pink
    call: '#dcfce7', // green
    web: '#f3e8ff', // purple
    user: '#ffedd5', // orange
    default: '#f1f5f9'
};

// --- SORTABLE COMPONENTS ---

// 1. Sortable STAGE (Column Header)
function SortableStage({ stage, value, onChange, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={{ ...style, width: '280px', minWidth: '280px', marginRight: '10px' }}>
            <div style={{
                background: stage.color || '#f8fafc',
                borderBottom: `4px solid ${stage.color === '#eff6ff' ? '#3b82f6' : '#10b981'}`,
                padding: '10px',
                borderRadius: '8px 8px 0 0',
                display: 'flex', alignItems: 'center', gap: '8px'
            }}>
                <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#94a3b8' }}><GripVertical size={16} /></div>
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ background: 'transparent', border: 'none', fontWeight: 'bold', fontSize: '1.1em', width: '100%' }}
                />
                <button onClick={onDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={14} /></button>
            </div>
        </div>
    );
}



// 5. Metric/KPI Cell
const MetricCell = ({ val, onChange }) => {
    // val = { value: '50', label: 'NPS', trend: 'up' }
    const v = val || { value: '0', label: 'Metric', trend: 'flat' };

    const update = (field, newVal) => onChange({ ...v, [field]: newVal });

    return (
        <div style={{ textAlign: 'center', padding: '10px' }}>
            <input
                value={v.value}
                onChange={e => update('value', e.target.value)}
                style={{ fontSize: '1.8em', fontWeight: 'bold', width: '100%', textAlign: 'center', border: 'none', color: '#3b82f6', background: 'transparent' }}
            />
            <input
                value={v.label}
                onChange={e => update('label', e.target.value)}
                style={{ fontSize: '0.8em', width: '100%', textAlign: 'center', border: 'none', color: '#64748b', background: 'transparent' }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '5px' }}>
                <span onClick={() => update('trend', 'up')} style={{ cursor: 'pointer', opacity: v.trend === 'up' ? 1 : 0.3 }}>⬆️</span>
                <span onClick={() => update('trend', 'flat')} style={{ cursor: 'pointer', opacity: v.trend === 'flat' ? 1 : 0.3 }}>➡️</span>
                <span onClick={() => update('trend', 'down')} style={{ cursor: 'pointer', opacity: v.trend === 'down' ? 1 : 0.3 }}>⬇️</span>
            </div>
        </div>
    );
};

// --- GRAPH RENDERER (Moved inside to access handleCellChange easily) ---
const GraphRenderer = ({ row, stages, handleCellChange }) => {
    if (!stages || stages.length === 0) return null;
    const height = 120;
    const widthPerStage = 290; // 280 + 10 margin
    const startX = 140; // half of 280

    const points = stages.map((stage, i) => {
        const val = row.cells[stage.id] ?? 0;
        const x = startX + (i * widthPerStage);
        const y = 60 - (val * 10);
        return { x, y, val, stageId: stage.id };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const cp1x = p0.x + (widthPerStage / 2);
        const cp1y = p0.y;
        const cp2x = p1.x - (widthPerStage / 2);
        const cp2y = p1.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    return (
        <div style={{ position: 'relative', height: '120px', width: stages.length * 290 + 'px', overflow: 'hidden' }}>
            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                <path d={d} fill="none" stroke={points[points.length - 1].val >= 0 ? '#10b981' : '#ef4444'} strokeWidth="3" strokeLinecap="round" />
                {points.map((p, i) => (
                    <g key={i} onClick={() => {
                        const current = p.val;
                        let next = current === 0 ? 3 : current === 3 ? 5 : current === 5 ? -3 : current === -3 ? -5 : 0;
                        handleCellChange(row.id, p.stageId, next);
                    }} style={{ cursor: 'pointer' }}>
                        <circle cx={p.x} cy={p.y} r="8" fill="white" stroke="#64748b" strokeWidth="2" />
                        <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fill="#333">{p.val > 0 ? '😊' : p.val < 0 ? '😟' : '😐'}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

// 6. TextCell - Multi-line list for text/goals/pain/opportunities/actions/touchpoints/outcome/problems
const TextCell = ({ val, onChange }) => {
    const items = Array.isArray(val) ? val : (val ? [val] : ['']);
    const update = (idx, v) => {
        const next = [...items];
        next[idx] = v;
        onChange(next);
    };
    const addItem = () => onChange([...items, '']);
    const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px' }}>
            {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.75em' }}>{idx + 1}.</span>
                    <input
                        value={typeof item === 'string' ? item : (item?.text || '')}
                        onChange={e => update(idx, e.target.value)}
                        style={{ flex: 1, border: 'none', borderBottom: '1px solid #e2e8f0', padding: '4px', fontSize: '0.85em', background: 'transparent', outline: 'none' }}
                        placeholder="Enter item..."
                    />
                    {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8em', padding: '2px' }}>×</button>
                    )}
                </div>
            ))}
            <button onClick={addItem} style={{ border: '1px dashed #cbd5e1', background: 'transparent', borderRadius: '4px', color: '#64748b', cursor: 'pointer', padding: '3px', fontSize: '0.8em' }}>+ Add</button>
        </div>
    );
};

// 7. ChannelCell - Channel toggle selector
const ChannelCell = ({ val, onChange }) => {
    const channels = val || {};
    const channelTypes = [
        { key: 'email', label: 'Email', icon: '✉️' },
        { key: 'sms', label: 'SMS', icon: '💬' },
        { key: 'call', label: 'Call', icon: '📞' },
        { key: 'web', label: 'Web', icon: '🌐' },
        { key: 'app', label: 'App', icon: '📱' }
    ];

    const toggle = (key) => onChange({ ...channels, [key]: !channels[key] });

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', padding: '5px' }}>
            {channelTypes.map(ch => (
                <button
                    key={ch.key}
                    onClick={() => toggle(ch.key)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '5px 10px', borderRadius: '20px', fontSize: '0.8em', cursor: 'pointer',
                        border: channels[ch.key] ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        background: channels[ch.key] ? '#eff6ff' : '#f8fafc',
                        color: channels[ch.key] ? '#1d4ed8' : '#64748b',
                        fontWeight: channels[ch.key] ? '600' : '400'
                    }}
                >
                    <span>{ch.icon}</span> {ch.label}
                </button>
            ))}
        </div>
    );
};

// 8. ProcessCell - Numbered step list with add/remove
const ProcessCell = ({ val, onChange }) => {
    const steps = Array.isArray(val) ? val : [];
    const addStep = () => onChange([...steps, '']);
    const updateStep = (idx, v) => { const next = [...steps]; next[idx] = v; onChange(next); };
    const removeStep = (idx) => onChange(steps.filter((_, i) => i !== idx));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px' }}>
            {steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7em', fontWeight: 'bold', flexShrink: 0 }}>{idx + 1}</div>
                    {idx > 0 && <div style={{ position: 'absolute', marginLeft: '10px', marginTop: '-20px', color: '#cbd5e1' }}>↓</div>}
                    <input
                        value={step}
                        onChange={e => updateStep(idx, e.target.value)}
                        style={{ flex: 1, border: 'none', borderBottom: '1px solid #e2e8f0', padding: '4px', fontSize: '0.85em', background: 'transparent', outline: 'none' }}
                        placeholder={`Step ${idx + 1}`}
                    />
                    <button onClick={() => removeStep(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8em' }}>×</button>
                </div>
            ))}
            <button onClick={addStep} style={{ border: '1px dashed #cbd5e1', background: 'transparent', borderRadius: '4px', color: '#64748b', cursor: 'pointer', padding: '3px', fontSize: '0.8em' }}>+ Step</button>
        </div>
    );
};

// 9. MediaCell - Asset name/URL list
const MediaCell = ({ val, onChange }) => {
    const assets = Array.isArray(val) ? val : [];
    const addAsset = () => {
        const name = prompt("Asset name or URL:");
        if (name) onChange([...assets, { name, type: 'file' }]);
    };
    const removeAsset = (idx) => onChange(assets.filter((_, i) => i !== idx));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '5px' }}>
            {assets.map((asset, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.8em' }}>
                    <span>📄</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name || asset}</span>
                    <button onClick={() => removeAsset(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8em' }}>×</button>
                </div>
            ))}
            <button onClick={addAsset} style={{ border: '1px dashed #cbd5e1', background: 'transparent', borderRadius: '4px', color: '#64748b', cursor: 'pointer', padding: '3px', fontSize: '0.8em' }}>+ Asset</button>
        </div>
    );
};

// --- UPDATED ROW COMPONENT ---
function SortableRow({ row, stages, handleCellChange, onDeleteRow, handleLabelChange }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
    const style = { transform: CSS.Transform.toString(transform), transition, display: 'flex', marginBottom: '10px' };

    return (
        <div ref={setNodeRef} style={style}>
            {/* Row Header */}
            <div style={{
                width: '200px', minWidth: '200px', padding: '15px', background: 'white', borderRight: '1px solid #e2e8f0',
                display: 'flex', flexDirection: 'column', gap: '5px',
                position: 'sticky', left: 0, zIndex: 10, boxShadow: '2px 0 5px rgba(0,0,0,0.05)', borderRadius: '8px 0 0 8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#cbd5e1' }}><GripVertical size={16} /></div>
                    <button onClick={() => onDeleteRow(row.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
                <input
                    value={row.label}
                    onChange={e => handleLabelChange(row.id, e.target.value)}
                    style={{ border: 'none', fontWeight: 'bold', fontSize: '1em', width: '100%' }}
                />
                <select
                    value={row.type}
                    onChange={e => handleLabelChange(row.id, e.target.value, 'type')}
                    style={{ fontSize: '0.8em', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '4px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}
                >
                    <option disabled>--- Strategy ---</option>
                    <option value="goals">🎯 Goals</option>
                    <option value="kpi">📊 Metrics / Scores</option>
                    <option value="outcome">🏁 Outcome</option>

                    <option disabled>--- Experience ---</option>
                    <option value="emotion">📈 Experience Graph</option>
                    <option value="pain">😫 Pain Points</option>
                    <option value="opportunities">💡 Opportunities</option>
                    <option value="problems">⚠️ Problems / Root Cause</option>

                    <option disabled>--- Execution ---</option>
                    <option value="actions">🚀 Actions / Steps</option>
                    <option value="touchpoints">👆 Touchpoints</option>
                    <option value="channels">📱 Channels</option>
                    <option value="process">⚡ Process Flow</option>
                    <option value="assets">📂 Artifacts / Assets</option>
                    <option value="text">📄 Generic Text</option>
                </select>
            </div>

            {/* Cells */}
            {row.type === 'emotion' ? (
                <div style={{ display: 'flex', flex: 1 }}>
                    <GraphRenderer row={row} stages={stages} handleCellChange={handleCellChange} />
                </div>
            ) : (
                stages.map(stage => (
                    <div key={stage.id} style={{ width: '280px', minWidth: '280px', marginRight: '10px', background: 'white', border: '1px solid #e2e8f0', padding: '10px', display: 'flex', flexDirection: 'column' }}>
                        {(['text', 'goals', 'pain', 'opportunities', 'actions', 'touchpoints', 'outcome', 'problems'].includes(row.type)) &&
                            <TextCell val={row.cells?.[stage.id]} onChange={v => handleCellChange(row.id, stage.id, v)} />
                        }
                        {row.type === 'channels' && <ChannelCell val={row.cells?.[stage.id]} onChange={v => handleCellChange(row.id, stage.id, v)} />}
                        {row.type === 'process' && <ProcessCell val={row.cells?.[stage.id]} onChange={v => handleCellChange(row.id, stage.id, v)} />}
                        {row.type === 'assets' && <MediaCell val={row.cells?.[stage.id]} onChange={v => handleCellChange(row.id, stage.id, v)} />}
                        {row.type === 'kpi' && <MetricCell val={row.cells?.[stage.id]} onChange={v => handleCellChange(row.id, stage.id, v)} />}
                    </div>
                ))
            )}

            {/* Spacer for Drag Handle overlap fix */}
            <div style={{ width: '50px' }}></div>
        </div>
    );
}

const btnStyle = { padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b' };


export function JourneyMapView({ data, onChange }) {
    const [mapData, setMapData] = useState(data || {
        stages: [{ id: 's1', name: 'Awareness', color: '#eff6ff' }, { id: 's2', name: 'Consideration', color: '#ecfdf5' }],
        rows: []
    });

    useEffect(() => { onChange(mapData); }, [mapData]);

    // Sensors for Dnd
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Handlers
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            // Check if Stage or Row
            const isStage = mapData.stages.find(s => s.id === active.id);
            if (isStage) {
                setMapData((items) => {
                    const oldIndex = items.stages.findIndex(s => s.id === active.id);
                    const newIndex = items.stages.findIndex(s => s.id === over.id);
                    return { ...items, stages: arrayMove(items.stages, oldIndex, newIndex) };
                });
            } else {
                setMapData((items) => {
                    const oldIndex = items.rows.findIndex(r => r.id === active.id);
                    const newIndex = items.rows.findIndex(r => r.id === over.id);
                    return { ...items, rows: arrayMove(items.rows, oldIndex, newIndex) };
                });
            }
        }
    };

    const handleCellChange = (rowId, stageId, val) => {
        setMapData(prev => ({
            ...prev,
            rows: prev.rows.map(r => r.id === rowId ? { ...r, cells: { ...r.cells, [stageId]: val } } : r)
        }));
    };

    const addStage = () => {
        setMapData(prev => ({ ...prev, stages: [...prev.stages, { id: `s${Date.now()}`, name: 'New Stage', color: '#f8fafc' }] }));
    };

    const addRow = () => {
        setMapData(prev => ({ ...prev, rows: [...prev.rows, { id: `r${Date.now()}`, label: 'New Lane', type: 'text', cells: {} }] }));
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div style={{ padding: '20px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* TOOLBAR */}
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <button onClick={addStage} style={{ ...btnBig, background: '#eff6ff', color: '#1e40af' }}>+ Add Stage (Column)</button>
                    <button onClick={addRow} style={{ ...btnBig, background: '#f0fdf4', color: '#166534' }}>+ Add Lane (Row)</button>
                </div>

                {/* HEADER (Stages) */}
                <div style={{ display: 'flex', marginLeft: '200px' }}>
                    <SortableContext items={mapData.stages} strategy={horizontalListSortingStrategy}>
                        {mapData.stages.map(stage => (
                            <SortableStage
                                key={stage.id}
                                stage={stage}
                                value={stage.name}
                                onChange={(val) => {
                                    const ns = mapData.stages.map(s => s.id === stage.id ? { ...s, name: val } : s);
                                    setMapData({ ...mapData, stages: ns });
                                }}
                                onDelete={() => {
                                    setMapData({ ...mapData, stages: mapData.stages.filter(s => s.id !== stage.id) });
                                }}
                            />
                        ))}
                    </SortableContext>
                </div>

                {/* BODY (Rows) */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <SortableContext items={mapData.rows} strategy={verticalListSortingStrategy}>
                        {mapData.rows.map(row => (
                            <SortableRow
                                key={row.id}
                                row={row}
                                stages={mapData.stages}
                                handleCellChange={handleCellChange}
                                onDeleteRow={(id) => setMapData({ ...mapData, rows: mapData.rows.filter(r => r.id !== id) })}
                                handleLabelChange={(id, val, field = 'label') => {
                                    setMapData({ ...mapData, rows: mapData.rows.map(r => r.id === id ? { ...r, [field]: val } : r) });
                                }}
                            />
                        ))}
                    </SortableContext>

                    {mapData.rows.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
                            No lanes yet. Click "+ Add Lane" to start mapping.
                        </div>
                    )}
                </div>

            </div>
        </DndContext>
    );
}

const btnBig = { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
