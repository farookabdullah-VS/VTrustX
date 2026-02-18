import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Settings, X } from 'lucide-react';
import { SectionRow } from './SectionRow';

function StageHeader({ stage, onUpdate, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: stage.id,
        data: { type: 'STAGE' }
    });

    const [showSettings, setShowSettings] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        background: stage.style?.bg_color || '#fff',
        color: stage.style?.text_color || '#000'
    };

    return (
        <div ref={setNodeRef} style={style} className="cjm-stage-header">
            <div className="cjm-drag-handle horizontal" {...attributes} {...listeners}><GripVertical size={14} /></div>
            <input
                value={stage.name}
                onChange={(e) => onUpdate(stage.id, { name: e.target.value })}
                className="cjm-stage-input"
            />
            <div className="cjm-stage-actions">
                <button className="cjm-icon-mini" onClick={() => setShowSettings(!showSettings)} aria-label={`Settings for stage ${stage.name}`} aria-expanded={showSettings}><Settings size={12} aria-hidden="true" /></button>
                <button className="cjm-icon-mini danger" onClick={() => onDelete(stage.id)} aria-label={`Delete stage ${stage.name}`}><Trash2 size={12} aria-hidden="true" /></button>
            </div>

            {showSettings && (
                <div className="cjm-color-picker-popover" onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Stage Settings</span>
                        <button onClick={() => setShowSettings(false)} aria-label="Close settings" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={14} aria-hidden="true" /></button>
                    </div>
                    <label>Background Color</label>
                    <input
                        type="color"
                        value={stage.style?.bg_color || '#f8fafc'}
                        onChange={e => onUpdate(stage.id, { style: { ...(stage.style || {}), bg_color: e.target.value } })}
                        style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer' }}
                    />
                    <label>Text Color</label>
                    <input
                        type="color"
                        value={stage.style?.text_color || '#000000'}
                        onChange={e => onUpdate(stage.id, { style: { ...(stage.style || {}), text_color: e.target.value } })}
                        style={{ width: '100%', height: '30px', border: 'none', cursor: 'pointer' }}
                    />
                    <label>Icon (emoji)</label>
                    <input
                        type="text"
                        value={stage.icon || ''}
                        onChange={e => onUpdate(stage.id, { icon: e.target.value })}
                        placeholder="e.g. 🔍"
                        style={{ width: '100%', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.85rem' }}
                    />
                </div>
            )}

            {stage.icon && <div style={{ fontSize: '1.2rem', marginTop: '2px' }}>{stage.icon}</div>}
        </div>
    );
}

export function CJMGrid({ stages, sections, onUpdateCell, onAddStage, onAddSection, onUpdateStage, onUpdateSection, onDeleteSection, onDeleteStage, comments }) {
    return (
        <div className="cjm-grid">
            <div className="cjm-stages-row">
                <div className="cjm-corner-header" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>Journey Stages</span>
                        <button
                            className="cjm-icon-mini primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddSection && onAddSection('text');
                            }}
                            title="Add Row"
                            style={{
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
                <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                    {stages.map(stage => (
                        <StageHeader
                            key={stage.id}
                            stage={stage}
                            onUpdate={onUpdateStage}
                            onDelete={onDeleteStage}
                        />
                    ))}
                </SortableContext>
                <button className="cjm-add-stage-btn" onClick={onAddStage} aria-label="Add new stage"><Plus size={16} aria-hidden="true" /></button>
            </div>

            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="cjm-sections-container">
                    {sections.map(section => (
                        <SectionRow
                            key={section.id}
                            section={section}
                            stages={stages}
                            onUpdateCell={onUpdateCell}
                            onUpdateSection={onUpdateSection}
                            onDeleteSection={onDeleteSection}
                            comments={comments}
                        />
                    ))}
                    {sections.length === 0 && (
                        <div className="cjm-empty-state">
                            Drag tools from the left sidebar to add sections or click the button below
                        </div>
                    )}
                </div>
            </SortableContext>

            <div className="cjm-add-row-container">
                <button className="cjm-add-row-btn" onClick={() => onAddSection && onAddSection('text')}>
                    <Plus size={16} /> Add Row
                </button>
            </div>
        </div>
    );
}
