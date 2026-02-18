import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Settings, MessageCircle, X } from 'lucide-react';
import { CellControl } from './CellControl';
import { AICellAssistant } from './AICellAssistant';

function getCellText(cellData, type) {
    if (!cellData) return '';
    if (type === 'text' || type === 'pain_point' || type === 'opportunity') return cellData.value || '';
    if (type === 'think_feel') return [cellData.thought, cellData.feeling].filter(Boolean).join(' — ');
    if (type === 'goals' || type === 'frontstage' || type === 'backstage') return (cellData.items || []).join(', ');
    if (type === 'actions') return (cellData.items || []).map(i => i.text || '').join(', ');
    if (type === 'barriers') return (cellData.items || []).map(i => i.text || '').join(', ');
    if (type === 'motivators') return (cellData.items || []).map(i => i.text || '').join(', ');
    if (type === 'touchpoints') return (cellData.items || []).map(i => i.label || '').join(', ');
    if (type === 'kpi') return `${cellData.label || ''}: ${cellData.value || ''}`;
    if (type === 'sentiment_graph') return cellData.note || '';
    if (type === 'emotion_curve') return cellData.annotation || '';
    if (type === 'channels') return (cellData.channels || []).map(c => c.label || c.id).join(', ');
    if (type === 'process_flow') return (cellData.steps || []).join(' → ');
    return cellData.value || '';
}

export function SectionRow({ section, stages, onUpdateCell, onUpdateSection, onDeleteSection, comments }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: section.id,
        data: { type: 'SECTION' }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Count comments per cell
    const getCommentCount = (sectionId, stageId) => {
        if (!comments) return 0;
        return comments.filter(c => c.section_id === sectionId && c.stage_id === stageId).length;
    };

    // Build bezier SVG for sentiment/emotion types
    const renderSentimentOverlay = () => {
        if (section.type !== 'sentiment_graph' && section.type !== 'emotion_curve') return null;
        if (!stages || stages.length < 2) return null;

        const points = stages.map((stage, idx) => {
            const cell = section.cells[stage.id];
            const val = cell?.value !== undefined ? cell.value : 0;
            const y = 50 - (val * 8);
            const x = ((idx + 0.5) / stages.length) * 100;
            return { x, y, val };
        });

        // Build cubic bezier path
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const dx = (p1.x - p0.x) / 2;
            d += ` C ${p0.x + dx} ${p0.y}, ${p1.x - dx} ${p1.y}, ${p1.x} ${p1.y}`;
        }

        // Gradient fill path (closed)
        const fillD = d + ` L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

        const lineColor = section.style_defaults?.line_color || 'var(--primary-color, #3b82f6)';

        return (
            <svg
                className="cjm-sentiment-svg"
                width="100%" height="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
            >
                <defs>
                    <linearGradient id={`grad_${section.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <path d={fillD} fill={`url(#grad_${section.id})`} />
                <path
                    d={d}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill="white" stroke={lineColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    </g>
                ))}
            </svg>
        );
    };

    const [showSettings, setShowSettings] = useState(false);

    return (
        <div ref={setNodeRef} style={style} className="cjm-section-row-wrapper">
            <div className={`cjm-section-header ${section.type}`} style={{ borderLeftColor: section.style_defaults?.line_color || '#cbd5e1' }}>
                <div className="cjm-drag-handle" {...attributes} {...listeners}><GripVertical size={16} /></div>

                <div className="cjm-section-title-wrapper" style={{ position: 'relative' }}>
                    <input
                        value={section.title}
                        onChange={(e) => onUpdateSection(section.id, { title: e.target.value })}
                        className="cjm-section-input"
                    />
                    <div className="cjm-section-actions" style={{ opacity: showSettings ? 1 : undefined }}>
                        <button onClick={() => onDeleteSection(section.id)} className="cjm-icon-mini danger" aria-label={`Delete section ${section.title}`}><Trash2 size={12} aria-hidden="true" /></button>
                        <button className="cjm-icon-mini" onClick={() => setShowSettings(!showSettings)} style={{ color: showSettings ? 'var(--primary-color)' : undefined }} aria-label={`Settings for section ${section.title}`} aria-expanded={showSettings}><Settings size={12} aria-hidden="true" /></button>
                    </div>

                    {showSettings && (
                        <div className="cjm-color-picker-popover row-settings" style={{ left: '0', top: '24px', right: 'auto', zIndex: 1000, background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Row Settings</span>
                                <button onClick={() => setShowSettings(false)} className="cjm-icon-mini" style={{ padding: '2px' }}><X size={14} /></button>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Theme Color</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={section.style_defaults?.line_color || '#cbd5e1'}
                                        onChange={e => onUpdateSection(section.id, { style_defaults: { ...(section.style_defaults || {}), line_color: e.target.value } })}
                                        style={{ width: '40px', height: '24px', border: '1px solid var(--border-light)', borderRadius: '4px', cursor: 'pointer', padding: '1px', background: 'transparent' }}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{section.style_defaults?.line_color || '#cbd5e1'}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Section Type</label>
                                <select
                                    value={section.type}
                                    onChange={e => onUpdateSection(section.id, { type: e.target.value })}
                                    style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                                >
                                    <option value="text">Text Box</option>
                                    <option value="touchpoints">Touchpoints</option>
                                    <option value="sentiment_graph">Sentiment Graph</option>
                                    <option value="think_feel">Think & Feel</option>
                                    <option value="goals">User Goals</option>
                                    <option value="actions">Customer Actions</option>
                                    <option value="pain_point">Pain Points</option>
                                    <option value="opportunity">Opportunities</option>
                                    <option value="kpi">KPI Data</option>
                                    <option value="channels">Channels</option>
                                    <option value="process_flow">Process Flow</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                                <button
                                    onClick={() => onDeleteSection(section.id)}
                                    style={{ width: '100%', background: 'var(--status-error-bg, #fff1f2)', color: 'var(--status-error, #e11d48)', border: '1px solid var(--status-error-border, #fda4af)', borderRadius: '4px', padding: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Delete Row
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="cjm-cells-row" style={{ position: 'relative' }}>
                {renderSentimentOverlay()}

                {stages.map(stage => {
                    const commentCount = getCommentCount(section.id, stage.id);
                    const cellData = section.cells[stage.id] || {};
                    const cellText = getCellText(cellData, section.type);
                    return (
                        <div key={stage.id} className="cjm-cell" style={{ minWidth: '200px', flex: 1, position: 'relative' }}>
                            {commentCount > 0 && (
                                <div className="cjm-comment-badge" title={`${commentCount} comment(s)`}>
                                    {commentCount}
                                </div>
                            )}
                            <CellControl
                                type={section.type}
                                data={cellData}
                                onChange={(val) => onUpdateCell(section.id, stage.id, val)}
                                sectionId={section.id}
                                stageId={stage.id}
                            />
                            <AICellAssistant
                                cellText={cellText}
                                sectionType={section.type}
                                sectionTitle={section.title}
                                stageName={stage.name}
                                onApply={(text) => {
                                    if (section.type === 'think_feel') {
                                        onUpdateCell(section.id, stage.id, { ...cellData, thought: text });
                                    } else {
                                        onUpdateCell(section.id, stage.id, { ...cellData, value: text });
                                    }
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
