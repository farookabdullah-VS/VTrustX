import React, { useState } from 'react';
import { Smile, Frown, Meh, Plus, Star, X, Check, Upload, Paperclip, User, Target, Brain, ShieldAlert, Zap, Play, Quote, Cog, Eye, HeadphonesIcon, Code, Minus, Hash } from 'lucide-react';

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

    // 13. Goals - Customer objectives at each stage
    if (type === 'goals') {
        const items = data.items || [];
        const addGoal = () => onChange({ ...data, items: [...items, ''] });
        const updateGoal = (idx, v) => { const next = [...items]; next[idx] = v; onChange({ ...data, items: next }); };
        const removeGoal = (idx) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
        return (
            <div className="cjm-cell-goals">
                {items.map((g, idx) => (
                    <div key={idx} className="goal-item">
                        <Target size={12} className="goal-icon" />
                        <input value={g} onChange={e => updateGoal(idx, e.target.value)} placeholder={`Goal ${idx + 1}`} className="goal-input" />
                        <button onClick={() => removeGoal(idx)} className="goal-remove"><X size={10} /></button>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addGoal}><Plus size={14} /> Goal</button>
            </div>
        );
    }

    // 14. Think & Feel - Customer thoughts/quotes
    if (type === 'think_feel') {
        return (
            <div className="cjm-cell-thinkfeel">
                <div className="thinkfeel-bubble">
                    <Quote size={12} className="thinkfeel-icon" />
                    <textarea
                        value={data.thought || ''}
                        onChange={e => onChange({ ...data, thought: e.target.value })}
                        placeholder='"What the customer is thinking..."'
                        className="thinkfeel-thought"
                    />
                </div>
                <textarea
                    value={data.feeling || ''}
                    onChange={e => onChange({ ...data, feeling: e.target.value })}
                    placeholder="How they feel..."
                    className="thinkfeel-feeling"
                />
            </div>
        );
    }

    // 15. Barriers - Obstacles preventing progress
    if (type === 'barriers') {
        const items = data.items || [];
        const addBarrier = () => onChange({ ...data, items: [...items, { text: '', severity: 'medium' }] });
        const updateBarrier = (idx, field, val) => { const next = [...items]; next[idx] = { ...next[idx], [field]: val }; onChange({ ...data, items: next }); };
        const removeBarrier = (idx) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
        const sevColors = { low: '#fde047', medium: '#fb923c', high: '#ef4444' };
        return (
            <div className="cjm-cell-barriers">
                {items.map((b, idx) => (
                    <div key={idx} className="barrier-item">
                        <ShieldAlert size={12} style={{ color: sevColors[b.severity], flexShrink: 0 }} />
                        <input value={b.text} onChange={e => updateBarrier(idx, 'text', e.target.value)} placeholder="Barrier..." className="barrier-input" />
                        <select value={b.severity} onChange={e => updateBarrier(idx, 'severity', e.target.value)} className="barrier-severity">
                            <option value="low">Low</option>
                            <option value="medium">Med</option>
                            <option value="high">High</option>
                        </select>
                        <button onClick={() => removeBarrier(idx)} className="barrier-remove"><X size={10} /></button>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addBarrier}><Plus size={14} /> Barrier</button>
            </div>
        );
    }

    // 16. Motivators - Drivers pushing user forward
    if (type === 'motivators') {
        const items = data.items || [];
        const addMotivator = () => onChange({ ...data, items: [...items, { text: '', strength: 3 }] });
        const updateMotivator = (idx, field, val) => { const next = [...items]; next[idx] = { ...next[idx], [field]: val }; onChange({ ...data, items: next }); };
        const removeMotivator = (idx) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
        return (
            <div className="cjm-cell-motivators">
                {items.map((m, idx) => (
                    <div key={idx} className="motivator-item">
                        <Zap size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                        <input value={m.text} onChange={e => updateMotivator(idx, 'text', e.target.value)} placeholder="Motivator..." className="motivator-input" />
                        <div className="motivator-strength">
                            {[1, 2, 3, 4, 5].map(n => (
                                <span key={n} onClick={() => updateMotivator(idx, 'strength', n)}
                                    style={{ cursor: 'pointer', color: n <= (m.strength || 0) ? '#10b981' : '#e2e8f0', fontSize: '0.8rem' }}>●</span>
                            ))}
                        </div>
                        <button onClick={() => removeMotivator(idx)} className="motivator-remove"><X size={10} /></button>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addMotivator}><Plus size={14} /> Motivator</button>
            </div>
        );
    }

    // 17. Video Embed - YouTube/Vimeo embed
    if (type === 'video_embed') {
        const getEmbedUrl = (url) => {
            if (!url) return null;
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
            if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
            const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
            if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
            return url;
        };
        const embedUrl = getEmbedUrl(data.url);
        return (
            <div className="cjm-cell-video">
                {embedUrl ? (
                    <div className="video-wrapper">
                        <iframe src={embedUrl} title="video" frameBorder="0" allowFullScreen className="video-iframe" />
                        <button className="video-clear" onClick={() => onChange({ ...data, url: '' })}><X size={12} /></button>
                    </div>
                ) : (
                    <div className="video-input-wrapper">
                        <Play size={20} style={{ color: '#94a3b8' }} />
                        <input
                            value={data.url || ''}
                            onChange={e => onChange({ ...data, url: e.target.value })}
                            placeholder="Paste YouTube or Vimeo URL..."
                            className="video-url-input"
                        />
                    </div>
                )}
                <input
                    value={data.caption || ''}
                    onChange={e => onChange({ ...data, caption: e.target.value })}
                    placeholder="Caption..."
                    className="video-caption"
                />
            </div>
        );
    }

    // 18. Chart - Inline pie/bar mini chart
    if (type === 'chart') {
        const chartType = data.chartType || 'bar';
        const items = data.items || [{ label: 'Item 1', value: 50 }];
        const addItem = () => onChange({ ...data, items: [...items, { label: `Item ${items.length + 1}`, value: 30 }] });
        const updateItem = (idx, field, val) => { const next = [...items]; next[idx] = { ...next[idx], [field]: val }; onChange({ ...data, items: next }); };
        const removeItem = (idx) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
        const maxVal = Math.max(...items.map(i => Number(i.value) || 0), 1);
        const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
        return (
            <div className="cjm-cell-chart">
                <div className="chart-type-toggle">
                    {['bar', 'pie'].map(t => (
                        <button key={t} className={`chart-type-btn ${chartType === t ? 'active' : ''}`}
                            onClick={() => onChange({ ...data, chartType: t })}>{t === 'bar' ? '▥' : '◕'}</button>
                    ))}
                </div>
                {chartType === 'bar' ? (
                    <div className="chart-bars">
                        {items.map((item, idx) => (
                            <div key={idx} className="chart-bar-row">
                                <input value={item.label} onChange={e => updateItem(idx, 'label', e.target.value)} className="chart-bar-label" />
                                <div className="chart-bar-track">
                                    <div className="chart-bar-fill" style={{ width: `${(Number(item.value) / maxVal) * 100}%`, background: chartColors[idx % chartColors.length] }} />
                                </div>
                                <input type="number" value={item.value} onChange={e => updateItem(idx, 'value', e.target.value)} className="chart-bar-value" />
                                <button onClick={() => removeItem(idx)} className="chart-bar-remove"><X size={10} /></button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="chart-pie-wrapper">
                        <svg viewBox="0 0 100 100" className="chart-pie-svg">
                            {(() => {
                                const total = items.reduce((a, i) => a + (Number(i.value) || 0), 0) || 1;
                                let cumulative = 0;
                                return items.map((item, idx) => {
                                    const pct = (Number(item.value) || 0) / total;
                                    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                                    cumulative += pct;
                                    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                                    const largeArc = pct > 0.5 ? 1 : 0;
                                    const x1 = 50 + 40 * Math.cos(startAngle), y1 = 50 + 40 * Math.sin(startAngle);
                                    const x2 = 50 + 40 * Math.cos(endAngle), y2 = 50 + 40 * Math.sin(endAngle);
                                    return <path key={idx} d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`} fill={chartColors[idx % chartColors.length]} />;
                                });
                            })()}
                        </svg>
                        <div className="chart-pie-legend">
                            {items.map((item, idx) => (
                                <div key={idx} className="chart-pie-legend-item">
                                    <span className="chart-pie-dot" style={{ background: chartColors[idx % chartColors.length] }} />
                                    <input value={item.label} onChange={e => updateItem(idx, 'label', e.target.value)} className="chart-pie-label-input" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <button className="cjm-add-tp-btn" onClick={addItem}><Plus size={14} /> Item</button>
            </div>
        );
    }

    // 19. Frontstage - Employee actions visible to customer
    if (type === 'frontstage') {
        const items = data.items || [];
        const addItem = () => onChange({ ...data, items: [...items, ''] });
        const updateItem = (idx, v) => { const next = [...items]; next[idx] = v; onChange({ ...data, items: next }); };
        const removeItem = (idx) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
        return (
            <div className="cjm-cell-frontstage">
                <div className="frontstage-label"><Eye size={10} /> Visible to Customer</div>
                {items.map((item, idx) => (
                    <div key={idx} className="frontstage-item">
                        <span className="frontstage-num">{idx + 1}</span>
                        <input value={item} onChange={e => updateItem(idx, e.target.value)} placeholder="Employee action..." className="frontstage-input" />
                        <button onClick={() => removeItem(idx)} className="frontstage-remove"><X size={10} /></button>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addItem}><Plus size={14} /> Action</button>
            </div>
        );
    }

    // 20. Backstage - Behind-the-scenes processes
    if (type === 'backstage') {
        const items = data.items || [];
        const addItem = () => onChange({ ...data, items: [...items, ''] });
        const updateItem = (idx, v) => { const next = [...items]; next[idx] = v; onChange({ ...data, items: next }); };
        const removeItem = (idx) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
        return (
            <div className="cjm-cell-backstage">
                <div className="backstage-label"><Cog size={10} /> Behind the Scenes</div>
                {items.map((item, idx) => (
                    <div key={idx} className="backstage-item">
                        <Cog size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <input value={item} onChange={e => updateItem(idx, e.target.value)} placeholder="Internal process..." className="backstage-input" />
                        <button onClick={() => removeItem(idx)} className="backstage-remove"><X size={10} /></button>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addItem}><Plus size={14} /> Process</button>
            </div>
        );
    }

    // 21. Support Process - Internal systems
    if (type === 'support_process') {
        const items = data.items || [];
        const addItem = () => onChange({ ...data, items: [...items, { system: '', action: '' }] });
        const updateItem = (idx, field, val) => { const next = [...items]; next[idx] = { ...next[idx], [field]: val }; onChange({ ...data, items: next }); };
        const removeItem = (idx) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
        return (
            <div className="cjm-cell-support">
                {items.map((item, idx) => (
                    <div key={idx} className="support-item">
                        <HeadphonesIcon size={12} style={{ color: '#6366f1', flexShrink: 0 }} />
                        <input value={item.system} onChange={e => updateItem(idx, 'system', e.target.value)} placeholder="System..." className="support-system" />
                        <input value={item.action} onChange={e => updateItem(idx, 'action', e.target.value)} placeholder="Action..." className="support-action" />
                        <button onClick={() => removeItem(idx)} className="support-remove"><X size={10} /></button>
                    </div>
                ))}
                <button className="cjm-add-tp-btn" onClick={addItem}><Plus size={14} /> System</button>
            </div>
        );
    }

    // 22. Embed Code - iframe/HTML embed
    if (type === 'embed_code') {
        const [editing, setEditing] = useState(!data.url);
        return (
            <div className="cjm-cell-embed">
                {!editing && data.url ? (
                    <div className="embed-preview">
                        <iframe src={data.url} title="embed" frameBorder="0" className="embed-iframe" sandbox="allow-scripts allow-same-origin" />
                        <button className="embed-edit-btn" onClick={() => setEditing(true)}>Edit</button>
                    </div>
                ) : (
                    <div className="embed-form">
                        <Code size={18} style={{ color: '#94a3b8' }} />
                        <input
                            value={data.url || ''}
                            onChange={e => onChange({ ...data, url: e.target.value })}
                            placeholder="Embed URL (Figma, Miro, Google Docs...)"
                            className="embed-url-input"
                        />
                        {data.url && <button className="embed-apply-btn" onClick={() => setEditing(false)}>Apply</button>}
                    </div>
                )}
            </div>
        );
    }

    // 23. Divider - Visual separator
    if (type === 'divider') {
        return (
            <div className="cjm-cell-divider">
                <div className="divider-line" style={{ borderColor: data.color || '#e2e8f0' }} />
                <input
                    value={data.label || ''}
                    onChange={e => onChange({ ...data, label: e.target.value })}
                    placeholder="Section label (optional)"
                    className="divider-label"
                />
            </div>
        );
    }

    // 24. Channels - Channel icons with flow mapping
    if (type === 'channels') {
        const CHANNEL_OPTIONS = [
            { id: 'web', label: 'Website', icon: '🌐' },
            { id: 'mobile', label: 'Mobile App', icon: '📱' },
            { id: 'email', label: 'Email', icon: '📧' },
            { id: 'phone', label: 'Phone', icon: '📞' },
            { id: 'chat', label: 'Live Chat', icon: '💬' },
            { id: 'social', label: 'Social Media', icon: '📣' },
            { id: 'store', label: 'In-Store', icon: '🏪' },
            { id: 'sms', label: 'SMS', icon: '📲' },
            { id: 'whatsapp', label: 'WhatsApp', icon: '💚' },
            { id: 'video', label: 'Video Call', icon: '📹' },
            { id: 'self_service', label: 'Self-Service', icon: '🖥️' },
            { id: 'pos', label: 'POS', icon: '💳' }
        ];
        const selected = data.channels || [];
        const toggleChannel = (ch) => {
            const exists = selected.find(s => s.id === ch.id);
            if (exists) onChange({ ...data, channels: selected.filter(s => s.id !== ch.id) });
            else onChange({ ...data, channels: [...selected, ch] });
        };
        return (
            <div className="cjm-cell-channels">
                <div className="channels-grid">
                    {CHANNEL_OPTIONS.map(ch => {
                        const isActive = selected.some(s => s.id === ch.id);
                        return (
                            <button key={ch.id} className={`channel-chip ${isActive ? 'active' : ''}`} onClick={() => toggleChannel(ch)} title={ch.label}>
                                <span className="channel-icon">{ch.icon}</span>
                                <span className="channel-name">{ch.label}</span>
                            </button>
                        );
                    })}
                </div>
                {data.note !== undefined && (
                    <input value={data.note || ''} onChange={e => onChange({ ...data, note: e.target.value })} placeholder="Channel note..." className="channels-note" />
                )}
            </div>
        );
    }

    // Default
    return <div className="cjm-cell-unknown">Unknown Type: {type}</div>;
}
