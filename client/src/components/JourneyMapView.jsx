import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, GripVertical, Smile, Frown, Meh, Users, Target, Info } from 'lucide-react';

export function JourneyMapView({ data, onChange }) {
    // Default structure if empty
    const [mapData, setMapData] = useState(data?.stages ? data : {
        stages: [
            { id: 's1', name: 'Awareness', color: '#eff6ff' },
            { id: 's2', name: 'Consideration', color: '#ecfdf5' },
            { id: 's3', name: 'Purchase', color: '#fffbeb' },
            { id: 's4', name: 'Service', color: '#fdf2f8' }
        ],
        rows: [
            { id: 'goals', label: 'User Goals', type: 'text', cells: { s1: 'Find a solution', s2: 'Compare options', s3: 'Buy now', s4: 'Get help' } },
            { id: 'actions', label: 'Actions', type: 'text', cells: { s1: 'Search Google', s2: 'Read Reviews', s3: 'Checkout', s4: 'Contact Support' } },
            { id: 'channels', label: 'Channels', type: 'tags', cells: { s1: 'Ads, Social', s2: 'Website', s3: 'App', s4: 'Email, Chat' } },
            { id: 'emotion', label: 'Experience', type: 'emotion', cells: { s1: 0, s2: 2, s3: 4, s4: 1 } }, // Scale -5 to 5
            { id: 'pain', label: 'Pain Points', type: 'text', cells: { s1: 'Too many ads', s2: 'Confusion', s3: 'Price', s4: 'Wait time' } }
        ]
    });

    const [activeCell, setActiveCell] = useState(null); // { rowId, stageId }

    useEffect(() => {
        onChange(mapData);
    }, [mapData]);

    const handleCellChange = (rowId, stageId, value) => {
        setMapData(prev => ({
            ...prev,
            rows: prev.rows.map(row => {
                if (row.id === rowId) {
                    return { ...row, cells: { ...row.cells, [stageId]: value } };
                }
                return row;
            })
        }));
    };

    const addStage = () => {
        const id = `s${Date.now()}`;
        setMapData(prev => ({
            ...prev,
            stages: [...prev.stages, { id, name: 'New Stage', color: '#f8fafc' }]
        }));
    };

    // --- EMOTION GRAPH RENDERER ---
    const GraphRenderer = ({ row, stages }) => {
        if (!stages || stages.length === 0) return null;

        // Calculate points
        // Cell width approx 250px. Height 100px.
        // Y scale: -5 (bottom) to 5 (top). Center is 0.
        const height = 120;
        const widthPerStage = 260; // 250 + padding
        const startX = widthPerStage / 2;

        const points = stages.map((stage, i) => {
            const val = row.cells[stage.id] ?? 0;
            const x = startX + (i * widthPerStage);
            // Map 5 -> 10px, -5 -> 110px
            const y = 60 - (val * 10);
            return { x, y, val };
        });

        // Create SVG Path (Curved)
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
            <div style={{ position: 'relative', height: '120px', width: stages.length * 260 + 'px', overflow: 'visible' }}>
                <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                    {/* Grid lines */}
                    <line x1="0" y1="10" x2="100%" y2="10" stroke="#f0fdf4" strokeWidth="1" strokeDasharray="4" />
                    <line x1="0" y1="60" x2="100%" y2="60" stroke="#e2e8f0" strokeWidth="2" />
                    <line x1="0" y1="110" x2="100%" y2="110" stroke="#fef2f2" strokeWidth="1" strokeDasharray="4" />

                    {/* The Line */}
                    <path d={d} fill="none" stroke={points[points.length - 1].val >= 0 ? '#10b981' : '#ef4444'} strokeWidth="4" strokeLinecap="round" />

                    {/* The Dots */}
                    {points.map((p, i) => (
                        <g key={i} className="graph-point" style={{ cursor: 'pointer' }}
                            onClick={() => {
                                const stageId = stages[i].id;
                                const current = mapData.rows.find(r => r.id === row.id).cells[stageId] ?? 0;
                                // Cycle values: 0 -> 2 -> 4 -> -2 -> -4 -> 0
                                let next = 0;
                                if (current === 0) next = 3;
                                else if (current === 3) next = 5;
                                else if (current === 5) next = -3;
                                else if (current === -3) next = -5;
                                else next = 0;
                                handleCellChange(row.id, stageId, next);
                            }}
                        >
                            <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#64748b" strokeWidth="2" />
                            {/* Emoji */}
                            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="16" fill="#333">
                                {p.val >= 3 ? '😍' : p.val >= 1 ? '🙂' : p.val === 0 ? '😐' : p.val >= -3 ? '😕' : '😡'}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Outfit', sans-serif", background: '#f8fafc', overflow: 'hidden' }}>

            {/* STAGES HEADER */}
            <div style={{ display: 'flex', marginLeft: '200px' }}> {/* 200px for Row Labels */}
                {mapData.stages.map(stage => (
                    <div key={stage.id} style={{
                        width: '250px',
                        minWidth: '250px',
                        marginRight: '10px',
                        background: stage.color,
                        borderBottom: `4px solid ${stage.color === '#eff6ff' ? '#3b82f6' : '#10b981'}`,
                        padding: '15px',
                        borderRadius: '8px 8px 0 0'
                    }}>
                        <input
                            value={stage.name}
                            onChange={(e) => {
                                const newStages = mapData.stages.map(s => s.id === stage.id ? { ...s, name: e.target.value } : s);
                                setMapData({ ...mapData, stages: newStages });
                            }}
                            style={{ background: 'transparent', border: 'none', fontWeight: 'bold', fontSize: '1.1em', width: '100%' }}
                        />
                    </div>
                ))}
                <button onClick={addStage} style={{ padding: '10px', background: 'transparent', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>
                    <Plus size={20} />
                </button>
            </div>

            {/* ROWS */}
            <div style={{ flex: 1, overflow: 'auto', paddingBottom: '50px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {mapData.rows.map(row => (
                        <div key={row.id} style={{ display: 'flex', minHeight: row.type === 'emotion' ? '120px' : '100px' }}>
                            {/* Row Header */}
                            <div style={{
                                width: '200px',
                                minWidth: '200px',
                                padding: '15px',
                                background: 'white',
                                borderRight: '1px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                position: 'sticky', left: 0, zIndex: 10,
                                boxShadow: '2px 0 5px rgba(0,0,0,0.05)'
                            }}>
                                <GripVertical size={16} color="#cbd5e1" style={{ cursor: 'move' }} />
                                <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                    {row.label}
                                    <div style={{ fontSize: '0.8em', color: '#94a3b8', fontWeight: 'normal' }}>{row.type}</div>
                                </div>
                            </div>

                            {/* Cells */}
                            {row.type === 'emotion' ? (
                                <GraphRenderer row={row} stages={mapData.stages} />
                            ) : (
                                mapData.stages.map(stage => (
                                    <div key={stage.id}
                                        style={{
                                            width: '250px',
                                            minWidth: '250px',
                                            marginRight: '10px',
                                            background: activeCell?.rowId === row.id && activeCell?.stageId === stage.id ? 'white' : 'rgba(255,255,255,0.5)',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            position: 'relative'
                                        }}
                                        onClick={() => setActiveCell({ rowId: row.id, stageId: stage.id })}
                                    >
                                        <textarea
                                            value={row.cells[stage.id] || ''}
                                            onChange={(e) => handleCellChange(row.id, stage.id, e.target.value)}
                                            placeholder="..."
                                            style={{
                                                width: '100%', height: '100%',
                                                border: 'none', background: 'transparent', resize: 'none',
                                                fontFamily: 'inherit', fontSize: '0.9em'
                                            }}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
