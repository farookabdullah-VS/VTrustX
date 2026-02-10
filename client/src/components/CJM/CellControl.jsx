import React, { useState } from 'react';
import { Smile, Frown, Meh, Plus, Star, X, Check, Upload, Paperclip, User } from 'lucide-react';

export function CellControl({ type, data, onChange, sectionId, stageId }) {

    // 1. Rich Text (Simple Textarea for MVP)
    if (type === 'text') {
        return (
            <textarea
                className="cjm-cell-text"
                value={data.value || ''}
                onChange={e => onChange({ value: e.target.value })}
                placeholder="Details..."
            />
        );
    }

    // 2. Sentiment Graph (Input Node)
    if (type === 'sentiment_graph') {
        const val = data.value || 0;
        return (
            <div className="cjm-cell-sentiment">
                <div className="sentiment-slider-wrapper">
                    <input
                        type="range"
                        min="-5" max="5"
                        value={val}
                        onChange={e => onChange({ value: parseInt(e.target.value) })}
                        className="sentiment-slider"
                    />
                    <div className="sentiment-value" style={{ color: val > 0 ? 'green' : val < 0 ? 'red' : 'gray' }}>
                        {val > 0 ? <Smile size={16} /> : val < 0 ? <Frown size={16} /> : <Meh size={16} />}
                        {val}
                    </div>
                </div>
                <textarea
                    className="cjm-cell-note"
                    value={data.note || ''}
                    onChange={e => onChange({ note: e.target.value })}
                    placeholder="Note..."
                />
            </div>
        );
    }

    // 3. Touchpoints (Icons)
    if (type === 'touchpoints') {
        const items = data.items || [];
        return (
            <div className="cjm-cell-touchpoints">
                <div className="touchpoints-list">
                    {items.map((item, idx) => (
                        <div key={idx} className="touchpoint-tag" style={{ background: item.color || '#2C9BAD' }}>
                            <span className="tp-label">{item.label}</span>
                            <button className="tp-remove" onClick={() => {
                                onChange({ items: items.filter((_, i) => i !== idx) });
                            }}><X size={10} /></button>
                        </div>
                    ))}
                </div>
                <button
                    className="cjm-add-tp-btn"
                    onClick={() => {
                        const label = prompt("Touchpoint Name (e.g. Email, Ad):");
                        if (label) {
                            onChange({ items: [...items, { label, color: 'var(--primary-color)', icon: 'default' }] });
                        }
                    }}
                >
                    <Plus size={14} /> Add
                </button>
            </div>
        );
    }

    // 4. Storyboard - Image upload/paste + caption
    if (type === 'storyboard') {
        const handleImagePaste = (e) => {
            const file = e.clipboardData?.files?.[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => onChange({ ...data, image: ev.target.result });
                reader.readAsDataURL(file);
            }
        };

        const handleImageUpload = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => onChange({ ...data, image: ev.target.result });
                reader.readAsDataURL(file);
            }
        };

        return (
            <div className="cjm-cell-storyboard" onPaste={handleImagePaste}>
                {data.image ? (
                    <div className="storyboard-img-wrapper">
                        <img src={data.image} alt="storyboard" className="storyboard-img" />
                        <button className="storyboard-clear" onClick={() => onChange({ ...data, image: null })}><X size={12} /></button>
                    </div>
                ) : (
                    <label className="storyboard-upload">
                        <Upload size={20} />
                        <span>Click or paste image</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                )}
                <textarea
                    className="storyboard-caption"
                    value={data.caption || ''}
                    onChange={e => onChange({ ...data, caption: e.target.value })}
                    placeholder="Caption..."
                />
            </div>
        );
    }

    // 5. Process Flow - Numbered steps with arrow connectors
    if (type === 'process_flow') {
        const steps = data.steps || [];
        const addStep = () => onChange({ ...data, steps: [...steps, ''] });
        const updateStep = (idx, v) => { const next = [...steps]; next[idx] = v; onChange({ ...data, steps: next }); };
        const removeStep = (idx) => onChange({ ...data, steps: steps.filter((_, i) => i !== idx) });

        return (
            <div className="cjm-cell-process">
                {steps.map((step, idx) => (
                    <div key={idx} className="process-step-row">
                        {idx > 0 && <div className="process-arrow">&#8595;</div>}
                        <div className="process-step">
                            <span className="process-num">{idx + 1}</span>
                            <input
                                value={step}
                                onChange={e => updateStep(idx, e.target.value)}
                                placeholder={`Step ${idx + 1}`}
                                className="process-input"
                            />
                            <button onClick={() => removeStep(idx)} className="process-remove"><X size={12} /></button>
                        </div>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addStep}><Plus size={14} /> Step</button>
            </div>
        );
    }

    // 6. File Embed - File attachment chips
    if (type === 'file_embed') {
        const files = data.files || [];
        const addFile = () => {
            const name = prompt("File name or URL:");
            if (name) onChange({ ...data, files: [...files, { name, type: 'file' }] });
        };
        const removeFile = (idx) => onChange({ ...data, files: files.filter((_, i) => i !== idx) });

        return (
            <div className="cjm-cell-files">
                {files.map((file, idx) => (
                    <div key={idx} className="file-chip">
                        <Paperclip size={12} />
                        <span>{file.name}</span>
                        <button onClick={() => removeFile(idx)} className="file-remove"><X size={10} /></button>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addFile}><Plus size={14} /> File</button>
            </div>
        );
    }

    // 7. KPI - Value + label + trend
    if (type === 'kpi') {
        const val = data.value || '';
        const label = data.label || '';
        const trend = data.trend || 'flat';
        return (
            <div className="cjm-cell-kpi">
                <input
                    className="kpi-value"
                    value={val}
                    onChange={e => onChange({ ...data, value: e.target.value })}
                    placeholder="0"
                />
                <input
                    className="kpi-label"
                    value={label}
                    onChange={e => onChange({ ...data, label: e.target.value })}
                    placeholder="Metric name"
                />
                <div className="kpi-trend">
                    {['up', 'flat', 'down'].map(t => (
                        <button
                            key={t}
                            className={`kpi-trend-btn ${trend === t ? 'active' : ''}`}
                            onClick={() => onChange({ ...data, trend: t })}
                        >
                            {t === 'up' ? '↑' : t === 'down' ? '↓' : '→'}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // 8. Opportunity - Text + impact rating (1-5 stars)
    if (type === 'opportunity') {
        const impact = data.impact || 0;
        return (
            <div className="cjm-cell-opportunity">
                <textarea
                    className="opp-text"
                    value={data.value || ''}
                    onChange={e => onChange({ ...data, value: e.target.value })}
                    placeholder="Opportunity description..."
                />
                <div className="opp-rating">
                    <span className="opp-label">Impact:</span>
                    {[1, 2, 3, 4, 5].map(n => (
                        <Star
                            key={n}
                            size={16}
                            className={`opp-star ${n <= impact ? 'filled' : ''}`}
                            fill={n <= impact ? '#f59e0b' : 'none'}
                            stroke={n <= impact ? '#f59e0b' : '#cbd5e1'}
                            onClick={() => onChange({ ...data, impact: n })}
                            style={{ cursor: 'pointer' }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // 9. Pain Point - Text + severity slider (1-5)
    if (type === 'pain_point') {
        const severity = data.severity || 1;
        const colors = ['#86efac', '#fde047', '#fdba74', '#fca5a5', '#f87171'];
        return (
            <div className="cjm-cell-painpoint">
                <textarea
                    className="pain-text"
                    value={data.value || ''}
                    onChange={e => onChange({ ...data, value: e.target.value })}
                    placeholder="Pain point description..."
                />
                <div className="pain-severity">
                    <span className="pain-label">Severity:</span>
                    <input
                        type="range"
                        min="1" max="5"
                        value={severity}
                        onChange={e => onChange({ ...data, severity: parseInt(e.target.value) })}
                        className="pain-slider"
                        style={{ accentColor: colors[severity - 1] }}
                    />
                    <span className="pain-value" style={{ background: colors[severity - 1] }}>{severity}</span>
                </div>
            </div>
        );
    }

    // 10. Actions - Checklist with assignee + done toggle
    if (type === 'actions') {
        const items = data.items || [];
        const addItem = () => onChange({ ...data, items: [...items, { text: '', assignee: '', done: false }] });
        const updateItem = (idx, field, val) => {
            const next = [...items];
            next[idx] = { ...next[idx], [field]: val };
            onChange({ ...data, items: next });
        };
        const removeItem = (idx) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });

        return (
            <div className="cjm-cell-actions">
                {items.map((item, idx) => (
                    <div key={idx} className="action-item">
                        <button
                            className={`action-check ${item.done ? 'done' : ''}`}
                            onClick={() => updateItem(idx, 'done', !item.done)}
                        >
                            {item.done && <Check size={10} />}
                        </button>
                        <input
                            className={`action-text ${item.done ? 'strike' : ''}`}
                            value={item.text}
                            onChange={e => updateItem(idx, 'text', e.target.value)}
                            placeholder="Action item..."
                        />
                        <input
                            className="action-assignee"
                            value={item.assignee}
                            onChange={e => updateItem(idx, 'assignee', e.target.value)}
                            placeholder="Owner"
                        />
                        <button onClick={() => removeItem(idx)} className="action-remove"><X size={10} /></button>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addItem}><Plus size={14} /> Action</button>
            </div>
        );
    }

    // 11. Persona - Mini persona card
    if (type === 'persona') {
        return (
            <div className="cjm-cell-persona">
                <div className="persona-avatar">
                    <User size={24} />
                </div>
                <input
                    className="persona-name"
                    value={data.name || ''}
                    onChange={e => onChange({ ...data, name: e.target.value })}
                    placeholder="Persona name"
                />
                <input
                    className="persona-segment"
                    value={data.segment || ''}
                    onChange={e => onChange({ ...data, segment: e.target.value })}
                    placeholder="Segment"
                />
            </div>
        );
    }

    // 12. Emotion Curve - Enhanced SVG (renders as part of SectionRow overlay)
    if (type === 'emotion_curve') {
        const val = data.value || 0;
        return (
            <div className="cjm-cell-sentiment">
                <div className="sentiment-slider-wrapper">
                    <input
                        type="range"
                        min="-5" max="5"
                        value={val}
                        onChange={e => onChange({ ...data, value: parseInt(e.target.value) })}
                        className="sentiment-slider"
                    />
                    <div className="sentiment-value" style={{ color: val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#94a3b8' }}>
                        {val > 0 ? <Smile size={16} /> : val < 0 ? <Frown size={16} /> : <Meh size={16} />}
                        <span>{val}</span>
                    </div>
                </div>
                <input
                    className="cjm-cell-note"
                    value={data.annotation || ''}
                    onChange={e => onChange({ ...data, annotation: e.target.value })}
                    placeholder="Annotation..."
                    style={{ textAlign: 'center', border: 'none', fontSize: '0.8rem', color: '#64748b' }}
                />
            </div>
        );
    }

    // Default
    return <div className="cjm-cell-unknown">Unknown Type: {type}</div>;
}
