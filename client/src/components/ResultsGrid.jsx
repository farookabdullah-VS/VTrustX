import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Header Component
function SortableHeader({ id, title }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        padding: '12px',
        minWidth: '150px',
        maxWidth: '300px',
        background: isDragging ? '#e2e8f0' : '#f8fafc',
        cursor: 'grab',
        position: 'relative',
        zIndex: isDragging ? 20 : 1,
        borderBottom: '2px solid #e2e8f0',
        textAlign: 'left',
        color: '#64748b',
        whiteSpace: 'nowrap',
        userSelect: 'none'
    };

    return (
        <th ref={setNodeRef} scope="col" style={style} {...attributes} {...listeners} title={title}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span aria-hidden="true" style={{ color: '#94a3b8' }}>⋮⋮</span> {title}
            </div>
        </th>
    );
}

export function ResultsGrid({ submissions, questions, onEdit, onDelete, readOnly }) {
    // Define base columns
    const [columnOrder, setColumnOrder] = useState([]);

    // Initialize columns
    useEffect(() => {
        const initialCols = [
            'id',
            'date',
            'sentiment',
            ...questions.map(q => q.name)
        ];
        // Only set if different length to avoid reset on every render, 
        // implies "new questions added" or "first load"
        if (columnOrder.length === 0 || columnOrder.length !== initialCols.length) {
            setColumnOrder(initialCols);
        }
    }, [questions]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require drag of 8px to start event, prevents accidental drags on clicks
            },
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Helper to render cell content based on column ID
    const renderCell = (sub, colId) => {
        switch (colId) {
            case 'id':
                return <span style={{ color: '#2563eb', fontWeight: '500' }}>#{sub.id}</span>;
            case 'date':
                return <span style={{ color: '#64748b' }}>{new Date(sub.createdAt || sub.created_at).toLocaleString()}</span>;
            case 'sentiment': {
                // Check for AI-powered sentiment first
                const aiSentiment = sub.analysis?.sentiment?.aggregate;
                if (aiSentiment) {
                    const emotion = aiSentiment.emotion || 'neutral';
                    const score = aiSentiment.score || 0;

                    // Emotion icons
                    const emotionIcons = {
                        happy: '😊',
                        satisfied: '😌',
                        neutral: '😐',
                        confused: '😕',
                        disappointed: '😞',
                        frustrated: '😤',
                        angry: '😠'
                    };

                    // Color based on score
                    let bgColor, textColor;
                    if (score >= 0.3) {
                        bgColor = '#dcfce7';
                        textColor = '#166534';
                    } else if (score <= -0.3) {
                        bgColor = '#fee2e2';
                        textColor = '#991b1b';
                    } else {
                        bgColor = '#fef3c7';
                        textColor = '#92400e';
                    }

                    return (
                        <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.85em',
                            background: bgColor,
                            color: textColor,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '500'
                        }}>
                            <span>{emotionIcons[emotion] || '😐'}</span>
                            <span style={{ textTransform: 'capitalize' }}>{emotion}</span>
                            <span style={{ fontSize: '0.8em', opacity: 0.7 }}>({score.toFixed(2)})</span>
                        </span>
                    );
                }

                // Fallback to keyword-based sentiment
                return (
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.85em',
                        background: sub.computedSentiment === 'Positive' ? '#dcfce7' : (sub.computedSentiment === 'Negative' ? '#fee2e2' : '#f1f5f9'),
                        color: sub.computedSentiment === 'Positive' ? '#166534' : (sub.computedSentiment === 'Negative' ? '#991b1b' : '#475569')
                    }}>
                        {sub.computedSentiment || 'N/A'}
                    </span>
                );
            }
            default: {
                // It's a question
                const val = sub.data ? sub.data[colId] : '';
                let displayVal = val;
                if (typeof val === 'object' && val !== null) {
                    displayVal = Array.isArray(val) ? val.join(', ') : JSON.stringify(val);
                }
                return String(displayVal || '-');
            }
        }
    };

    const getColumnTitle = (id) => {
        if (id === 'id') return 'ID';
        if (id === 'date') return 'Date';
        if (id === 'sentiment') return 'Sentiment';
        const q = questions.find(q => q.name === id);
        return q ? (q.title || q.name) : id;
    };

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em', minWidth: '1000px' }}>
                        <caption style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>Survey submission results grid</caption>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b', background: '#f8fafc' }}>
                                {/* Fixed Actions Column */}
                                {!readOnly && <th scope="col" style={{ padding: '12px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>Actions</th>}

                                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                                    {columnOrder.map(colId => (
                                        <SortableHeader key={colId} id={colId} title={getColumnTitle(colId)} />
                                    ))}
                                </SortableContext>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => (
                                <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    {/* Action Cell */}
                                    {!readOnly && (
                                        <td style={{ padding: '12px', position: 'sticky', left: 0, background: 'white', borderRight: '1px solid #f1f5f9', zIndex: 10 }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => onEdit(sub.id)}
                                                    aria-label={`Edit submission ${sub.id}`}
                                                    style={{
                                                        border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer',
                                                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px',
                                                        color: '#334155', fontWeight: '500'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                                    title="Edit Response"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
                                                            onDelete(sub.id);
                                                        }
                                                    }}
                                                    aria-label={`Delete submission ${sub.id}`}
                                                    style={{
                                                        border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer',
                                                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px',
                                                        color: '#dc2626', fontWeight: '500'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                                                    title="Delete Response"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    )}

                                    {/* Draggable Columns Data */}
                                    {columnOrder.map(colId => (
                                        <td key={colId} style={{ padding: '12px', color: '#334155', maxWidth: '300px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                            {renderCell(sub, colId)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DndContext>
            </div>
        </div>
    );
}
